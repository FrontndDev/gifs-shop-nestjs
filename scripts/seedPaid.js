/* Seed several paid orders directly via Prisma Client (run with SQLITE_URL set). */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function daysAgo(n) {
  const now = new Date()
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
}

async function ensureProducts() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } })
  if (products.length >= 3) return products
  const base = [
    { title: 'Demo A', price: 5.0, video: '/public/uploads/306f4b71-4103-4ab1-85fd-c5d9abb2ee56.mp4' },
    { title: 'Demo B', price: 7.5, video: '/public/uploads/763ceb20-01ad-41de-a41a-776336a7ae63.mp4' },
    { title: 'Demo C', price: 3.0, video: '/public/uploads/ebc44efe-9234-4376-a190-b883f92ec5ad.mp4' },
  ]
  for (const p of base) {
    await prisma.product.create({ data: p })
  }
  return prisma.product.findMany({ orderBy: { createdAt: 'asc' } })
}

async function main() {
  const list = await ensureProducts()
  const pick = (i) => list[Math.min(i, list.length - 1)]

  const payloads = [
    {
      name: 'Seed Paid 1 (Stripe)', telegramDiscord: '@seed1', steamProfile: 'https://steamcommunity.com/id/seed1',
      style: 'cyberpunk', colorTheme: 'blue', details: JSON.stringify({ items: [{ id: pick(0).id }, { id: pick(1).id }] }),
      status: 'paid', paymentProvider: 'stripe', currency: 'USD', createdAt: daysAgo(0)
    },
    {
      name: 'Seed Paid 2 (PayPal)', telegramDiscord: '@seed2', steamProfile: 'https://steamcommunity.com/id/seed2',
      style: 'minimal', colorTheme: 'red', details: JSON.stringify({ items: [{ id: pick(0).id }] }),
      status: 'paid', paymentProvider: 'paypal', currency: 'USD', createdAt: daysAgo(3)
    },
    {
      name: 'Seed Paid 3 (YooKassa)', telegramDiscord: '@seed3', steamProfile: 'https://steamcommunity.com/id/seed3',
      style: 'anime', colorTheme: 'black and white', details: JSON.stringify({ items: [{ id: pick(1).id }, { id: pick(1).id }] }),
      status: 'paid', paymentProvider: 'yookassa', currency: 'RUB', createdAt: daysAgo(10)
    },
    {
      name: 'Seed Paid 4 (YooKassa)', telegramDiscord: '@seed4', steamProfile: 'https://steamcommunity.com/id/seed4',
      style: 'neon', colorTheme: 'green', details: JSON.stringify({ items: [{ id: pick(2).id }] }),
      status: 'paid', paymentProvider: 'yookassa', currency: 'RUB', createdAt: daysAgo(25)
    },
  ]

  for (const data of payloads) {
    await prisma.order.create({ data })
  }
}

main()
  .then(async () => { await prisma.$disconnect(); console.log('Seeded paid orders.') })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })


