import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 500 * 1024 * 1024 // 500MB для приватных файлов (архивы, большие файлы)

// Разрешенные типы файлов для приватных загрузок
const ALLOWED_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.tar', '.gz', // архивы
  '.pdf', '.doc', '.docx', '.txt', '.rtf', // документы
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', // изображения
  '.mp4', '.avi', '.mov', '.wmv', '.mkv', // видео
  '.mp3', '.wav', '.flac', '.aac', // аудио
  '.psd', '.ai', '.eps', '.sketch', // дизайн файлы
  '.exe', '.msi', '.dmg', '.pkg', // исполняемые файлы
  '.json', '.xml', '.csv', '.xlsx', '.xls' // данные
]

function getAllowedExtensions(): string[] {
  return ALLOWED_EXTENSIONS
}

function isAllowedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return getAllowedExtensions().includes(ext)
}

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'archive'
  if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext)) return 'document'
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext)) return 'image'
  if (['.mp4', '.avi', '.mov', '.wmv', '.mkv'].includes(ext)) return 'video'
  if (['.mp3', '.wav', '.flac', '.aac'].includes(ext)) return 'audio'
  if (['.psd', '.ai', '.eps', '.sketch'].includes(ext)) return 'design'
  if (['.exe', '.msi', '.dmg', '.pkg'].includes(ext)) return 'executable'
  if (['.json', '.xml', '.csv', '.xlsx', '.xls'].includes(ext)) return 'data'
  return 'other'
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File is required (field name: file)' }, { status: 400 })
    }

    // Проверяем расширение файла
    if (!isAllowedFile(file.name)) {
      const allowedExts = getAllowedExtensions().join(', ')
      return NextResponse.json({ 
        error: `File type not allowed. Allowed extensions: ${allowedExts}` 
      }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${MAX_SIZE_BYTES / (1024 * 1024)}MB` }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Создаем отдельную папку для приватных файлов
    const privateUploadsDir = path.join(process.cwd(), 'private-uploads')
    await fs.mkdir(privateUploadsDir, { recursive: true })

    // Генерируем уникальное имя файла с сохранением расширения
    const fileExt = path.extname(file.name)
    const filename = `${randomUUID()}${fileExt}`
    const filePath = path.join(privateUploadsDir, filename)
    await fs.writeFile(filePath, buffer)

    const fileType = getFileType(file.name)
    const fileSize = file.size
    const originalName = file.name

    // Возвращаем информацию о файле (без публичного URL)
    return NextResponse.json({ 
      filename,
      fileType,
      fileSize,
      originalName,
      message: 'Private file uploaded successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Private upload error:', error)
    return NextResponse.json({ error: 'Failed to upload private file' }, { status: 500 })
  }
}
