export type PayPalEnv = 'sandbox' | 'live'

export function getPayPalBaseUrl(envValue?: string): string {
  const env = (envValue || process.env.PAYPAL_ENV || 'sandbox').toLowerCase() as PayPalEnv
  return env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set')
  }
  const base = getPayPalBaseUrl()
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
     
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`PayPal token error: ${res.status} ${JSON.stringify(data)}`)
  }
  return (data as { access_token: string }).access_token
}

export async function verifyPayPalWebhookSignature(args: {
  body: unknown
  transmissionId: string | null
  transmissionTime: string | null
  certUrl: string | null
  authAlgo: string | null
  transmissionSig: string | null
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return false
  const accessToken = await getPayPalAccessToken()
  const base = getPayPalBaseUrl()
  const payload = {
    transmission_id: args.transmissionId,
    transmission_time: args.transmissionTime,
    cert_url: args.certUrl,
    auth_algo: args.authAlgo,
    transmission_sig: args.transmissionSig,
    webhook_id: webhookId,
    webhook_event: args.body,
  }
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data: unknown = await res.json().catch(() => ({}))
  return (data as { verification_status?: string }).verification_status === 'SUCCESS'
}


