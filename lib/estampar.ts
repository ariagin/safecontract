// lib/estampar.ts
// Motor de estampado de firma. Toma el PDF original + la firma (imagen)
// + la zona donde va, y devuelve el PDF firmado. Conversion de coordenadas
// navegador (mide desde arriba) -> PDF (mide desde abajo) ya resuelta.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import crypto from 'crypto';
import type { ZonaFirma } from './store';

export async function estamparFirma(
  pdfBase64: string,
  firmaDataUrl: string,
  zona: ZonaFirma,
  nombreFirmante?: string
): Promise<{ pdfEstampadoBuffer: Buffer; pdfFirmadoBase64: string; hashFirmado: string }> {
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
  const anchoZona = zona.wPct * pw;
  const altoZona = zona.hPct * ph;
  const x = zona.xPct * pw;
  const yDesdeArriba = zona.yPct * ph;
  const yZona = ph - yDesdeArriba - altoZona;

  // Ajustar la firma DENTRO del recuadro sin deformarla (mantener proporcion).
  // Se calcula la escala que hace entrar la imagen completa en la zona, y se
  // centra. Asi una firma vertical, horizontal o cuadrada se ve siempre bien.
  const dims = firmaImg.scale(1);
  const escala = Math.min(anchoZona / dims.width, altoZona / dims.height);
  const anchoFirma = dims.width * escala;
  const altoFirma = dims.height * escala;
  const x2 = x + (anchoZona - anchoFirma) / 2;   // centrado horizontal
  const y2 = yZona + (altoZona - altoFirma) / 2;  // centrado vertical

  pagina.drawImage(firmaImg, { x: x2, y: y2, width: anchoFirma, height: altoFirma });

  // Texto con nombre del firmante + leyenda legal, DEBAJO de la grafia
  // (si no hay lugar abajo, lo ubica arriba para no salirse de la pagina).
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fuenteBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const nombre = (nombreFirmante || '').toUpperCase();
  const leyenda1 = 'Firmado Electronicamente con SAFECONTRACT';
  const leyenda2 = 'ART. 5 LEY 25.506';

  const altoTexto = 30;        // alto que ocupan las 3 lineas
  const margenTexto = 4;       // separacion respecto de la firma
  const boxX = x;              // alineado con la firma (mismo X de la zona)

  // ¿Hay lugar debajo de la firma? Si la firma esta muy al pie, va arriba.
  const hayLugarAbajo = (yZona - margenTexto - altoTexto) > 8;
  // tope superior del bloque de texto
  let ty: number;
  if (hayLugarAbajo) {
    ty = yZona - margenTexto - 2;            // justo debajo de la zona
  } else {
    ty = yZona + altoZona + margenTexto + altoTexto - 2; // arriba de la zona
  }

  if (nombre) {
    pagina.drawText(nombre.substring(0, 40), { x: boxX, y: ty, size: 8, font: fuenteBold, color: rgb(0.03, 0.12, 0.24) });
    ty -= 11;
  }
  pagina.drawText(leyenda1, { x: boxX, y: ty, size: 6.5, font: fuente, color: rgb(0.2, 0.3, 0.4) });
  ty -= 9;
  pagina.drawText(leyenda2, { x: boxX, y: ty, size: 6.5, font: fuenteBold, color: rgb(0.0, 0.4, 0.6) });

  const pdfFirmado = await pdfDoc.save({ useObjectStreams: false });
  const pdfEstampadoBuffer = Buffer.from(pdfFirmado);
  const hashFirmado = crypto
    .createHash('sha256')
    .update(pdfFirmado)
    .digest('hex');

  return {
    pdfEstampadoBuffer,
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
