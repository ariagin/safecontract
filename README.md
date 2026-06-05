# SafeContract — SGS World Legaltech

Plataforma de firma electrónica. Art. 5 · Ley 25.506 (Argentina).

## Cómo correr en tu PC

1. Instalá las dependencias: `npm install`
2. Copiá `.env.example` como `.env.local` y completá tus claves.
3. Modo desarrollo: `npm run dev` → abrí http://localhost:3000

## Cómo funciona

- Página principal (`/`): cargás un PDF, marcás la zona de firma, ponés
  los datos del firmante y enviás. Se manda un mail con el link.
- Página del firmante (`/firmar/[id]`): ve el PDF, firma (dibujando,
  tipeando o subiendo imagen) y descarga el documento firmado.

## Variables de entorno (en Vercel y en .env.local)

- `RESEND_API_KEY`: clave de Resend para enviar mails.
- `RESEND_FROM`: remitente (ej: `SafeContract <onboarding@resend.dev>`).
- `NEXT_PUBLIC_BASE_URL`: la URL pública de tu proyecto en Vercel.
