"use client"
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function SuccessBody() {
  const params = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'idle'|'capturing'|'done'|'error'>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      if (!token || state !== 'idle') return
      setState('capturing')
      try {
        const res = await fetch(`/api/paypal/orders/${encodeURIComponent(token)}/capture`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setState('error')
          setMessage(typeof data?.error === 'string' ? data.error : 'Capture failed')
          return
        }
        setState('done')
        setMessage('Платёж подтверждён. Можно вернуться в приложение.')
      } catch (e: unknown) {
        setState('error')
        setMessage(e instanceof Error ? e.message : 'Unknown error')
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const badge = state === 'error' ? 'border-red-500/30' : state === 'done' ? 'border-green-500/30' : 'border-cyan-500/30'
  const title = state === 'error' ? 'Ошибка подтверждения' : state === 'done' ? 'Оплата подтверждена' : 'Обработка оплаты'
  const titleColor = state === 'error' ? 'text-red-400' : state === 'done' ? 'text-green-400' : 'text-cyan-400'
  const desc = message || (state === 'capturing' ? 'Пожалуйста, подождите…' : 'Подготавливаем подтверждение…')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className={`p-8 rounded-lg border ${badge} bg-slate-800/50 max-w-md text-center`}>
        <h1 className={`text-2xl font-semibold mb-2 ${titleColor}`}>{title}</h1>
        <p className="text-slate-300">{desc}</p>
        {token && (
          <p className="text-slate-400 text-xs mt-4">PayPal Token: {token}</p>
        )}
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Загрузка…</div>}>
      <SuccessBody />
    </Suspense>
  )
}


