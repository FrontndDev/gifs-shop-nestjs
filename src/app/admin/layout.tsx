'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface AdminUser {
  id: string
  username: string
  email?: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.admin)
        } else {
          // Если не авторизован, перенаправляем на страницу входа
          router.replace('/admin/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.replace('/admin/login')
      } finally {
        setLoading(false)
      }
    }
    
    // Проверяем, не находимся ли мы уже на странице входа
    if (window.location.pathname === '/admin/login') {
      setLoading(false)
      return
    }
    
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid grid-rows-[56px_1fr]">
      <header className="neon-header h-[56px] flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-5 rounded-sm bg-[var(--brand)]"></span>
          <span className="text-lg font-semibold tracking-wide">AERODESIGN Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm">
            <a className="neon-link" href="/admin/products">Products</a>
            <a className="neon-link" href="/admin/orders">Orders</a>
          </nav>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {user.username}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
              >
                Выйти
              </Button>
            </div>
          )}
        </div>
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


