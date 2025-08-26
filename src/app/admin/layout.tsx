export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-rows-[56px_1fr]">
      <header className="neon-header h-[56px] flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-5 rounded-sm bg-[var(--brand)]"></span>
          <span className="text-lg font-semibold tracking-wide">AERODESIGN Admin</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a className="neon-link" href="/admin/products">Products</a>
          <a className="neon-link" href="/admin/orders">Orders</a>
        </nav>
      </header>
      <div className="grid grid-cols-[260px_1fr]">
        <aside className="p-4 pr-0">
          <div className="neon-card p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)] mb-2">Навигация</div>
            <nav className="flex flex-col gap-2 text-sm">
              <a className="neon-link" href="/admin/products">Товары</a>
              <a className="neon-link" href="/admin/orders">Заказы</a>
            </nav>
          </div>
        </aside>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}


