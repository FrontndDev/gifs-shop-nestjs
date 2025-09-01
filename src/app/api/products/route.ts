import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { prisma } from '@/lib/prisma'

// GET /api/products - получить продукты с фильтрами
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const parseMulti = (key: string): string[] => {
      const values = params.getAll(key)
      if (values.length === 0) return []
      return values.flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean)
    }

    const showcaseValues = parseMulti('showcase')
    const profileColorValues = parseMulti('profileColor')
    const themeValues = parseMulti('theme')

    const where: Record<string, unknown> = {}
    if (showcaseValues.length) where.showcase = { in: showcaseValues }
    if (profileColorValues.length) where.profileColor = { in: profileColorValues }
    if (themeValues.length) where.theme = { in: themeValues }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

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

    const withAbsolute = products.map((p) => ({
      ...p,
      video: normalizeUrl(p.video) as string,
    }))

    return NextResponse.json(withAbsolute)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - создать новый продукт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, price, video, badge, showcase, profileColor, theme } = body

    if (!title || !price || !video) {
      return NextResponse.json(
        { error: 'Title, price, and video are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        title,
        price: parseFloat(price),
        video,
        badge: badge || null,
        showcase: showcase ?? undefined,
        profileColor: profileColor ?? undefined,
        theme: theme ?? undefined,
      }
    })

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

    return NextResponse.json(withAbsolute, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}

