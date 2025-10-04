import { NextRequest, NextResponse } from 'next/server'
import { verifyPayPalWebhookSignature } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'
import { sendTelegramNotification } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers = request.headers
    const ok = await verifyPayPalWebhookSignature({
      body,
      transmissionId: headers.get('paypal-transmission-id'),
      transmissionTime: headers.get('paypal-transmission-time'),
      certUrl: headers.get('paypal-cert-url'),
      authAlgo: headers.get('paypal-auth-algo'),
      transmissionSig: headers.get('paypal-transmission-sig'),
    })
    if (!ok) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })

    // Пример: обновление статуса заказа по metadata.orderId, если передавали его при создании
    const eventType: string | undefined = body?.event_type
    const orderId: string | undefined = body?.resource?.purchase_units?.[0]?.custom_id || body?.resource?.custom_id
    let status: string | undefined
    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') status = 'paid'
    if (eventType === 'PAYMENT.CAPTURE.DENIED') status = 'failed'
    if (status && orderId) {
      const currency = body?.resource?.purchase_units?.[0]?.amount?.currency_code || 'USD'
      await prisma.order.updateMany({ 
        where: { id: orderId }, 
        data: { 
          status,
          paymentProvider: 'paypal',
          currency: currency.toUpperCase()
        } 
      })

      // Отправляем уведомление в Telegram при успешной оплате
      if (status === 'paid') {
        await sendOrderNotification(orderId, 'paypal', currency.toUpperCase())
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}

async function sendOrderNotification(orderId: string, paymentProvider: string, currency: string) {
  try {
    // Получаем данные заказа
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        name: true,
        telegramDiscord: true,
        steamProfile: true,
        details: true
      }
    })

    if (!order) {
      console.error('Order not found for notification:', orderId)
      return
    }

    // Парсим детали заказа для получения товаров
    let items: any[] = []
    try {
      const details = JSON.parse(order.details as string)
      if (details && details.items && Array.isArray(details.items)) {
        items = details.items
      }
    } catch (e) {
      console.error('Error parsing order details:', e)
      return
    }

    // Отправляем уведомление для каждого товара
    for (const item of items) {
      // Получаем информацию о продукте
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        select: { title: true }
      })

      if (product) {
        await sendTelegramNotification({
          productName: product.title,
          price: item.price || 0,
          currency: currency,
          email: order.name, // Используем поле name как email
          telegramDiscord: order.telegramDiscord || undefined,
          steamProfile: order.steamProfile || undefined,
          orderId: orderId,
          paymentProvider: paymentProvider
        })
      }
    }
  } catch (error) {
    console.error('Error sending order notification:', error)
  }
}


