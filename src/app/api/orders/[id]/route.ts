import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// GET /api/orders/[id] - получить заказ по ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const url = new URL(request.url)
    const reveal = url.searchParams.get('reveal')
    const productId = url.searchParams.get('productId') || undefined

    // Legacy single product reveal
    if (reveal === 'product' && productId && order.status === 'paid') {
      const product = await prisma.product.findUnique({ where: { id: productId } })
      if (product?.original) {
        return NextResponse.json({ ...order, original: product.original })
      }
    }

    // If order is paid, include downloads array built from details.items[].id
    if (order.status === 'paid') {
      let productIds: string[] = []
      try {
        const detailsRaw: unknown = typeof order.details === 'string' ? JSON.parse(order.details) : order.details
        const detailsObj = (detailsRaw && typeof detailsRaw === 'object') ? (detailsRaw as Record<string, unknown>) : undefined
        const itemsUnknown = detailsObj?.items
        const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
        productIds = items
          .map((item) => {
            const obj = (item && typeof item === 'object') ? (item as Record<string, unknown>) : undefined
            const val = obj?.id
            if (typeof val === 'string') return val
            if (typeof val === 'number' || typeof val === 'boolean') return String(val)
            return ''
          })
          .filter((v): v is string => Boolean(v))
      } catch {
        // ignore parse errors
      }

      if (productIds.length > 0) {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, original: true }
        })
        const map = new Map<string, string | null>(
          products.map((p: { id: string; original: string | null }) => [p.id, p.original])
        )
        const downloads = []
        
        for (const pid of productIds) {
          const orig = map.get(pid)
          if (!orig) continue
          
          // Генерируем временную ссылку для каждого приватного файла
          try {
            const token = randomUUID()
            const expiresAt = new Date()
            expiresAt.setHours(expiresAt.getHours() + 24) // 24 часа
            
            // Создаем запись о временной ссылке
            await prisma.downloadLink.create({
              data: {
                token,
                orderId: order.id,
                productId: pid,
                filename: orig,
                expiresAt
              }
            })
            
            // Создаем URL для скачивания
            // Используем переменную окружения для правильного домена
            const baseUrl = process.env.FRONTEND_BASE_URL || process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : request.nextUrl.origin
            const downloadUrl = `${baseUrl}/api/download/temp/${token}`
            
            downloads.push({
              productId: pid,
              filename: orig,
              downloadUrl,
              expiresAt: expiresAt.toISOString()
            })
          } catch (error) {
            console.error('Error generating download link:', error)
            // Если не удалось создать ссылку, добавляем без неё
            downloads.push({
              productId: pid,
              filename: orig,
              hasPrivateFile: true,
              error: 'Failed to generate download link'
            })
          }
        }

        return NextResponse.json({ ...order, downloads })
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch order',
        detail: process.env.NODE_ENV !== 'production' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[id] - обновить заказ
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { 
      name, 
      telegramDiscord, 
      steamProfile, 
      style, 
      colorTheme, 
      details,
      status,
      paymentProvider,
      currency
    } = body

    // Попытаться обогатить details снапшотом цен и названия
    let enrichedDetails: string | unknown = details
    try {
      const raw: unknown = typeof details === 'string' ? JSON.parse(details) : details
      if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>
        const itemsUnknown = obj.items
        const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
        const ids = items
          .map((item) => {
            const rec = (item && typeof item === 'object') ? (item as Record<string, unknown>) : undefined
            const val = rec?.id
            if (typeof val === 'string') return val
            if (typeof val === 'number' || typeof val === 'boolean') return String(val)
            return ''
          })
          .filter((v): v is string => Boolean(v))
        if (ids.length) {
          const products = await prisma.product.findMany({ where: { id: { in: Array.from(new Set(ids)) } }, select: { id: true, title: true, price: true } })
          const pMap = new Map<string, { id: string; title: string; price: number | null }>(
            products.map((p: { id: string; title: string; price: number | null }) => [p.id, p])
          )
          let total = 0
          const enrichedItems = items.map((item) => {
            const rec = (item && typeof item === 'object') ? (item as Record<string, unknown>) : {}
            const idVal = rec.id
            const pid = typeof idVal === 'string' ? idVal : (typeof idVal === 'number' || typeof idVal === 'boolean') ? String(idVal) : ''
            if (!pid) return rec
            const p = pMap.get(pid)
            if (p && typeof p.price === 'number') {
              total += p.price
            }
            return { ...rec, id: pid, title: p?.title ?? rec.title, price: typeof p?.price === 'number' ? p?.price : rec.price }
          })
          enrichedDetails = JSON.stringify({ ...obj, items: enrichedItems, totalPrice: total })
        }
      }
    } catch {}

    const order = await prisma.order.update({
      where: {
        id
      },
      data: {
        name,
        telegramDiscord,
        steamProfile,
        style,
        colorTheme,
        details: typeof enrichedDetails === 'string' ? enrichedDetails : details,
        status,
        paymentProvider,
        currency
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - удалить заказ
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await prisma.order.delete({
      where: {
        id
      }
    })

    return NextResponse.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}

