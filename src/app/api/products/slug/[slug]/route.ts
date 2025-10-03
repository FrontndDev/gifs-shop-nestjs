import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/slug/[slug] - получить продукт по slug
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const product = await prisma.product.findUnique({
      where: { slug }
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

    const withAbsolute = {
      ...product,
      video: normalizeUrl(product.video) as string,
    }

    return NextResponse.json(withAbsolute)
  } catch (error) {
    console.error('Error fetching product by slug:', error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to fetch product', detail },
      { status: 500 }
    )
  }
}
