# Пример интеграции Stripe

## Фронтенд интеграция

### 1. Создание платежа

```javascript
// Создание Stripe платежа
async function createStripePayment(orderData) {
  const response = await fetch('/api/stripe/payments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: orderData.total,
      currency: 'USD',
      description: `Order #${orderData.id}`,
      returnUrl: `${window.location.origin}/success`,
      metadata: {
        orderId: orderData.id
      }
    })
  });

  const payment = await response.json();
  
  if (payment.confirmation?.checkout_url) {
    // Перенаправляем на Stripe Checkout
    window.location.href = payment.confirmation.checkout_url;
  }
  
  return payment;
}
```

### 2. Проверка статуса платежа

```javascript
// Проверка статуса после возврата с Stripe
async function checkPaymentStatus(paymentId) {
  const response = await fetch(`/api/stripe/payments/${paymentId}/status`);
  const status = await response.json();
  
  if (status.paid) {
    // Платеж успешен
    showSuccessMessage();
  } else {
    // Платеж не завершен
    showErrorMessage();
  }
  
  return status;
}
```

### 3. Обработка возврата с Stripe

```javascript
// На странице success
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

if (sessionId) {
  checkPaymentStatus(sessionId);
}
```

## Выбор платежной системы

### Пример селектора платежных систем

```javascript
function selectPaymentMethod(method) {
  switch (method) {
    case 'yookassa':
      return createYooKassaPayment(orderData);
    case 'paypal':
      return createPayPalPayment(orderData);
    case 'stripe':
      return createStripePayment(orderData);
    default:
      throw new Error('Unknown payment method');
  }
}

// Использование
const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
await selectPaymentMethod(paymentMethod);
```

## Бэкенд интеграция

### Обновление существующих API

Можно создать универсальный endpoint для всех платежных систем:

```typescript
// /api/payments/create-universal/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, ...paymentData } = body;
  
  switch (provider) {
    case 'yookassa':
      return createYooKassaPayment(paymentData);
    case 'paypal':
      return createPayPalPayment(paymentData);
    case 'stripe':
      return createStripePayment(paymentData);
    default:
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  }
}
```

## Конфигурация для разных окружений

### .env.local (разработка)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TEST_MODE=1
```

### .env.production (продакшен)
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Мониторинг и логирование

### Добавление логирования

```typescript
// В webhook handler
console.log('Stripe webhook received:', {
  type: event.type,
  paymentId: event.data.object.id,
  orderId: event.data.object.metadata?.orderId,
  timestamp: new Date().toISOString()
});
```

### Обработка ошибок

```typescript
try {
  const payment = await createStripePayment(data);
  return payment;
} catch (error) {
  console.error('Stripe payment creation failed:', error);
  
  // Fallback на другую платежную систему
  if (error.message.includes('rate_limit')) {
    return await createYooKassaPayment(data);
  }
  
  throw error;
}
```
