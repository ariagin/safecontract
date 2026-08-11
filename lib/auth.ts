// lib/auth.ts
// Autenticación simple para el panel del estudio (emisor).
// Usa Web Crypto (crypto.subtle) para que funcione tanto en el middleware (Edge)
// como en las rutas de API (Node).

export const COOKIE_NAME = 'sc_session';
const DURATION_MS = 12 * 60 * 60 * 1000; // 12 horas

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Crea el valor de la cookie de sesión firmada (usuario + expiración + firma HMAC). */
export async function crearSesionCookie(usuario: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Falta configurar AUTH_SECRET en las variables de entorno');

  const payload = JSON.stringify({ u: usuario, exp: Date.now() + DURATION_MS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));

  const key = await getKey(secret);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuffer));

  return `${payloadB64}.${sigB64}`;
}

/** Verifica una cookie de sesión. Devuelve el usuario si es válida y no expiró, o null. */
export async function verificarSesionCookie(valor: string | undefined | null): Promise<{ usuario: string } | null> {
  if (!valor) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const partes = valor.split('.');
  if (partes.length !== 2) return null;
  const [payloadB64, sigB64] = partes;

  try {
    const key = await getKey(secret);
    const sigBytes = base64UrlDecode(sigB64);
    const valido = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payloadB64)
    );
    if (!valido) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (!payload.exp || Date.now() > payload.exp) return null;

    return { usuario: payload.u };
  } catch {
    return null;
  }
}

/** Valida usuario/clave contra la variable de entorno USUARIOS_ESTUDIO (formato usuario:clave,usuario2:clave2). */
export function validarCredenciales(usuario: string, clave: string): boolean {
  const raw = process.env.USUARIOS_ESTUDIO || '';
  const pares = raw.split(',').map((p) => p.trim()).filter(Boolean);

  for (const par of pares) {
    const idx = par.indexOf(':');
    if (idx === -1) continue;
    const u = par.slice(0, idx).trim();
    const c = par.slice(idx + 1).trim();
    if (u === usuario && c === clave) return true;
  }
  return false;
}
