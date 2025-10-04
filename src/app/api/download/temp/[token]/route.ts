import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    console.log('Download request for token:', token)

    // Находим временную ссылку по токену
    const downloadLink = await prisma.downloadLink.findUnique({
      where: { token }
    })

    if (!downloadLink) {
      console.log('Download link not found for token:', token)
      return NextResponse.json({ error: 'Download link not found' }, { status: 404 })
    }
    
    console.log('Found download link:', downloadLink)

    // Проверяем, не истекла ли ссылка
    if (new Date() > downloadLink.expiresAt) {
      return NextResponse.json({ error: 'Download link has expired' }, { status: 410 })
    }

    // Убираем проверку одноразовости - ссылки действуют 24 часа
    // if (downloadLink.isUsed) {
    //   return NextResponse.json({ error: 'Download link has already been used' }, { status: 410 })
    // }

    // Дополнительная проверка: заказ все еще оплачен?
    const order = await prisma.order.findUnique({
      where: { id: downloadLink.orderId }
    })

    if (!order || order.status !== 'paid') {
      return NextResponse.json({ error: 'Order is no longer valid' }, { status: 403 })
    }

    // Проверяем, что файл существует
    const privateUploadsDir = path.join(process.cwd(), 'private-uploads')
    const filePath = path.join(privateUploadsDir, downloadLink.filename)
    console.log('Looking for file at:', filePath)

    try {
      await fs.access(filePath)
      console.log('File exists, proceeding with download')
    } catch (error) {
      console.log('File access error:', error)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Убираем отметку об использовании - ссылки многоразовые
    // await prisma.downloadLink.update({
    //   where: { id: downloadLink.id },
    //   data: { isUsed: true }
    // })

    // Читаем файл и отправляем его
    console.log('Reading file...')
    const fileBuffer = await fs.readFile(filePath)
    const fileStats = await fs.stat(filePath)
    console.log('File read successfully, size:', fileStats.size)

    // Определяем MIME-тип по расширению
    const ext = path.extname(downloadLink.filename).toLowerCase()
    let mimeType = 'application/octet-stream'
    
    const mimeTypes: Record<string, string> = {
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.psd': 'image/vnd.adobe.photoshop',
      '.ai': 'application/postscript',
      '.eps': 'application/postscript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    }

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext]
    }

    // Получаем оригинальное имя файла
    const product = await prisma.product.findUnique({
      where: { id: downloadLink.productId },
      select: { title: true }
    })

    // Создаем безопасное имя файла без русских символов
    let originalFilename = downloadLink.filename
    if (product?.title) {
      // Заменяем русские символы на латинские или используем безопасное имя
      const safeTitle = product.title.replace(/[^a-zA-Z0-9._-]/g, '_')
      originalFilename = `${safeTitle}${ext}`
    }
    
    // Кодируем имя файла для безопасной передачи в HTTP заголовках
    const encodedFilename = encodeURIComponent(originalFilename)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileStats.size.toString(),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Temp download error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
