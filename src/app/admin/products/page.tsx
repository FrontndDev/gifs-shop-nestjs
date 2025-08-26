"use client"
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'

type Product = {
  id: string
  title: string
  price: number
  video: string
  badge: string | null
  showcase?: string | null
  profileColor?: string | null
  theme?: string | null
  createdAt: string
  updatedAt: string
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    price: '',
    video: '',
    badge: '',
    showcase: '',
    profileColor: '',
    theme: '',
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    price: '',
    video: '',
    badge: '',
    showcase: '',
    profileColor: '',
    theme: '',
  })
  const [editUploading, setEditUploading] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/products`)
      const data = await res.json()
      setProducts(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const uploadGif = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    return data.url as string
  }

  const onCreate = async () => {
    setError(null)
    try {
      const res = await fetch(`${API}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          price: Number(form.price),
          video: form.video,
          badge: form.badge || null,
          showcase: form.showcase || undefined,
          profileColor: form.profileColor || undefined,
          theme: form.theme || undefined,
        })
      })
      if (!res.ok) throw new Error('Failed to create')
      setForm({ title: '', price: '', video: '', badge: '', showcase: '', profileColor: '', theme: '' })
      fetchProducts()
    } catch (e: any) {
      setError(e?.message || 'Create error')
    }
  }

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Delete error')
    }
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setEditForm({
      title: p.title || '',
      price: String(p.price ?? ''),
      video: p.video || '',
      badge: p.badge || '',
      showcase: p.showcase || '',
      profileColor: p.profileColor || '',
      theme: p.theme || '',
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    setError(null)
    try {
      const res = await fetch(`${API}/api/products/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          price: editForm.price ? Number(editForm.price) : undefined,
          video: editForm.video,
          badge: editForm.badge || undefined,
          showcase: editForm.showcase || undefined,
          profileColor: editForm.profileColor || undefined,
          theme: editForm.theme || undefined,
        })
      })
      if (!res.ok) throw new Error('Failed to update')
      setEditOpen(false)
      setEditing(null)
      fetchProducts()
    } catch (e: any) {
      setError(e?.message || 'Update error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Products</h2>
        <Button variant="secondary" size="sm" onClick={fetchProducts}>Refresh</Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <Input placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          <Input placeholder="Price" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/gif"
              className="w-full rounded-md border border-[rgba(96,165,250,0.45)] bg-[rgba(20,36,72,0.9)] px-3 py-1.5 text-sm text-white"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setUploading(true)
                  const url = await uploadGif(file)
                  setForm(f => ({ ...f, video: url }))
                } catch (e: any) {
                  setError(e?.message || 'Upload error')
                } finally { setUploading(false) }
              }}
            />
            {form.video && <span className="neon-badge">GIF ready</span>}
          </div>
          <Input placeholder="Badge" value={form.badge} onChange={e=>setForm(f=>({...f,badge:e.target.value}))} />
          <Input placeholder="Showcase" value={form.showcase} onChange={e=>setForm(f=>({...f,showcase:e.target.value}))} />
          <Input placeholder="Profile Color" value={form.profileColor} onChange={e=>setForm(f=>({...f,profileColor:e.target.value}))} />
          <Input placeholder="Theme" value={form.theme} onChange={e=>setForm(f=>({...f,theme:e.target.value}))} />
          <div>
            <Button onClick={onCreate} disabled={uploading}>{uploading ? 'Uploading...' : 'Create'}</Button>
          </div>
        </div>
      </Card>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Badge</th>
                <th className="text-left p-2">Showcase</th>
                <th className="text-left p-2">Profile Color</th>
                <th className="text-left p-2">Theme</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-t border-[rgba(96,165,250,0.2)]">
                  <td className="p-2">{p.title}</td>
                  <td className="p-2">{p.price}</td>
                  <td className="p-2">{p.badge ?? '-'}</td>
                  <td className="p-2">{p.showcase ?? '-'}</td>
                  <td className="p-2">{p.profileColor ?? '-'}</td>
                  <td className="p-2">{p.theme ?? '-'}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(p.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit product">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <Input placeholder="Title" value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} />
          <Input placeholder="Price" value={editForm.price} onChange={e=>setEditForm(f=>({...f,price:e.target.value}))} />
          <div className="md:col-span-2 flex items-center gap-3">
            <input
              type="file"
              accept="image/gif"
              className="w-full rounded-md border border-[rgba(96,165,250,0.45)] bg-[rgba(20,36,72,0.9)] px-3 py-1.5 text-sm text-white"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setEditUploading(true)
                  const url = await uploadGif(file)
                  setEditForm(f => ({ ...f, video: url }))
                } catch (e: any) {
                  setError(e?.message || 'Upload error')
                } finally { setEditUploading(false) }
              }}
            />
            {editForm.video && <span className="neon-badge">GIF ready</span>}
          </div>
          <Input placeholder="Badge" value={editForm.badge} onChange={e=>setEditForm(f=>({...f,badge:e.target.value}))} />
          <Input placeholder="Showcase" value={editForm.showcase} onChange={e=>setEditForm(f=>({...f,showcase:e.target.value}))} />
          <Input placeholder="Profile Color" value={editForm.profileColor} onChange={e=>setEditForm(f=>({...f,profileColor:e.target.value}))} />
          <Input placeholder="Theme" value={editForm.theme} onChange={e=>setEditForm(f=>({...f,theme:e.target.value}))} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveEdit} disabled={editUploading}>{editUploading ? 'Uploading...' : 'Save'}</Button>
        </div>
      </Modal>
    </div>
  )
}


