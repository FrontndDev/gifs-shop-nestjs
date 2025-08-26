import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Steam Profile Backend API
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Бэкэнд для управления продуктами и заказами оформления профилей Steam
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 rounded-lg p-8 border border-cyan-500/20">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400">
              📦 Products API
            </h2>
            <p className="text-slate-300 mb-6">
              Управление продуктами - анимированными иллюстрациями для Steam
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-400">GET</span>
                <code className="text-slate-300">/api/products</code>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">POST</span>
                <code className="text-slate-300">/api/products</code>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">GET</span>
                <code className="text-slate-300">/api/products/[id]</code>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-400">PUT</span>
                <code className="text-slate-300">/api/products/[id]</code>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">DELETE</span>
                <code className="text-slate-300">/api/products/[id]</code>
              </div>
            </div>
            <Link 
              href="/api/products" 
              className="inline-block mt-4 px-4 py-2 bg-cyan-500 text-black rounded hover:bg-cyan-400 transition-colors"
            >
              Посмотреть продукты
            </Link>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-8 border border-blue-500/20">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">
              📋 Orders API
            </h2>
            <p className="text-slate-300 mb-6">
              Управление заказами на оформление профилей
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-400">GET</span>
                <code className="text-slate-300">/api/orders</code>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">POST</span>
                <code className="text-slate-300">/api/orders</code>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">GET</span>
                <code className="text-slate-300">/api/orders/[id]</code>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-400">PUT</span>
                <code className="text-slate-300">/api/orders/[id]</code>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">DELETE</span>
                <code className="text-slate-300">/api/orders/[id]</code>
              </div>
            </div>
            <Link 
              href="/api/orders" 
              className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-400 transition-colors"
            >
              Посмотреть заказы
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="bg-slate-800/50 rounded-lg p-8 border border-green-500/20 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-green-400">
              🗄️ База данных
            </h3>
            <p className="text-slate-300 mb-4">
              Используется SQLite с Prisma ORM
            </p>
            <div className="text-sm text-slate-400">
              <p><strong>Products:</strong> id, title, price, video, badge, timestamps</p>
              <p><strong>Orders:</strong> id, name, telegramDiscord, steamProfile, style, colorTheme, details, status, timestamps</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            Создано с использованием Next.js 15, TypeScript, Prisma и SQLite
          </p>
        </div>
      </div>
    </div>
  )
}
