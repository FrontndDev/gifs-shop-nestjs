import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OrderPayload = {
  name: string
  telegramDiscord: string
  steamProfile: string
  style: string
  colorTheme: string
  details: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<OrderPayload>
    const required = ['name','telegramDiscord','steamProfile','style','colorTheme','details'] as const
    for (const key of required) {
      if (!body[key] || String(body[key]).trim().length === 0) {
        return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 })
      }
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' }, { status: 500 })
    }

    const text = [
      '🆕 Новый заказ',
      `👤 Имя: ${body.name}`,
      `💬 TG/Discord: ${body.telegramDiscord}`,
      `🎮 Steam: ${body.steamProfile}`,
      `🎨 Стиль: ${body.style}`,
      `🌈 Цветовая гамма: ${body.colorTheme}`,
      '— — —',
      `${body.details}`,
    ].join('\n')

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const res = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.ok === false) {
      return NextResponse.json({ error: 'Telegram error', details: data }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram order error:', error)
    return NextResponse.json({ error: 'Failed to send to Telegram' }, { status: 500 })
  }
}


