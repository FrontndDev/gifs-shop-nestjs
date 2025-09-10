import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const runtime = 'nodejs'

// POST /api/seed - заполнить базу тестовыми данными
export async function POST() {
  try {
    // Очистить существующие данные
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()

    // Создать тестовые продукты
    const productsData = [
      {
        title: 'Cyber Neon — Анимированная иллюстрация Steam',
        price: 8.0,
        video: '/mp4.mp4',
        badge: 'Хит продаж',
        showcase: 'main',
        profileColor: 'blue',
        theme: 'anime'
      },
      {
        title: 'Power — Анимированная иллюстрация Steam',
        price: 6.0,
        video: '/mp4.mp4',
        badge: 'Новинка',
        showcase: 'workshop',
        profileColor: 'red',
        theme: 'not-anime'
      },
      {
        title: 'Cyberpunk 2077 — Анимированная иллюстрация Steam',
        price: 10.0,
        video: '/mp4.mp4',
        badge: 'Скидка',
        showcase: 'artwork',
        profileColor: 'green',
        theme: 'free'
      },
      {
        title: 'Exclusive Showcase — Анимированная иллюстрация Steam',
        price: 15.0,
        video: '/mp4.mp4',
        badge: 'Эксклюзив',
        showcase: 'main',
        profileColor: 'purple',
        theme: 'anime'
      }
    ]

    const createdProducts = [] as Array<unknown>
    for (const data of productsData) {
      const product = await prisma.product.create({ data })
      createdProducts.push(product)
    }

    // Создать тестовые заказы
    const ordersData = [
      {
        name: 'Иван Петров',
        telegramDiscord: '@ivan_petrov',
        steamProfile: 'https://steamcommunity.com/id/ivanpetrov',
        style: 'cyberpunk',
        colorTheme: 'blue',
        details: 'Хочу оформление в стиле Cyberpunk 2077 с синими неоновыми элементами',
        status: 'pending'
      },
      {
        name: 'Алексей Смирнов',
        telegramDiscord: 'alexey_smirnov#1234',
        steamProfile: 'https://steamcommunity.com/id/alexeysmirnov',
        style: 'minimal',
        colorTheme: 'dark',
        details: 'Минималистичный дизайн в темных тонах, любимые игры: CS2, Dota 2',
        status: 'in_progress'
      }
    ]

    const createdOrders = [] as Array<unknown>
    for (const data of ordersData) {
      const order = await prisma.order.create({ data })
      createdOrders.push(order)
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      products: createdProducts.length,
      orders: createdOrders.length
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    )
  }
}

