import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreatePaymentRequest = {
  amount: number | string
  currency?: string
  description?: string
  returnUrl: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePaymentRequest
    const amountValue = typeof body.amount === 'string' ? body.amount : Number(body.amount).toFixed(2)

    // Test mode: instant success without external call
    const isInstantSuccess = process.env.YOOKASSA_TEST_MODE === '1' || process.env.YOOKASSA_TEST_INSTANT_SUCCESS === '1'
    if (isInstantSuccess) {
      const payment = {
        id: `test_${randomUUID()}`,
        status: 'succeeded',
        paid: true,
        amount: { value: amountValue, currency: body.currency || 'RUB' },
        confirmation: { type: 'redirect', return_url: body.returnUrl },
        description: body.description || undefined,
        metadata: body.metadata || undefined,
        test: true,
      }

      const orderId = (body.metadata?.orderId as string | undefined) || (body.metadata?.order_id as string | undefined)
      if (orderId) {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'paid' } }).catch(() => undefined)
      }

      return NextResponse.json(payment, { status: 201 })
    }

    const shopId = process.env.YOOKASSA_SHOP_ID || process.env.YK_SHOP_ID || process.env.SHOP_ID
    const secretKey = process.env.YOOKASSA_SECRET_KEY || process.env.YK_SECRET_KEY || process.env.SECRET_KEY
    const bearer = process.env.YOOKASSA_API_KEY || process.env.YK_API_KEY || process.env.YOOKASSA_TOKEN

    let authorization: string | null = null
    if (shopId && secretKey) {
      const basic = Buffer.from(`${shopId}:${secretKey}`).toString('base64')
      authorization = `Basic ${basic}`
    } else if (bearer) {
      authorization = `Bearer ${bearer}`
    }
    if (!authorization) {
      return NextResponse.json({ error: 'Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY (preferred) or YOOKASSA_API_KEY' }, { status: 500 })
    }

    const payload = {
      amount: {
        value: amountValue,
        currency: body.currency || 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: body.returnUrl,
      },
      description: body.description || undefined,
      metadata: body.metadata || undefined,
    }

    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Idempotence-Key': randomUUID(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: 'YooKassa error', details: data }, { status: res.status })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}


