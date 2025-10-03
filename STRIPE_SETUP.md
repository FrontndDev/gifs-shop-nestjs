# Настройка Stripe

## Переменные окружения

Добавьте следующие переменные в ваш `.env` файл:

```env
# Stripe API ключи
STRIPE_SECRET_KEY=sk_test_... # или sk_live_... для продакшена
STRIPE_PUBLISHABLE_KEY=pk_test_... # или pk_live_... для продакшена

# Webhook secret (получите из Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...

# Опционально: тестовый режим
STRIPE_TEST_MODE=1 # для локальной разработки
STRIPE_TEST_INSTANT_SUCCESS=1 # для мгновенного успеха в тестах
```

## Получение ключей

1. Зарегистрируйтесь на [stripe.com](https://stripe.com)
2. Перейдите в Dashboard → Developers → API keys
3. Скопируйте:
   - **Publishable key** (начинается с `pk_test_` или `pk_live_`)
   - **Secret key** (начинается с `sk_test_` или `sk_live_`)

## Настройка Webhook

1. В Stripe Dashboard перейдите в Developers → Webhooks
2. Нажмите "Add endpoint"
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. Выберите события:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `checkout.session.completed`
5. Скопируйте **Signing secret** (начинается с `whsec_`)

## API Endpoints

### Создание платежа
```
POST /api/stripe/payments/create
```

**Тело запроса:**
```json
{
  "amount": 10.00,
  "currency": "USD",
  "description": "Order #123",
  "returnUrl": "https://yoursite.com/success",
  "metadata": {
    "orderId": "order_123"
  }
}
```

**Ответ:**
```json
{
  "id": "pi_...",
  "status": "requires_payment_method",
  "paid": false,
  "amount": {
    "value": "10.00",
    "currency": "USD"
  },
  "confirmation": {
    "type": "redirect",
    "return_url": "https://yoursite.com/success",
    "checkout_url": "https://checkout.stripe.com/..."
  },
  "stripe_payment_intent_id": "pi_...",
  "stripe_session_id": "cs_..."
}
```

### Проверка статуса платежа
```
GET /api/stripe/payments/{payment_id}/status
```

**Ответ:**
```json
{
  "id": "pi_...",
  "status": "succeeded",
  "paid": true,
  "amount": {
    "value": "10.00",
    "currency": "USD"
  },
  "description": "Order #123",
  "metadata": {
    "orderId": "order_123"
  }
}
```

## Поддерживаемые валюты

Stripe поддерживает множество валют. Основные:
- USD (доллары США)
- EUR (евро)
- GBP (фунты стерлингов)
- RUB (рубли) - только для российских аккаунтов
- JPY (йены) - без копеек
- KRW (воны) - без копеек

## Тестирование

Для тестирования используйте тестовые карты Stripe:
- **Успешная оплата:** `4242424242424242`
- **Отклоненная карта:** `4000000000000002`
- **Требует аутентификации:** `4000002500003155`

## Безопасность

- Никогда не передавайте `STRIPE_SECRET_KEY` на фронтенд
- Всегда проверяйте webhook подписи
- Используйте HTTPS в продакшене
- Регулярно ротируйте ключи
