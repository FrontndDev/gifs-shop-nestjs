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
    
    console.log('PayPal webhook received:', {
      eventType: body?.event_type,
      orderId: body?.resource?.purchase_units?.[0]?.custom_id || body?.resource?.custom_id,
      currency: body?.resource?.purchase_units?.[0]?.amount?.currency_code,
      fullBody: JSON.stringify(body, null, 2)
    })
    
    const ok = await verifyPayPalWebhookSignature({
      body,
      transmissionId: headers.get('paypal-transmission-id'),
      transmissionTime: headers.get('paypal-transmission-time'),
      certUrl: headers.get('paypal-cert-url'),
      authAlgo: headers.get('paypal-auth-algo'),
      transmissionSig: headers.get('paypal-transmission-sig'),
    })
    if (!ok) {
      console.error('PayPal webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    // Пример: обновление статуса заказа по metadata.orderId, если передавали его при создании
    const eventType: string | undefined = body?.event_type
    const orderId: string | undefined = body?.resource?.purchase_units?.[0]?.custom_id || 
                                      body?.resource?.custom_id ||
                                      body?.resource?.id ||
                                      body?.custom_id
    let status: string | undefined
    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') status = 'paid'
    if (eventType === 'PAYMENT.CAPTURE.DENIED') status = 'failed'
    
    console.log('PayPal webhook processing:', {
      eventType,
      orderId,
      status
    })
    
    if (status && orderId) {
      const currency = body?.resource?.purchase_units?.[0]?.amount?.currency_code || 'USD'
      
      console.log('Updating order:', {
        orderId,
        status,
        paymentProvider: 'paypal',
        currency: currency.toUpperCase()
      })
      
      // Проверяем текущий статус заказа перед обновлением
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true }
      })
      
      const wasAlreadyPaid = existingOrder?.status === 'paid'
      console.log('Order was already paid in DB (webhook):', wasAlreadyPaid)
      
      await prisma.order.updateMany({ 
        where: { id: orderId }, 
        data: { 
          status,
          paymentProvider: 'paypal',
          currency: currency.toUpperCase()
        } 
      })

      // Отправляем уведомление в Telegram только если заказ не был оплачен ранее
      if (status === 'paid' && !wasAlreadyPaid) {
        console.log('Sending Telegram notification for newly paid order:', orderId)
        await sendOrderNotification(orderId, 'paypal', currency.toUpperCase())
      } else if (status === 'paid' && wasAlreadyPaid) {
        console.log('Order was already paid, skipping notification (webhook)')
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
    console.log('Starting sendOrderNotification for order:', orderId)
    
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

    console.log('Order found:', {
      name: order.name,
      telegramDiscord: order.telegramDiscord,
      steamProfile: order.steamProfile,
      detailsLength: order.details?.length
    })

    // Парсим детали заказа для получения товаров
    let items: Array<{ id: string; title?: string; price?: number }> = []
    try {
      const details = JSON.parse(order.details as string)
      if (details && details.items && Array.isArray(details.items)) {
        items = details.items
        console.log('Parsed items:', items)
      }
    } catch (e) {
      console.error('Error parsing order details:', e)
      return
    }

    // Отправляем уведомление для каждого товара
    for (const item of items) {
      console.log('Processing item:', item)
      
      // Получаем информацию о продукте
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        select: { title: true }
      })

      if (product) {
        console.log('Product found:', product.title)
        
        const notificationData = {
          productName: product.title,
          price: item.price || 0,
          currency: currency,
          email: order.name, // Используем поле name как email
          telegramDiscord: order.telegramDiscord || undefined,
          steamProfile: order.steamProfile || undefined,
          orderId: orderId,
          paymentProvider: paymentProvider
        }
        
        console.log('Sending notification with data:', notificationData)
        await sendTelegramNotification(notificationData)
      } else {
        console.error('Product not found for item:', item)
      }
    }
  } catch (error) {
    console.error('Error sending order notification:', error)
  }
}


