import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, verifyToken, hashPassword } from '@/lib/auth'

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

  const admin = await prisma.admin.findUnique({
    where: { id: payload.id }
  })

  if (!admin || !admin.isActive) {
    return { error: 'Admin not found or inactive', status: 401 }
  }

  return { admin }
}

// GET /api/admin/admins/[id] - получить админа по ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(admin)
  } catch (error) {
    console.error('Error fetching admin:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/admins/[id] - обновить админа
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { username, email, isActive, password } = await request.json()

    // Проверяем, существует ли админ
    const existingAdmin = await prisma.admin.findUnique({
      where: { id }
    })

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Проверяем, не занят ли username другим админом
    if (username && username !== existingAdmin.username) {
      const usernameExists = await prisma.admin.findUnique({
        where: { username }
      })

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // Проверяем email, если он указан
    if (email && email !== existingAdmin.email) {
      const emailExists = await prisma.admin.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Подготавливаем данные для обновления
    const updateData: {
      username?: string;
      email?: string;
      isActive?: boolean;
      password?: string;
    } = {}
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) updateData.password = hashPassword(password)

    const admin = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(admin)
  } catch (error) {
    console.error('Error updating admin:', error)
    return NextResponse.json(
      { error: 'Failed to update admin' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/admins/[id] - деактивировать админа
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const authResult = await checkAdminAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // Проверяем, существует ли админ
    const existingAdmin = await prisma.admin.findUnique({
      where: { id }
    })

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Нельзя удалить самого себя
    if (id === authResult.admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    // Деактивируем админа вместо удаления
    await prisma.admin.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json(
      { error: 'Failed to delete admin' },
      { status: 500 }
    )
  }
}
