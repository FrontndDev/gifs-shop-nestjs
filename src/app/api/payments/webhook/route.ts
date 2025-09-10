import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const event = await request.json()
    // Optionally verify event authenticity if headers/signature are configured

    // Expecting YooKassa event with object payment and metadata.orderId
    const payment = event?.object || event?.payment || null
    const status = payment?.status as string | undefined
    const metadata = payment?.metadata as Record<string, unknown> | undefined
    const orderId = (metadata?.orderId as string | undefined) || (metadata?.order_id as string | undefined)

    if (orderId && status) {
      // Map YooKassa status to local order status
      let newStatus: string | null = null
      if (status === 'succeeded' || status === 'waiting_for_capture' || status === 'captured') newStatus = 'paid'
      if (status === 'canceled') newStatus = 'cancelled'

      if (newStatus) {
        await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}


