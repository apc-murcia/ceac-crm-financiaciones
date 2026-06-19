import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  // Rutas públicas
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Sin sesión → login
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // force_change → obliga a cambiar contraseña antes de acceder al dashboard
  if (
    token?.force_change &&
    pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/dashboard/change-password')
  ) {
    return NextResponse.redirect(new URL('/dashboard/change-password', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
