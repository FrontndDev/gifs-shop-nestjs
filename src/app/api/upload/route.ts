import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100MB для MP4

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File is required (field name: file)' }, { status: 400 })
    }

    // Проверяем MIME-тип или расширение файла
    const isMP4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')
    
    if (!isMP4) {
      return NextResponse.json({ error: 'Only MP4 files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 100MB' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const filename = `${randomUUID()}.mp4`
    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, buffer)

    const url = `/uploads/${filename}`
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const forwardedHost = request.headers.get('x-forwarded-host')
    const effectiveOrigin = forwardedHost
      ? `${forwardedProto || 'https'}://${forwardedHost}`
      : request.nextUrl.origin
    const absoluteUrl = `${effectiveOrigin}${url}`
    return NextResponse.json({ url, absoluteUrl }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}


