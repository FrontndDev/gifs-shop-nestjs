import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AdminPayload {
  id: string
  username: string
  email?: string
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(password, hashedPassword)
}

export function generateToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Проверяем Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Проверяем cookie - используем правильный способ для Next.js 15
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=')
      acc[name] = value
      return acc
    }, {} as Record<string, string>)
    
    return cookies['admin-token'] || null
  }

  return null
}

export function createAuthCookie(token: string): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const sameSite = isDev ? 'Lax' : 'Strict'
  return `admin-token=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=${sameSite}`
}

export function createLogoutCookie(): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const sameSite = isDev ? 'Lax' : 'Strict'
  return `admin-token=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}`
}
