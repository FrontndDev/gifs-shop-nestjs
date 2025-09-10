import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/[id] - получить продукт по ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const product = await prisma.product.findUnique({
      where: {
        id
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const forwardedProto = request.headers.get('x-forwarded-proto')
    const forwardedHost = request.headers.get('x-forwarded-host')
    const effectiveOrigin = forwardedHost
      ? `${forwardedProto || 'https'}://${forwardedHost}`
      : request.nextUrl.origin

    const normalizeUrl = (value: unknown): unknown => {
      if (typeof value !== 'string') return value
      if (value.startsWith('http')) return value
      const base = effectiveOrigin.replace(/\/$/, '')
      const path = value.startsWith('/') ? value : `/${value}`
      return `${base}${path}`
    }

    // Hide original by default
    const withAbsolute = {
      ...product,
      video: normalizeUrl(product.video) as string,
    } as Record<string, unknown>
    delete withAbsolute.original

    return NextResponse.json(withAbsolute)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - обновить продукт
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { title, price, video, badge, showcase, profileColor, theme, original } = body

    const product = await prisma.product.update({
      where: {
        id
      },
      data: {
        title,
        price: price ? parseFloat(price) : undefined,
        video,
        badge,
        showcase,
        profileColor,
        theme,
        original
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - удалить продукт
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await prisma.product.delete({
      where: {
        id
      }
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}

