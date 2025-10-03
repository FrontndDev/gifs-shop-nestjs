import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripeInstance, convertAmountFromStripeCents } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { id: string }

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params

    // Free payments shortcut: treat as succeeded
    if (id.startsWith('free_')) {
      return NextResponse.json({ id, status: 'succeeded', paid: true, free: true })
    }

    // Instant success emulation for local tests
    const isInstantSuccess = process.env.STRIPE_TEST_MODE === '1' || process.env.STRIPE_TEST_INSTANT_SUCCESS === '1'
    if (isInstantSuccess && id.startsWith('test_')) {
      const url = new URL(request.url)
      const explicitOrderId = url.searchParams.get('orderId') || undefined
      if (explicitOrderId) {
        await prisma.order.update({ where: { id: explicitOrderId }, data: { status: 'paid' } }).catch(() => undefined)
      }
      return NextResponse.json({ id, status: 'succeeded', paid: true, test: true })
    }

    const stripe = getStripeInstance()

    // Try to get Payment Intent first
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(id)
    } catch {
      // If not a Payment Intent, try to get Checkout Session
      try {
        const session = await stripe.checkout.sessions.retrieve(id)
        if (session.payment_intent) {
          paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
        } else {
          // Handle session without payment intent (e.g., expired)
          return NextResponse.json({
            id,
            status: session.payment_status === 'paid' ? 'succeeded' : 'requires_payment_method',
            paid: session.payment_status === 'paid',
            amount: session.amount_total ? {
              value: convertAmountFromStripeCents(session.amount_total, session.currency || 'usd').toString(),
              currency: session.currency?.toUpperCase() || 'USD'
            } : undefined,
            metadata: session.metadata || {},
            stripe_session_id: session.id,
          })
        }
      } catch {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }
    }

    // Map Stripe status to our format
    let status: string
    let paid: boolean

    switch (paymentIntent.status) {
      case 'succeeded':
        status = 'succeeded'
        paid = true
        break
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        status = 'requires_payment_method'
        paid = false
        break
      case 'processing':
        status = 'processing'
        paid = false
        break
      case 'canceled':
        status = 'canceled'
        paid = false
        break
      default:
        status = paymentIntent.status
        paid = false
    }

    const response = {
      id: paymentIntent.id,
      status,
      paid,
      amount: {
        value: convertAmountFromStripeCents(paymentIntent.amount, paymentIntent.currency).toString(),
        currency: paymentIntent.currency.toUpperCase()
      },
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata || {},
      stripe_payment_intent_id: paymentIntent.id,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Stripe payment status error:', error)
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 })
  }
}
