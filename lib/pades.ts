// lib/pades.ts
// Firma criptografica PAdES del PDF usando el certificado de la plataforma
// (SafeContract / SGS World). Embebe la firma y la evidencia del firmante
// (nombre, mail, IP, fecha, dispositivo) en el documento. Esto da una firma
// electronica del Art. 5 Ley 25.506 con integridad verificable: si el PDF se
// modifica luego de firmado, la firma se invalida.
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { P12Signer } from '@signpdf/signer-p12';
import signpdfPkg from '@signpdf/signpdf';

const signpdf = (signpdfPkg as any).default || signpdfPkg;

export interface Evidencia {
  nombre: string;
  email: string;
  ip: string;
  fecha: string;        // ISO
  dispositivo: string;  // user agent
  hashOriginal: string;
}

// Devuelve el certificado .p12 de la plataforma desde la variable de entorno.
function certificadoPlataforma(): Buffer {
  const b64 = process.env.PLATAFORMA_P12_BASE64;
  if (!b64) throw new Error('Falta PLATAFORMA_P12_BASE64');
  return Buffer.from(b64, 'base64');
}

// Firma el PDF con PAdES. Recibe el PDF (con la grafia ya estampada) y la
// evidencia. Devuelve el PDF firmado criptograficamente.
export async function firmarPades(pdfBuffer: Buffer, ev: Evidencia): Promise<Buffer> {
  const p12 = certificadoPlataforma();
  const passphrase = process.env.PLATAFORMA_P12_PASS || 'safecontract';

  // El "reason" y demas campos quedan visibles en el panel de firma de Acrobat.
  const reason = `Firma electronica Art. 5 Ley 25.506 | Firmante: ${ev.nombre} <${ev.email}> | IP: ${ev.ip} | Fecha: ${ev.fecha} | Dispositivo: ${ev.dispositivo}`;

  const conPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: reason.substring(0, 240),
    contactInfo: ev.email,
    name: ev.nombre,
    location: `IP ${ev.ip}`,
    signatureLength: 16384,
  });

  const signer = new P12Signer(p12, { passphrase });
  const firmado = await signpdf.sign(conPlaceholder, signer);
  return firmado as Buffer;
}
