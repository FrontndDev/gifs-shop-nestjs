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

    // Free orders: instantly mark as paid and bypass provider
    const isFree = !Number.isNaN(parseFloat(amountValue)) && parseFloat(amountValue) <= 0

    // Require existing order in DB (recommended flow)
    const metadata = (body.metadata || {}) as Record<string, unknown>
    const orderId = (metadata.orderId as string | undefined) || (metadata.order_id as string | undefined)
    if (!orderId) {
      return NextResponse.json({ error: 'metadata.orderId is required' }, { status: 400 })
    }
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found. Create order first via POST /api/orders.' }, { status: 400 })
    }

    if (isFree) {
      const payment = {
        id: `free_${randomUUID()}`,
        status: 'succeeded',
        paid: true,
        amount: { value: amountValue, currency: body.currency || 'RUB' },
        confirmation: { type: 'redirect', return_url: body.returnUrl },
        description: body.description || undefined,
        metadata: { ...metadata },
        free: true,
      }

      await prisma.order.update({ where: { id: orderId }, data: { status: 'paid' } }).catch(() => undefined)

      return NextResponse.json(payment, { status: 201 })
    }

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
        metadata: { ...metadata },
        test: true,
      }

      await prisma.order.update({ where: { id: orderId }, data: { status: 'paid' } }).catch(() => undefined)

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
      metadata: { ...metadata },
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


