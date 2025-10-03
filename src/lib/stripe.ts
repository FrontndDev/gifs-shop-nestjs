import Stripe from 'stripe'

export type StripeEnv = 'test' | 'live'

export function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not set')
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2025-09-30.clover',
  })
}

export function getStripePublishableKey(): string {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY not set')
  }
  return publishableKey
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not set')
  }
  return webhookSecret
}

export async function verifyStripeWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret?: string
): Promise<Stripe.Event> {
  const stripe = getStripeInstance()
  const secret = webhookSecret || getStripeWebhookSecret()
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`)
  }
}

export function convertAmountToStripeCents(amount: number | string, currency: string = 'USD'): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Для валют без копеек (JPY, KRW) возвращаем целое число
  const zeroDecimalCurrencies = ['JPY', 'KRW']
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(numericAmount)
  }
  
  // Для остальных валют конвертируем в центы/копейки
  return Math.round(numericAmount * 100)
}

export function convertAmountFromStripeCents(amountInCents: number, currency: string = 'USD'): number {
  // Для валют без копеек (JPY, KRW) возвращаем как есть
  const zeroDecimalCurrencies = ['JPY', 'KRW']
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amountInCents
  }
  
  // Для остальных валют конвертируем из центов/копеек
  return amountInCents / 100
}
