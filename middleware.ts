// middleware.ts
// Protege el panel del emisor (estudio). Las páginas de firma pública
// (/firmar/[id]) y sus APIs asociadas quedan afuera, para que el firmante
// externo pueda acceder sin usuario ni clave.

import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verificarSesionCookie } from '@/lib/auth';

export const config = {
  matcher: ['/', '/api/crear-solicitud'],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const sesion = await verificarSesionCookie(cookie);

  if (sesion) {
    return NextResponse.next();
  }

  // Las rutas de API devuelven 401 en vez de redirigir, para que el fetch del cliente lo maneje.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado. Iniciá sesión.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
