import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        const details = typeof order.details === 'string' ? JSON.parse(order.details) : order.details
        const items = Array.isArray(details?.items) ? details.items : []
        productIds = items.map((it: any) => String(it?.id)).filter(Boolean)
      } catch {
        // ignore parse errors
      }

      if (productIds.length > 0) {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, original: true }
        })
        const map = new Map(products.map(p => [p.id, p.original]))
        const downloads = productIds
          .map(pid => {
            const orig = map.get(pid)
            if (!orig) return null
            return { productId: pid, url: orig }
          })
          .filter(Boolean)

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
      status 
    } = body

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
        details,
        status
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

