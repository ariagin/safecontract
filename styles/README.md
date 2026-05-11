# SafeContract — SGS World Legaltech

Plataforma de firma electrónica. Ley 25.506 Art. 5 — República Argentina.

## Stack
- Next.js 14 (React + Node.js serverless)
- pdf-lib (procesamiento de PDF)
- Resend (envío de mails)
- Vercel (hosting)

## Deploy en Vercel

1. Subir este repositorio a GitHub
2. Importar en vercel.com
3. Agregar variables de entorno:
   - RESEND_API_KEY
   - BASE_URL (la URL de Vercel, ej: https://safecontract.vercel.app)
   - FROM_EMAIL (ej: SafeContract <noreply@tudominio.com>)
4. Deploy automático
