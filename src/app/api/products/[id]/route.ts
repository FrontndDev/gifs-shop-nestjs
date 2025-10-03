import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug, createUniqueSlug } from '@/lib/slug'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// Проверка авторизации админа
async function checkAdminAuth(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return { error: 'No token provided', status: 401 }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return { error: 'Invalid token', status: 401 }
  }

  // Проверяем, что админ существует и активен
  const admin = await prisma.admin.findUnique({
    where: { id: payload.id }
  })

  if (!admin || !admin.isActive) {
    return { error: 'Admin not found or inactive', status: 401 }
  }

  return { admin }
}

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
    // Проверяем авторизацию админа
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await context.params
    const body = await request.json()
    const { title, titleEn, price, priceUSD, video, badge, showcase, profileColor, theme, original } = body
    const numericPriceRaw = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : undefined)
    const numericPriceUSDRaw = typeof priceUSD === 'string' ? parseFloat(priceUSD) : (typeof priceUSD === 'number' ? priceUSD : undefined)
    const numericPrice = (numericPriceRaw !== undefined && !Number.isNaN(numericPriceRaw)) ? numericPriceRaw : undefined
    const numericPriceUSD = (numericPriceUSDRaw !== undefined && !Number.isNaN(numericPriceUSDRaw)) ? numericPriceUSDRaw : undefined

    // Если titleEn изменился, нужно обновить slug
    const updateData: {
      title: string;
      titleEn: string | null;
      price?: number;
      priceUSD?: number | null;
      video: string;
      badge: string | null;
      showcase?: string | null;
      profileColor?: string | null;
      theme?: string | null;
      original?: string | null;
      slug?: string | null;
    } = {
      title,
      titleEn,
      price: numericPrice === undefined ? undefined : numericPrice,
      priceUSD: numericPriceUSD === undefined ? undefined : numericPriceUSD,
      video,
      badge: badge === '' ? null : badge,
      showcase,
      profileColor,
      theme,
      original
    }

    // Если titleEn изменился, генерируем новый slug
    if (titleEn) {
      const baseSlug = generateSlug(titleEn)
      
      // Получаем все существующие slug кроме текущего
      const existingProducts = await prisma.product.findMany({
        where: { id: { not: id } },
        select: { slug: true }
      })
      const existingSlugs = existingProducts.map(p => p.slug).filter(Boolean)
      
      // Создаем уникальный slug
      const slug = await createUniqueSlug(baseSlug, existingSlugs)
      updateData.slug = slug
    } else {
      // Если titleEn пустой, slug тоже должен быть null
      updateData.slug = null
    }

    const product = await prisma.product.update({
      where: {
        id
      },
      data: updateData
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
    // Проверяем авторизацию админа
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

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

