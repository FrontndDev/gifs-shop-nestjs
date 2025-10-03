/**
 * Генерирует slug из строки
 * Пример: "Super Duper Anime 2025" -> "super-duper-anime-2025"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Заменяем пробелы и специальные символы на дефисы
    .replace(/[\s\W-]+/g, '-')
    // Удаляем дефисы в начале и конце
    .replace(/^-+|-+$/g, '')
    // Удаляем множественные дефисы
    .replace(/-+/g, '-')
}

/**
 * Проверяет, является ли строка валидным slug
 */
export function isValidSlug(slug: string): boolean {
  // Slug должен содержать только строчные буквы, цифры и дефисы
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0
}

/**
 * Создает уникальный slug, добавляя суффикс если нужно
 */
export async function createUniqueSlug(
  baseSlug: string,
  existingSlugs: string[],
  maxAttempts: number = 100
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (existingSlugs.includes(slug) && counter <= maxAttempts) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  if (counter > maxAttempts) {
    // Если не удалось создать уникальный slug, добавляем timestamp
    slug = `${baseSlug}-${Date.now()}`
  }

  return slug
}
