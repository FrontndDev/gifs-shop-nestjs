import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyStripeWebhookSignature } from '@/lib/stripe'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Verify webhook signature
    const event = await verifyStripeWebhookSignature(body, signature)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object)
        break
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.order_id
  if (orderId) {
    await prisma.order.update({ 
      where: { id: orderId }, 
      data: { status: 'paid' } 
    }).catch((error) => {
      console.error('Failed to update order status to paid:', error)
    })
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.order_id
  if (orderId) {
    await prisma.order.update({ 
      where: { id: orderId }, 
      data: { status: 'failed' } 
    }).catch((error) => {
      console.error('Failed to update order status to failed:', error)
    })
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.order_id
  if (orderId) {
    await prisma.order.update({ 
      where: { id: orderId }, 
      data: { status: 'cancelled' } 
    }).catch((error) => {
      console.error('Failed to update order status to cancelled:', error)
    })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId || session.metadata?.order_id
  if (orderId && session.payment_status === 'paid') {
    await prisma.order.update({ 
      where: { id: orderId }, 
      data: { status: 'paid' } 
    }).catch((error) => {
      console.error('Failed to update order status to paid from checkout session:', error)
    })
  }
}
