import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
])

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const isDev = process.env.NODE_ENV !== 'production'
  const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  const isAllowedOrigin = allowedOrigins.has(origin) || (isDev && isLocalhostOrigin)

  // Проверяем, является ли это админ-роутом
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isAdminApiRoute = request.nextUrl.pathname.startsWith('/api/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'
  
  // Проверяем авторизацию для админ-роутов (только для страниц, не для API и не для страницы входа)
  if (isAdminRoute && !isAdminApiRoute && !isLoginPage) {
    const token = getTokenFromRequest(request)
    
    console.log('Middleware debug:', {
      pathname: request.nextUrl.pathname,
      hasToken: !!token,
      tokenStart: token ? token.substring(0, 20) + '...' : 'none',
      cookieHeader: request.headers.get('cookie')?.substring(0, 100) + '...'
    })
    
    if (!token) {
      console.log('No token, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.log('Invalid token, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    console.log('Token valid, allowing access')
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const requestHeaders = request.headers.get('access-control-request-headers') || 'Content-Type'
    const response = new NextResponse(null, { status: 204 })
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Vary', 'Origin')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', requestHeaders)
    response.headers.set('Access-Control-Max-Age', '86400')
    return response
  }

  const response = NextResponse.next()
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  }
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}


