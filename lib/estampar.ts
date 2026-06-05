// lib/estampar.ts
// Motor de estampado de firma. Toma el PDF original + la firma (imagen)
// + la zona donde va, y devuelve el PDF firmado. Conversion de coordenadas
// navegador (mide desde arriba) -> PDF (mide desde abajo) ya resuelta.
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import type { ZonaFirma } from './store';

export async function estamparFirma(
  pdfBase64: string,
  firmaDataUrl: string,
  zona: ZonaFirma
): Promise<{ pdfFirmadoBase64: string; hashFirmado: string }> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64');
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // La firma viene como data URL (data:image/png;base64,....)
  const coma = firmaDataUrl.indexOf(',');
  const meta = firmaDataUrl.substring(0, coma);
  const datos = firmaDataUrl.substring(coma + 1);
  const firmaBytes = Buffer.from(datos, 'base64');

  const esPng = meta.includes('png');
  const firmaImg = esPng
    ? await pdfDoc.embedPng(firmaBytes)
    : await pdfDoc.embedJpg(firmaBytes);

  const paginas = pdfDoc.getPages();
  const idx = Math.min(zona.pagina, paginas.length - 1);
  const pagina = paginas[idx];
  const { width: pw, height: ph } = pagina.getSize();

  // CONVERSION CRITICA: invertir eje Y
  const anchoFirma = zona.wPct * pw;
  const altoFirma = zona.hPct * ph;
  const x = zona.xPct * pw;
  const yDesdeArriba = zona.yPct * ph;
  const y = ph - yDesdeArriba - altoFirma;

  pagina.drawImage(firmaImg, { x, y, width: anchoFirma, height: altoFirma });

  const pdfFirmado = await pdfDoc.save();
  const hashFirmado = crypto
    .createHash('sha256')
    .update(pdfFirmado)
    .digest('hex');

  return {
    pdfFirmadoBase64: Buffer.from(pdfFirmado).toString('base64'),
    hashFirmado,
  };
}

export function hashSha256(base64: string): string {
  return crypto
    .createHash('sha256')
    .update(Buffer.from(base64, 'base64'))
    .digest('hex');
}
