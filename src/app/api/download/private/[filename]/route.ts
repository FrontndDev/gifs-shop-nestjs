import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId')
    const productId = url.searchParams.get('productId')

    if (!orderId || !productId) {
      return NextResponse.json({ error: 'Order ID and Product ID are required' }, { status: 400 })
    }

    // Проверяем, что заказ существует и оплачен
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Order is not paid' }, { status: 403 })
    }

    // Проверяем, что продукт существует и имеет приватный файл
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Проверяем, что файл соответствует оригинальному файлу продукта
    if (product.original !== filename) {
      return NextResponse.json({ error: 'File access denied' }, { status: 403 })
    }

    // Проверяем, что заказ содержит этот продукт
    try {
      const detailsRaw: unknown = typeof order.details === 'string' ? JSON.parse(order.details) : order.details
      const detailsObj = (detailsRaw && typeof detailsRaw === 'object') ? (detailsRaw as Record<string, unknown>) : undefined
      const itemsUnknown = detailsObj?.items
      const items = Array.isArray(itemsUnknown) ? itemsUnknown as Array<unknown> : []
      
      const hasProduct = items.some((item) => {
        const obj = (item && typeof item === 'object') ? (item as Record<string, unknown>) : undefined
        const val = obj?.id
        return val === productId
      })

      if (!hasProduct) {
        return NextResponse.json({ error: 'Product not in this order' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid order details' }, { status: 400 })
    }

    // Проверяем, что файл существует
    const privateUploadsDir = path.join(process.cwd(), 'private-uploads')
    const filePath = path.join(privateUploadsDir, filename)

    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Читаем файл и отправляем его
    const fileBuffer = await fs.readFile(filePath)
    const fileStats = await fs.stat(filePath)

    // Определяем MIME-тип по расширению
    const ext = path.extname(filename).toLowerCase()
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

    // Получаем оригинальное имя файла из продукта или используем filename
    const originalFilename = filename // Можно добавить поле в БД для оригинального имени

    return new NextResponse(fileBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileStats.size.toString(),
        'Content-Disposition': `attachment; filename="${originalFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Private download error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
