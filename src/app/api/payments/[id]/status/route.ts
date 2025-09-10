import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { id: string }

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params

    // Instant success emulation for local tests
    const isInstantSuccess = process.env.YOOKASSA_TEST_MODE === '1' || process.env.YOOKASSA_TEST_INSTANT_SUCCESS === '1'
    if (isInstantSuccess && id.startsWith('test_')) {
      const url = new URL(request.url)
      const explicitOrderId = url.searchParams.get('orderId') || undefined
      if (explicitOrderId) {
        await prisma.order.update({ where: { id: explicitOrderId }, data: { status: 'paid' } }).catch(() => undefined)
      }
      return NextResponse.json({ id, status: 'succeeded', paid: true, test: true })
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

    const res = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
      }
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: 'YooKassa error', details: data }, { status: res.status })
    }

    // data should be a payment object
    const status = (data?.status as string | undefined) || 'unknown'
    const metadata = (data?.metadata as Record<string, unknown> | undefined) || undefined
    const orderId = (metadata?.orderId as string | undefined) || (metadata?.order_id as string | undefined)

    if (orderId && (status === 'succeeded' || status === 'captured' || status === 'waiting_for_capture')) {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'paid' } }).catch(() => undefined)
    }

    return NextResponse.json({ id: data?.id || id, status, paid: status === 'succeeded' || status === 'captured' })
  } catch (error) {
    console.error('Payment status error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment status' }, { status: 500 })
  }
}


