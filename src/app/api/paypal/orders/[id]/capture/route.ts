import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const accessToken = await getPayPalAccessToken()
    const base = getPayPalBaseUrl()
    const res = await fetch(`${base}/v2/checkout/orders/${id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: 'PayPal error', details: data }, { status: res.status })
    }
    try {
      // data.purchase_units[0].custom_id содержит наш orderId, если мы прокинули его на этапе create
      const purchaseUnits = Array.isArray(data?.purchase_units) ? data.purchase_units : []
      let customId = purchaseUnits.length ? (purchaseUnits[0]?.custom_id as string | undefined) : undefined
      // Если PayPal не вернул custom_id в ответе capture, пробуем получить его отдельным запросом
      if (!customId) {
        const accessToken2 = await getPayPalAccessToken()
        const base2 = getPayPalBaseUrl()
        const getRes = await fetch(`${base2}/v2/checkout/orders/${id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken2}`, 'Content-Type': 'application/json' }
        })
        const getData = await getRes.json().catch(() => ({}))
        const pu2 = Array.isArray(getData?.purchase_units) ? getData.purchase_units : []
        customId = pu2.length ? (pu2[0]?.custom_id as string | undefined) : undefined
      }
      if (customId) {
        await prisma.order.update({ where: { id: customId }, data: { status: 'paid' } }).catch(() => undefined)
      }
    } catch {}
    return NextResponse.json(data)
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.json({ error: 'Failed to capture PayPal order' }, { status: 500 })
  }
}


