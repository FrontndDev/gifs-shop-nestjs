"use client"
import { useEffect, useState } from 'react'
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
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [productTitleById, setProductTitleById] = useState<Record<string, string>>({})
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
      for (const p of list) {
        if (p && typeof p.id === 'string' && typeof p.title === 'string') {
          map[p.id] = p.title
        }
      }
      setProductTitleById(map)
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


