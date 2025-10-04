interface TelegramNotificationData {
  productName: string
  price: number
  currency: string
  email?: string
  telegramDiscord?: string
  steamProfile?: string
  orderId: string
  paymentProvider: string
}

export async function sendTelegramNotification(data: TelegramNotificationData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    console.log('Telegram notification attempt:', {
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
      botTokenLength: botToken?.length,
      chatId: chatId
    })

    if (!botToken || !chatId) {
      console.warn('Telegram bot token or chat ID not configured', {
        botToken: !!botToken,
        chatId: !!chatId
      })
      return
    }

    // Форматируем сообщение
    const message = formatNotificationMessage(data)
    console.log('Formatted message:', message)

    // Отправляем сообщение в Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    console.log('Telegram API response status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Failed to send Telegram notification:', errorData)
      return
    }

    console.log('Telegram notification sent successfully')
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
}

function formatNotificationMessage(data: TelegramNotificationData): string {
  const { productName, price, currency, email, telegramDiscord, steamProfile, orderId, paymentProvider } = data

  // Форматируем цену в зависимости от валюты
  let priceText = ''
  if (currency === 'USD') {
    priceText = `$${price.toFixed(2)}`
  } else if (currency === 'RUB') {
    priceText = `${price.toFixed(0)}₽`
  } else {
    priceText = `${price} ${currency}`
  }

  // Создаем сообщение
  let message = `🛒 *Новая покупка!*\n\n`
  message += `* Товар:* ${productName}\n`
  message += `* Куплен:* ${priceText}\n`
  
  if (email) {
    message += `* Почта:* ${email}\n`
  }
  
  if (telegramDiscord) {
    message += `* Telegram/Discord:* ${telegramDiscord}\n`
  }
  
  if (steamProfile) {
    message += `* Steam профиль:* ${steamProfile}\n`
  }
  
  message += `* Способ оплаты:* ${paymentProvider.toUpperCase()}\n`
  message += `* ID заказа:* \`${orderId}\``

  return message
}

export async function sendTelegramError(error: string, context?: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.warn('Telegram bot token or chat ID not configured')
      return
    }

    let message = `🚨 *Ошибка в системе*\n\n`
    message += `* Ошибка:* ${error}\n`
    
    if (context) {
      message += `* Контекст:* ${context}\n`
    }
    
    message += `* Время:* ${new Date().toLocaleString('ru-RU')}`

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Failed to send Telegram error notification:', errorData)
    }
  } catch (error) {
    console.error('Error sending Telegram error notification:', error)
  }
}
