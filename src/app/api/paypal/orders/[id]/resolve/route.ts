import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const accessToken = await getPayPalAccessToken()
    const base = getPayPalBaseUrl()
    const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: 'PayPal error', details: data }, { status: res.status })
    }

    const units = Array.isArray(data?.purchase_units) ? data.purchase_units : []
    const unit = units[0] || {}
    let customId: string | undefined = typeof unit?.custom_id === 'string' ? unit.custom_id : undefined
    const amountVal = unit?.amount?.value
    const amount = typeof amountVal === 'string' ? parseFloat(amountVal) : undefined

    if (customId) {
      const order = await prisma.order.findUnique({ where: { id: customId } })
      if (order) return NextResponse.json({ orderId: order.id, via: 'custom_id' })
    }

    // Fallback: попытаться найти заказ по сумме среди последних заказов
    if (typeof amount === 'number' && !Number.isNaN(amount)) {
      const recent = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
      for (const o of recent) {
        try {
          const raw = typeof o.details === 'string' ? JSON.parse(o.details) : o.details
          if (raw && typeof raw === 'object') {
            const tp = (raw as Record<string, unknown>).totalPrice
            const total = typeof tp === 'number' ? tp : undefined
            if (typeof total === 'number' && Math.abs(total - amount) < 1e-6) {
              return NextResponse.json({ orderId: o.id, via: 'amount' })
            }
          }
        } catch {}
      }
    }

    return NextResponse.json({ orderId: null }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to resolve order' }, { status: 500 })
  }
}


