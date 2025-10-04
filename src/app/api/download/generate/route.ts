import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, productId } = body

    if (!orderId || !productId) {
      return NextResponse.json({ error: 'Order ID and Product ID are required' }, { status: 400 })
    }

    // Проверяем, что заказ существует и оплачен
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Order is not paid' }, { status: 403 })
    }

    // Проверяем, что продукт существует и имеет приватный файл
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.original) {
      return NextResponse.json({ error: 'Product has no private file' }, { status: 404 })
    }

    // Проверяем, что заказ содержит этот продукт
    try {
      const detailsRaw: unknown = typeof order.details === 'string' ? JSON.parse(order.details) : order.details
      const detailsObj = (detailsRaw && typeof detailsRaw === 'object') ? (detailsRaw as Record<string, unknown>) : undefined
      const itemsUnknown = detailsObj?.items
      const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
      
      const hasProduct = items.some((item) => {
        const obj = (item && typeof item === 'object') ? (item as Record<string, unknown>) : undefined
        const val = obj?.id
        return val === productId
      })

      if (!hasProduct) {
        return NextResponse.json({ error: 'Product not in this order' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid order details' }, { status: 400 })
    }

    // Генерируем уникальный токен
    const token = randomUUID()
    
    // Ссылка действительна 24 часа
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Создаем запись о временной ссылке
    const downloadLink = await prisma.downloadLink.create({
      data: {
        token,
        orderId,
        productId,
        filename: product.original,
        expiresAt
      }
    })

    // Создаем URL для скачивания
    // Используем переменную окружения для правильного домена
    const baseUrl = process.env.FRONTEND_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : request.nextUrl.origin
    const downloadUrl = `${baseUrl}/api/download/temp/${token}`

    return NextResponse.json({
      token,
      downloadUrl,
      expiresAt: downloadLink.expiresAt,
      message: 'Download link generated successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Generate download link error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
