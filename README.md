# Steam Profile Backend API

Бэкэнд на Next.js для управления продуктами и заказами оформления профилей Steam.

## Структура базы данных

### Таблица Products
- `id` - уникальный идентификатор
- `title` - название продукта
- `price` - стоимость продукта
- `video` - путь к gif/видео файлу
- `badge` - опциональный бейдж (Хит продаж, Новинка, etc.)
- `createdAt` - дата создания
- `updatedAt` - дата обновления

### Таблица Orders
- `id` - уникальный идентификатор
- `name` - имя заказчика
- `telegramDiscord` - Telegram/Discord username
- `steamProfile` - ссылка на профиль Steam
- `style` - стиль оформления
- `colorTheme` - цветовая гамма
- `details` - детали оформления
- `status` - статус заказа (pending, in_progress, completed, etc.)
- `createdAt` - дата создания
- `updatedAt` - дата обновления

## API Endpoints

### Products
- `GET /api/products` - получить все продукты
- `POST /api/products` - создать новый продукт
- `GET /api/products/[id]` - получить продукт по ID
- `PUT /api/products/[id]` - обновить продукт
- `DELETE /api/products/[id]` - удалить продукт

### Orders
- `GET /api/orders` - получить все заказы
- `POST /api/orders` - создать новый заказ
- `GET /api/orders/[id]` - получить заказ по ID
- `PUT /api/orders/[id]` - обновить заказ
- `DELETE /api/orders/[id]` - удалить заказ

### Дополнительные endpoints
- `POST /api/seed` - заполнить базу тестовыми данными

## Технологии

- **Next.js 15** - React фреймворк
- **TypeScript** - типизированный JavaScript
- **Prisma** - ORM для работы с базой данных
- **SQLite** - база данных
- **Tailwind CSS** - CSS фреймворк

## Установка и запуск

1. Установить зависимости:
```bash
npm install
```

2. Настроить базу данных:
```bash
npx prisma generate
npx prisma db push
```

3. Заполнить базу тестовыми данными:
```bash
curl -X POST http://localhost:3000/api/seed
```

4. Запустить сервер разработки:
```bash
npm run dev
```

Сервер будет доступен по адресу http://localhost:3000

## Примеры использования API

### Создание нового заказа
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Петров",
    "telegramDiscord": "@ivan_petrov",
    "steamProfile": "https://steamcommunity.com/id/ivanpetrov",
    "style": "cyberpunk",
    "colorTheme": "blue",
    "details": "Хочу оформление в стиле Cyberpunk 2077"
  }'
```

### Создание нового продукта
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Новая анимированная иллюстрация",
    "price": 12.0,
    "video": "/new-animation.mp4",
    "badge": "Новинка"
  }'
```

## CORS

API настроен для работы с любыми доменами (CORS включен для всех origins).
