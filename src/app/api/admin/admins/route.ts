import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

// Проверка авторизации админа
async function checkAdminAuth(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return { error: 'No token provided', status: 401 }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return { error: 'Invalid token', status: 401 }
  }

  // Проверяем, что админ существует и активен
  const admin = await prisma.admin.findUnique({
    where: { id: payload.id }
  })

  if (!admin || !admin.isActive) {
    return { error: 'Admin not found or inactive', status: 401 }
  }

  return { admin }
}

// GET /api/admin/admins - получить всех админов
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(admins)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}

// POST /api/admin/admins - создать нового админа
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { username, password, email } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Проверяем, не существует ли уже такой username
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Проверяем email, если он указан
    if (email) {
      const existingEmail = await prisma.admin.findUnique({
        where: { email }
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Создаем нового админа
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashPassword(password),
        email: email || null
      },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(admin, { status: 201 })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    )
  }
}
