import { NextRequest, NextResponse } from 'next/server'
import { verifyPayPalWebhookSignature } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers = request.headers
    const ok = await verifyPayPalWebhookSignature({
      body,
      transmissionId: headers.get('paypal-transmission-id'),
      transmissionTime: headers.get('paypal-transmission-time'),
      certUrl: headers.get('paypal-cert-url'),
      authAlgo: headers.get('paypal-auth-algo'),
      transmissionSig: headers.get('paypal-transmission-sig'),
    })
    if (!ok) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })

    // Пример: обновление статуса заказа по metadata.orderId, если передавали его при создании
    const eventType: string | undefined = body?.event_type
    const orderId: string | undefined = body?.resource?.purchase_units?.[0]?.custom_id || body?.resource?.custom_id
    let status: string | undefined
    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') status = 'paid'
    if (eventType === 'PAYMENT.CAPTURE.DENIED') status = 'failed'
    if (status && orderId) {
      await prisma.order.updateMany({ where: { id: orderId }, data: { status } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}


