import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getStripeInstance, convertAmountToStripeCents } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreateStripePaymentRequest = {
  amount: number | string
  currency?: string
  description?: string
  returnUrl: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateStripePaymentRequest
    const amountValue = typeof body.amount === 'string' ? body.amount : Number(body.amount).toFixed(2)
    const currency = body.currency || 'USD'

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
        amount: { value: amountValue, currency },
        confirmation: { type: 'redirect', return_url: body.returnUrl },
        description: body.description || undefined,
        metadata: { ...metadata },
        free: true,
      }

      await prisma.order.update({ 
        where: { id: orderId }, 
        data: { 
          status: 'paid',
          paymentProvider: 'stripe',
          currency: currency
        } 
      }).catch(() => undefined)

      return NextResponse.json(payment, { status: 201 })
    }

    // Test mode: instant success without external call
    const isInstantSuccess = process.env.STRIPE_TEST_MODE === '1' || process.env.STRIPE_TEST_INSTANT_SUCCESS === '1'
    if (isInstantSuccess) {
      const payment = {
        id: `test_${randomUUID()}`,
        status: 'succeeded',
        paid: true,
        amount: { value: amountValue, currency },
        confirmation: { type: 'redirect', return_url: body.returnUrl },
        description: body.description || undefined,
        metadata: { ...metadata },
        test: true,
      }

      await prisma.order.update({ 
        where: { id: orderId }, 
        data: { 
          status: 'paid',
          paymentProvider: 'stripe',
          currency: currency
        } 
      }).catch(() => undefined)

      return NextResponse.json(payment, { status: 201 })
    }

    const stripe = getStripeInstance()
    const amountInCents = convertAmountToStripeCents(parseFloat(amountValue), currency)

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      description: body.description,
      metadata: {
        ...metadata,
        orderId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Create checkout session for redirect flow
    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          ...metadata,
          orderId,
        },
      },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: body.description || 'Order Payment',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${body.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.returnUrl,
      metadata: {
        ...metadata,
        orderId,
      },
    })

    return NextResponse.json({
      id: paymentIntent.id,
      status: 'requires_payment_method',
      paid: false,
      amount: { value: amountValue, currency },
      confirmation: { 
        type: 'redirect', 
        return_url: body.returnUrl,
        checkout_url: session.url 
      },
      description: body.description || undefined,
      metadata: { ...metadata },
      stripe_payment_intent_id: paymentIntent.id,
      stripe_session_id: session.id,
    }, { status: 201 })

  } catch (error) {
    console.error('Create Stripe payment error:', error)
    return NextResponse.json({ error: 'Failed to create Stripe payment' }, { status: 500 })
  }
}
