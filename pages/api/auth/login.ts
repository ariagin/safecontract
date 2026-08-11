// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { validarCredenciales, crearSesionCookie, COOKIE_NAME } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, clave } = req.body || {};
  if (!usuario || !clave) {
    return res.status(400).json({ error: 'Ingresá usuario y clave.' });
  }

  if (!validarCredenciales(String(usuario), String(clave))) {
    return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  }

  let token: string;
  try {
    token = await crearSesionCookie(String(usuario));
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Error al crear la sesión.' });
  }

  const maxAgeSeg = 12 * 60 * 60; // 12 horas
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeg}${secure}`
  );

  return res.status(200).json({ ok: true });
}
