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

const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => { fetchOrders() }, [])

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
        <Button variant="secondary" size="sm" onClick={fetchOrders}>Refresh</Button>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Contact</th>
                <th className="text-left p-2">Profile</th>
                <th className="text-left p-2">Style</th>
                <th className="text-left p-2">Theme</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-[rgba(96,165,250,0.2)]">
                  <td className="p-2">{o.name}</td>
                  <td className="p-2">{o.telegramDiscord}</td>
                  <td className="p-2 truncate max-w-[220px]">{o.steamProfile}</td>
                  <td className="p-2">{o.style}</td>
                  <td className="p-2">{o.colorTheme}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => updateStatus(o.id, 'pending')}>Pending</Button>
                    <Button variant="secondary" size="sm" onClick={() => updateStatus(o.id, 'in_progress')}>In progress</Button>
                    <Button variant="primary" size="sm" onClick={() => updateStatus(o.id, 'done')}>Done</Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(o)}>Edit</Button>
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


