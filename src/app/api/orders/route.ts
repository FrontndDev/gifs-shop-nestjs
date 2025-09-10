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

    const order = await prisma.order.create({
      data: {
        name,
        telegramDiscord,
        steamProfile,
        style,
        colorTheme,
        details,
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

