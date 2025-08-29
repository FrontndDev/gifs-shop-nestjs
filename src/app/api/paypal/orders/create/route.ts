import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/paypal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreateOrderBody = {
  amount: string | number
  currency?: string
  intent?: 'CAPTURE' | 'AUTHORIZE'
  returnUrl?: string
  cancelUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody
    const accessToken = await getPayPalAccessToken()
    const base = getPayPalBaseUrl()

    const amountValue = typeof body.amount === 'string' ? body.amount : Number(body.amount).toFixed(2)
    const payload = {
      intent: body.intent || 'CAPTURE',
      purchase_units: [
        { amount: { currency_code: body.currency || 'USD', value: amountValue } }
      ],
      application_context: {
        return_url: body.returnUrl || process.env.PAYPAL_RETURN_URL,
        cancel_url: body.cancelUrl || process.env.PAYPAL_CANCEL_URL,
      }
    }

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: 'PayPal error', details: data }, { status: res.status })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('PayPal create order error:', error)
    return NextResponse.json({
      error: 'Failed to create PayPal order',
      details: process.env.NODE_ENV !== 'production' ? String(error) : undefined,
    }, { status: 500 })
  }
}


