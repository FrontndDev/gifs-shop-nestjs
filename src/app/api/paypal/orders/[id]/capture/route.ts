import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/paypal'

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
    return NextResponse.json(data)
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.json({ error: 'Failed to capture PayPal order' }, { status: 500 })
  }
}


