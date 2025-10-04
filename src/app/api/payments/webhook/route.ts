import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramNotification } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const event = await request.json()
    // Optionally verify event authenticity if headers/signature are configured

    // Expecting YooKassa event with object payment and metadata.orderId
    const payment = event?.object || event?.payment || null
    const status = payment?.status as string | undefined
    const metadata = payment?.metadata as Record<string, unknown> | undefined
    const orderId = (metadata?.orderId as string | undefined) || (metadata?.order_id as string | undefined)

    if (orderId && status) {
      // Map YooKassa status to local order status
      let newStatus: string | null = null
      if (status === 'succeeded' || status === 'waiting_for_capture' || status === 'captured') newStatus = 'paid'
      if (status === 'canceled') newStatus = 'cancelled'

      if (newStatus) {
        await prisma.order.update({ 
          where: { id: orderId }, 
          data: { 
            status: newStatus,
            paymentProvider: 'yookassa',
            currency: payment?.amount?.currency || 'RUB'
          } 
        })

        // Отправляем уведомление в Telegram при успешной оплате
        if (newStatus === 'paid') {
          await sendOrderNotification(orderId, 'yookassa', payment?.amount?.currency || 'RUB')
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
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
    let items: Array<{ id: string; title?: string; price?: number }> = []
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


