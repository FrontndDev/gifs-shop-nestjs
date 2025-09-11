import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// POST /api/seed/paid - создать несколько тестовых оплаченных заказов
export async function POST() {
  try {
    // Получаем список продуктов
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } })

    // Если продуктов нет — создадим пару базовых
    const ensureProducts = async () => {
      if (products.length > 0) return products
      const created = [] as Array<{ id: string }>
      const base = [
        { title: 'Demo A', price: 5.0, video: '/uploads/306f4b71-4103-4ab1-85fd-c5d9abb2ee56.gif' },
        { title: 'Demo B', price: 7.5, video: '/uploads/763ceb20-01ad-41de-a41a-776336a7ae63.gif' },
        { title: 'Demo C', price: 3.0, video: '/uploads/ebc44efe-9234-4376-a190-b883f92ec5ad.gif' },
      ]
      for (const p of base) {
        const np = await prisma.product.create({ data: p })
        created.push({ id: np.id })
      }
      return prisma.product.findMany({ orderBy: { createdAt: 'asc' } })
    }

    const list = products.length ? products : await ensureProducts()
    if (list.length === 0) {
      return NextResponse.json({ error: 'No products available to create paid orders' }, { status: 400 })
    }

    const pick = (n: number) => list[Math.min(n, list.length - 1)]

    // Разные даты создания для статистики: сегодня, 3 дня назад, 10 и 25 дней назад
    const now = new Date()
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

    const payloads = [
      {
        name: 'Тестовый заказ 1',
        telegramDiscord: '@seed_user1',
        steamProfile: 'https://steamcommunity.com/id/seed1',
        style: 'cyberpunk',
        colorTheme: 'blue',
        details: JSON.stringify({ items: [{ id: pick(0).id }, { id: pick(1).id }] }),
        status: 'paid' as const,
        createdAt: daysAgo(0)
      },
      {
        name: 'Тестовый заказ 2',
        telegramDiscord: '@seed_user2',
        steamProfile: 'https://steamcommunity.com/id/seed2',
        style: 'minimal',
        colorTheme: 'red',
        details: JSON.stringify({ items: [{ id: pick(0).id }] }),
        status: 'paid' as const,
        createdAt: daysAgo(3)
      },
      {
        name: 'Тестовый заказ 3',
        telegramDiscord: '@seed_user3',
        steamProfile: 'https://steamcommunity.com/id/seed3',
        style: 'anime',
        colorTheme: 'black and white',
        details: JSON.stringify({ items: [{ id: pick(1).id }, { id: pick(1).id }] }),
        status: 'paid' as const,
        createdAt: daysAgo(10)
      },
      {
        name: 'Тестовый заказ 4',
        telegramDiscord: '@seed_user4',
        steamProfile: 'https://steamcommunity.com/id/seed4',
        style: 'neon',
        colorTheme: 'green',
        details: JSON.stringify({ items: [{ id: pick(2).id }] }),
        status: 'paid' as const,
        createdAt: daysAgo(25)
      }
    ]

    const created = [] as Array<unknown>
    for (const data of payloads) {
      const order = await prisma.order.create({ data })
      created.push(order)
    }

    return NextResponse.json({ ok: true, created: created.length })
  } catch (error) {
    console.error('Error seeding paid orders:', error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to create paid orders', detail }, { status: 500 })
  }
}


