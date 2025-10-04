import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'
import { sendTelegramNotification } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const accessToken = await getPayPalAccessToken()
    const base = getPayPalBaseUrl()
    
    // Сначала проверяем статус заказа
    console.log('Checking PayPal order status before capture:', id)
    const statusRes = await fetch(`${base}/v2/checkout/orders/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    
    const statusData = await statusRes.json().catch(() => ({}))
    console.log('PayPal order status:', statusData?.status)
    
    // Если заказ уже захвачен, возвращаем его данные и обновляем статус в БД
    if (statusData?.status === 'COMPLETED') {
      console.log('Order already captured, returning existing data')
      
      // Проверяем текущий статус заказа в БД
      const purchaseUnits = Array.isArray(statusData?.purchase_units) ? statusData.purchase_units : []
      let customId = purchaseUnits.length ? (purchaseUnits[0]?.custom_id as string | undefined) : undefined
      
      if (customId) {
        const existingOrder = await prisma.order.findUnique({
          where: { id: customId },
          select: { status: true }
        })
        
        const wasAlreadyPaid = existingOrder?.status === 'paid'
        console.log('Order was already paid in DB:', wasAlreadyPaid)
        
        // Обновляем статус заказа в базе данных
        await prisma.order.update({ 
          where: { id: customId }, 
          data: { 
            status: 'paid',
            paymentProvider: 'paypal',
            currency: purchaseUnits[0]?.amount?.currency_code || 'USD'
          } 
        }).catch(() => undefined)
        
        // Отправляем уведомление только если заказ не был оплачен ранее
        if (!wasAlreadyPaid) {
          console.log('Sending notification for newly paid order:', customId)
          await sendOrderNotification(customId, 'paypal', purchaseUnits[0]?.amount?.currency_code || 'USD')
        } else {
          console.log('Order was already paid, skipping notification')
        }
      }
      
      return NextResponse.json(statusData)
    }
    
    // Если заказ не в состоянии для захвата
    if (statusData?.status !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Order not in correct state for capture', 
        details: { currentStatus: statusData?.status } 
      }, { status: 400 })
    }
    
    // Пытаемся захватить заказ
    const res = await fetch(`${base}/v2/checkout/orders/${id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json().catch(() => ({}))
    
    // Обрабатываем ошибку ORDER_ALREADY_CAPTURED
    if (!res.ok && data?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      console.log('Order already captured, fetching order details')
      // Получаем данные уже захваченного заказа
      const existingRes = await fetch(`${base}/v2/checkout/orders/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      const existingData = await existingRes.json().catch(() => ({}))
      
      // Обрабатываем данные заказа как успешную оплату
      try {
        const purchaseUnits = Array.isArray(existingData?.purchase_units) ? existingData.purchase_units : []
        let customId = purchaseUnits.length ? (purchaseUnits[0]?.custom_id as string | undefined) : undefined
        
        if (!customId) {
          const getRes = await fetch(`${base}/v2/checkout/orders/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
          })
          const getData = await getRes.json().catch(() => ({}))
          const pu2 = Array.isArray(getData?.purchase_units) ? getData.purchase_units : []
          customId = pu2.length ? (pu2[0]?.custom_id as string | undefined) : undefined
        }
        
        if (customId) {
          // Проверяем текущий статус заказа в БД
          const existingOrder = await prisma.order.findUnique({
            where: { id: customId },
            select: { status: true }
          })
          
          const wasAlreadyPaid = existingOrder?.status === 'paid'
          console.log('Order was already paid in DB (ORDER_ALREADY_CAPTURED):', wasAlreadyPaid)
          
          await prisma.order.update({ 
            where: { id: customId }, 
            data: { 
              status: 'paid',
              paymentProvider: 'paypal',
              currency: purchaseUnits[0]?.amount?.currency_code || 'USD'
            } 
          }).catch(() => undefined)
          
          // Отправляем уведомление только если заказ не был оплачен ранее
          if (!wasAlreadyPaid) {
            console.log('Sending notification for newly paid order (ORDER_ALREADY_CAPTURED):', customId)
            await sendOrderNotification(customId, 'paypal', purchaseUnits[0]?.amount?.currency_code || 'USD')
          } else {
            console.log('Order was already paid, skipping notification (ORDER_ALREADY_CAPTURED)')
          }
        }
      } catch {}
      
      return NextResponse.json(existingData)
    }
    
    if (!res.ok) {
      return NextResponse.json({ error: 'PayPal error', details: data }, { status: res.status })
    }
    try {
      // data.purchase_units[0].custom_id содержит наш orderId, если мы прокинули его на этапе create
      const purchaseUnits = Array.isArray(data?.purchase_units) ? data.purchase_units : []
      let customId = purchaseUnits.length ? (purchaseUnits[0]?.custom_id as string | undefined) : undefined
      // Если PayPal не вернул custom_id в ответе capture, пробуем получить его отдельным запросом
      if (!customId) {
        const accessToken2 = await getPayPalAccessToken()
        const base2 = getPayPalBaseUrl()
        const getRes = await fetch(`${base2}/v2/checkout/orders/${id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken2}`, 'Content-Type': 'application/json' }
        })
        const getData = await getRes.json().catch(() => ({}))
        const pu2 = Array.isArray(getData?.purchase_units) ? getData.purchase_units : []
        customId = pu2.length ? (pu2[0]?.custom_id as string | undefined) : undefined
      }
      if (customId) {
        // Проверяем текущий статус заказа в БД
        const existingOrder = await prisma.order.findUnique({
          where: { id: customId },
          select: { status: true }
        })
        
        const wasAlreadyPaid = existingOrder?.status === 'paid'
        console.log('Order was already paid in DB (successful capture):', wasAlreadyPaid)
        
        await prisma.order.update({ 
          where: { id: customId }, 
          data: { 
            status: 'paid',
            paymentProvider: 'paypal',
            currency: purchaseUnits[0]?.amount?.currency_code || 'USD'
          } 
        }).catch(() => undefined)
        
        // Отправляем уведомление только если заказ не был оплачен ранее
        if (!wasAlreadyPaid) {
          console.log('Sending notification for newly paid order (successful capture):', customId)
          await sendOrderNotification(customId, 'paypal', purchaseUnits[0]?.amount?.currency_code || 'USD')
        } else {
          console.log('Order was already paid, skipping notification (successful capture)')
        }
      }
    } catch {}
    return NextResponse.json(data)
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.json({ error: 'Failed to capture PayPal order' }, { status: 500 })
  }
}


