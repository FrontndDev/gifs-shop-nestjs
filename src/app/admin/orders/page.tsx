"use client"
import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'

type Order = {
  id: string
  name: string
  telegramDiscord: string
  steamProfile: string
  style: string
  colorTheme: string
  details: string
  status: string
  createdAt: string
  updatedAt: string
}

type Product = {
  id: string
  title: string
  price?: number
  video?: string
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [productTitleById, setProductTitleById] = useState<Record<string, string>>({})
  const [productPriceById, setProductPriceById] = useState<Record<string, number>>({})
  const [productImageById, setProductImageById] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'paid' | 'all'>('paid')

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    telegramDiscord: '',
    steamProfile: '',
    style: '',
    colorTheme: '',
    details: '',
    status: '',
  })

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/orders`)
      const data = await res.json()
      setOrders(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/api/products`)
      const data = await res.json()
      const list: Product[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      const map: Record<string, string> = {}
      const priceMap: Record<string, number> = {}
      const imageMap: Record<string, string> = {}
      for (const p of list) {
        if (p && typeof p.id === 'string' && typeof p.title === 'string') {
          map[p.id] = p.title
        }
        if (p && typeof p.id === 'string' && typeof p.price === 'number') {
          priceMap[p.id] = p.price
        }
        if (p && typeof p.id === 'string' && typeof p.video === 'string') {
          imageMap[p.id] = p.video
        }
      }
      setProductTitleById(map)
      setProductPriceById(priceMap)
      setProductImageById(imageMap)
    } catch (_e) {
      // Игнорируем ошибки загрузки продуктов для админки
    }
  }

  useEffect(() => {
    // Параллельно загружаем заказы и продукты
    fetchOrders()
    fetchProducts()
  }, [])

  const extractProductIds = (details: string): string[] => {
    try {
      const raw: unknown = typeof details === 'string' ? JSON.parse(details) : details
      if (!raw || typeof raw !== 'object') return []
      const itemsUnknown = (raw as Record<string, unknown>).items
      const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
      return items
        .map((item) => {
          const obj = item && typeof item === 'object' ? item as Record<string, unknown> : undefined
          const val = obj?.id
          if (typeof val === 'string') return val
          if (typeof val === 'number' || typeof val === 'boolean') return String(val)
          return ''
        })
        .filter((v): v is string => Boolean(v))
    } catch {
      return []
    }
  }

  const extractSnapshotTotal = (details: string): { prices: number[]; total: number | null } => {
    try {
      const raw: unknown = typeof details === 'string' ? JSON.parse(details) : details
      if (!raw || typeof raw !== 'object') return { prices: [], total: null }
      const obj = raw as Record<string, unknown>
      const totalVal = obj.totalPrice
      const total = typeof totalVal === 'number' && !Number.isNaN(totalVal) ? totalVal : null
      const itemsUnknown = obj.items
      const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
      const prices: number[] = items.map((it) => {
        const rec = it && typeof it === 'object' ? it as Record<string, unknown> : {}
        const pv = rec.price
        return typeof pv === 'number' && !Number.isNaN(pv) ? pv : NaN
      }).filter((n) => !Number.isNaN(n))
      return { prices, total }
    } catch {
      return { prices: [], total: null }
    }
  }

  const getOrderProducts = (o: Order): { id: string, title: string }[] => {
    const ids = extractProductIds(o.details)
    if (!ids.length) return []
    const seen = new Set<string>()
    const items: { id: string, title: string }[] = []
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      items.push({ id, title: productTitleById[id] || '' })
    }
    return items
  }

  const getOrderTotal = (o: Order): number | null => {
    const snap = extractSnapshotTotal(o.details)
    if (snap.total !== null) return snap.total
    if (snap.prices.length) return snap.prices.reduce((a, b) => a + b, 0)
    const ids = extractProductIds(o.details)
    if (!ids.length) return null
    let sum = 0
    let hasAny = false
    for (const id of ids) {
      const price = productPriceById[id]
      if (typeof price === 'number' && !Number.isNaN(price)) {
        sum += price
        hasAny = true
      }
    }
    return hasAny ? sum : null
  }

  type Stat = {
    id: string
    title: string
    price: number | null
    image: string | null
    count: number
    sumToday: number
    sum7d: number
    sum30d: number
  }

  const topStats = useMemo<Stat[]>(() => {
    try {
      const paid = orders.filter(o => o.status === 'paid')
      if (!paid.length) return []

      const now = new Date()
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const acc = new Map<string, Stat>()

      for (const o of paid) {
        const created = new Date(o.createdAt)
        const raw: unknown = (() => { try { return typeof o.details === 'string' ? JSON.parse(o.details) : o.details } catch { return undefined } })()
        const itemsUnknown = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).items : undefined
        const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
        for (const item of items) {
          const rec = item && typeof item === 'object' ? item as Record<string, unknown> : {}
          const idVal = rec.id
          const id = typeof idVal === 'string' ? idVal : (typeof idVal === 'number' || typeof idVal === 'boolean') ? String(idVal) : ''
          if (!id) continue
          const title = typeof rec.title === 'string' ? rec.title : (productTitleById[id] || id)
          const price = typeof rec.price === 'number' ? rec.price : (typeof productPriceById[id] === 'number' ? productPriceById[id] : null)
          const image = productImageById[id] || null
          const stat = acc.get(id) || { id, title, price, image, count: 0, sumToday: 0, sum7d: 0, sum30d: 0 }
          stat.count += 1
          if (typeof price === 'number') {
            if (created >= start30d) stat.sum30d += price
            if (created >= start7d) stat.sum7d += price
            if (created >= startToday) stat.sumToday += price
          }
          stat.title = title
          stat.price = price
          stat.image = image
          acc.set(id, stat)
        }
      }

      const list = Array.from(acc.values())
      list.sort((a, b) => b.count - a.count || (b.sum30d - a.sum30d))
      return list.slice(0, 3)
    } catch {
      return []
    }
  }, [orders, productTitleById, productPriceById, productImageById])

  const revenue = useMemo(() => {
    const paid = orders.filter(o => o.status === 'paid')
    const now = new Date()
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const start28d = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    let totalAll = 0
    let total7d = 0
    let total28d = 0
    for (const o of paid) {
      const created = new Date(o.createdAt)
      const t = getOrderTotal(o) || 0
      totalAll += t
      if (created >= start28d) total28d += t
      if (created >= start7d) total7d += t
    }
    return { total7d, total28d, totalAll }
  }, [orders, productPriceById])

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API}/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update')
      fetchOrders()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update error')
    }
  }

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/orders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete error')
    }
  }

  const openEdit = (o: Order) => {
    setEditing(o)
    setEditForm({
      name: o.name || '',
      telegramDiscord: o.telegramDiscord || '',
      steamProfile: o.steamProfile || '',
      style: o.style || '',
      colorTheme: o.colorTheme || '',
      details: o.details || '',
      status: o.status || '',
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    setError(null)
    try {
      const res = await fetch(`${API}/api/orders/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          telegramDiscord: editForm.telegramDiscord,
          steamProfile: editForm.steamProfile,
          style: editForm.style,
          colorTheme: editForm.colorTheme,
          details: editForm.details,
          status: editForm.status,
        })
      })
      if (!res.ok) throw new Error('Failed to update')
      setEditOpen(false)
      setEditing(null)
      fetchOrders()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update error')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Топ-3 продаваемых товара</h3>
        {topStats.length === 0 ? (
          <div className="text-sm text-slate-400">Нет данных для статистики (нет оплаченных заказов).</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topStats.map(s => {
              const media = (s.image && /\.gif$/i.test(s.image)) ? s.image : (s.image && /\/uploads\//.test(s.image)) ? s.image : '/next.svg'
              return (
                <div key={s.id} className="flex items-center gap-3 rounded border border-[rgba(96,165,250,0.25)] bg-[rgba(255,255,255,0.03)] p-3">
                  <img src={media} alt={s.title} className="w-12 h-12 rounded object-cover border border-[rgba(96,165,250,0.35)]" />
                  <div className="min-w-0">
                    <div className="font-medium truncate" title={s.title}>{s.title}</div>
                    <div className="text-xs text-slate-300">Продаж: {s.count}{typeof s.price === 'number' ? ` • Цена: ${s.price.toFixed(2)}` : ''}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Сегодня: {s.sumToday.toFixed(2)} • 7 дн: {s.sum7d.toFixed(2)} • 30 дн: {s.sum30d.toFixed(2)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Активность</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border border-[rgba(96,165,250,0.25)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-slate-400 text-xs">Доход за 7 дней</div>
            <div className="text-2xl font-semibold mt-1">{revenue.total7d.toFixed(2)}</div>
          </div>
          <div className="rounded border border-[rgba(96,165,250,0.25)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-slate-400 text-xs">Доход за 28 дней</div>
            <div className="text-2xl font-semibold mt-1">{revenue.total28d.toFixed(2)}</div>
          </div>
          <div className="rounded border border-[rgba(96,165,250,0.25)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-slate-400 text-xs">Общий доход</div>
            <div className="text-2xl font-semibold mt-1">{revenue.totalAll.toFixed(2)}</div>
          </div>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Orders</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'paid' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('paid')}
          >
            Paid
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button variant="secondary" size="sm" onClick={fetchOrders}>Refresh</Button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Contact</th>
                <th className="text-left p-2">Profile</th>
                <th className="text-left p-2">Style</th>
                <th className="text-left p-2">Theme</th>
                <th className="text-left p-2">Товары</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(filter === 'paid' ? orders.filter(o => o.status === 'paid') : orders).map(o => (
                <tr key={o.id} className="border-t border-[rgba(96,165,250,0.2)]">
                  <td className="p-2">
                    <span title={o.id} className="font-mono text-xs">
                      {o.id && o.id.length > 12 ? `${o.id.slice(0, 8)}…` : o.id}
                    </span>
                  </td>
                  <td className="p-2">{o.name}</td>
                  <td className="p-2">{o.telegramDiscord}</td>
                  <td className="p-2 truncate max-w-[220px]">{o.steamProfile}</td>
                  <td className="p-2">{o.style}</td>
                  <td className="p-2">{o.colorTheme}</td>
                  <td className="p-2">
                    {(() => {
                      const items = getOrderProducts(o)
                      if (!items.length) return '-'
                      return (
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {items.map(it => (
                            <span
                              key={it.id}
                              title={it.id}
                              className="inline-block px-2 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-xs"
                            >
                              {it.title || it.id}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="p-2">
                    {(() => {
                      const total = getOrderTotal(o)
                      if (total === null) return '-'
                      return total.toFixed(2)
                    })()}
                  </td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => onDelete(o.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit order">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <Input placeholder="Name" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} />
          <Input placeholder="Telegram/Discord" value={editForm.telegramDiscord} onChange={e=>setEditForm(f=>({...f,telegramDiscord:e.target.value}))} />
          <Input className="md:col-span-2" placeholder="Steam Profile" value={editForm.steamProfile} onChange={e=>setEditForm(f=>({...f,steamProfile:e.target.value}))} />
          <Input placeholder="Style" value={editForm.style} onChange={e=>setEditForm(f=>({...f,style:e.target.value}))} />
          <Input placeholder="Theme (colorTheme)" value={editForm.colorTheme} onChange={e=>setEditForm(f=>({...f,colorTheme:e.target.value}))} />
          <textarea className="w-full rounded-md border border-[rgba(96,165,250,0.35)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white placeholder:text-[rgba(255,255,255,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,211,238,0.6)] md:col-span-2" placeholder="Details" value={editForm.details} onChange={e=>setEditForm(f=>({...f,details:e.target.value}))} />
          <Input placeholder="Status" value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveEdit}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}


