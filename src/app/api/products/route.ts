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
    const rawProfileColorValues = parseMulti('profileColor')
    const normalizeProfileColor = (v: string): string => {
      const lc = v.toLowerCase()
      if (lc === 'black-white' || lc === 'blackwhite' || lc === 'black_and_white') return 'black and white'
      return v
    }
    const profileColorValues = rawProfileColorValues.map(normalizeProfileColor)
    const themeValues = parseMulti('theme')

    const where: Record<string, unknown> = {}
    if (showcaseValues.length) where.showcase = { in: showcaseValues }
    if (profileColorValues.length) where.profileColor = { in: profileColorValues }
    if (themeValues.length) where.theme = { in: themeValues }

    // Optional pagination
    const pageParam = params.get('page')
    const perParam = params.get('per') || params.get('limit')
    const hasPagination = pageParam !== null
    const per = hasPagination ? Math.max(1, Math.min(100, parseInt(perParam || '10', 10) || 10)) : undefined
    const page = hasPagination ? Math.max(1, parseInt(pageParam || '1', 10) || 1) : undefined

    let products
    let totalCount: number | undefined
    if (hasPagination) {
      const skip = ((page as number) - 1) * (per as number)
      ;[totalCount, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: per,
        }),
      ])
    } else {
      products = await prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      })
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

    const withAbsolute = products.map((p: { video: string } & Record<string, unknown>) => ({
      ...p,
      video: normalizeUrl(p.video) as string,
    }))

    if (hasPagination) {
      const pages = Math.max(1, Math.ceil((totalCount as number) / (per as number)))
      return NextResponse.json({
        items: withAbsolute,
        total: totalCount,
        page,
        per,
        pages,
      })
    }

    return NextResponse.json(withAbsolute)
  } catch (error) {
    console.error('Error fetching products:', error)
    const detail = error instanceof Error ? error.message : String(error)
    const envUrl = process.env.NODE_ENV !== 'production' ? process.env.DATABASE_URL : undefined
    const nodeEnv = process.env.NODE_ENV
    return NextResponse.json({ error: 'Failed to fetch products', detail, envUrl, nodeEnv }, { status: 500 })
  }
}

// POST /api/products - создать новый продукт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, price, priceUSD, video, badge, showcase, profileColor, theme, original } = body

    const numericPrice = typeof price === 'string' ? parseFloat(price) : Number(price)
    const numericPriceUSD = typeof priceUSD === 'string' ? parseFloat(priceUSD) : (typeof priceUSD === 'number' ? priceUSD : undefined)

    if (!title || !video || Number.isNaN(numericPrice)) {
      return NextResponse.json(
        { error: 'Title, price, and video are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        title,
        price: numericPrice,
        priceUSD: typeof numericPriceUSD === 'number' && !Number.isNaN(numericPriceUSD) ? numericPriceUSD : undefined,
        video,
        badge: badge || null,
        showcase: showcase ?? undefined,
        profileColor: profileColor ?? undefined,
        theme: theme ?? undefined,
        original: original ?? undefined,
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
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to create product', detail }, { status: 500 })
  }
}

