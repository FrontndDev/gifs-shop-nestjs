import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const runtime = 'nodejs'

// GET /api/orders - получить все заказы
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to fetch orders', detail }, { status: 500 })
  }
}

// POST /api/orders - создать новый заказ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      telegramDiscord, 
      steamProfile, 
      style, 
      colorTheme, 
      details 
    } = body

    // Валидация обязательных полей
    if (!name || !telegramDiscord || !steamProfile || !style || !colorTheme || !details) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Попытаться обогатить details: добавить snapshot цен и названий товаров
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
          const products = await prisma.product.findMany({
            where: { id: { in: Array.from(new Set(ids)) } },
            select: { id: true, title: true, price: true }
          })
          const pMap = new Map(products.map(p => [p.id, p]))

          let total = 0
          const enrichedItems = items.map((item) => {
            const rec = (item && typeof item === 'object') ? (item as Record<string, unknown>) : {}
            const idVal = rec.id
            const id = typeof idVal === 'string' ? idVal : (typeof idVal === 'number' || typeof idVal === 'boolean') ? String(idVal) : ''
            if (!id) return rec
            const p = pMap.get(id)
            if (p && typeof p.price === 'number') {
              total += p.price
            }
            return {
              ...rec,
              id,
              title: p?.title ?? rec.title,
              price: typeof p?.price === 'number' ? p?.price : rec.price,
            }
          })

          enrichedDetails = JSON.stringify({
            ...obj,
            items: enrichedItems,
            totalPrice: total,
          })
        }
      }
    } catch {
      // Игнорируем ошибки парсинга, сохраняем как есть
    }

    const order = await prisma.order.create({
      data: {
        name,
        telegramDiscord,
        steamProfile,
        style,
        colorTheme,
        details: typeof enrichedDetails === 'string' ? enrichedDetails : details,
        status: 'pending'
      }
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to create order', detail }, { status: 500 })
  }
}

