// pages/firmar/[id].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import CapturaFirma from '@/components/CapturaFirma';

const VisorPdf = dynamic(() => import('@/components/VisorPdf'), { ssr: false });

export default function Firmar() {
  const router = useRouter();
  const { id } = router.query;
  const [solicitud, setSolicitud] = useState<any>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [firma, setFirma] = useState<string | null>(null);
  const [tipoFirma, setTipoFirma] = useState('manuscrita');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [firmado, setFirmado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/solicitud/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        setSolicitud(data);
        if (data.estado === 'firmado') setFirmado(true);
      })
      .catch(() => setNoEncontrado(true));
  }, [id]);

  const firmar = async () => {
    if (!firma) { setError('Primero completá tu firma.'); return; }
    setError(''); setCargando(true);
    try {
      const r = await fetch('/api/firmar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, firmaDataUrl: firma, tipoFirma }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setResultado(data);
      setFirmado(true);
    } catch (e: any) {
      setError(e.message || 'Error al firmar.');
    } finally {
      setCargando(false);
    }
  };

  if (noEncontrado) return (
    <div className="app"><div className="center"><div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 44 }}>🔍</div>
      <h2>Solicitud no encontrada</h2>
      <p className="muted">El link puede haber expirado o ser incorrecto.</p>
    </div></div></div>
  );

  if (!solicitud) return (
    <div className="app"><div className="center"><p className="muted">Cargando documento...</p></div></div>
  );

  return (
    <>
      <Head><title>Firmar: {solicitud.nombreArchivo} · SafeContract</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="app">
        <div className="topbar"><Logo /><div className="legal-badge">Art. 5 · Ley 25.506</div></div>
        <div className="content">
          {firmado ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52 }}>✅</div>
              <h2 style={{ margin: '8px 0' }}>Documento firmado</h2>
              <p className="muted" style={{ marginBottom: 20 }}>Tu firma fue registrada y el documento quedó firmado electrónicamente.</p>
              {resultado?.hashFirmado && (
                <div style={{ textAlign: 'left' }}>
                  <div className="cert-row"><span className="cert-k">SHA-256 (firmado)</span><span className="cert-v">{resultado.hashFirmado}</span></div>
                  <div className="cert-row"><span className="cert-k">Fecha y hora</span><span className="cert-v">{new Date(resultado.firmado).toLocaleString('es-AR')}</span></div>
                </div>
              )}
              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 20 }}>
                <a className="btn" href={`/api/descargar/${id}`}>Descargar documento firmado</a>
              </div>
              <p className="muted" style={{ marginTop: 16, fontSize: 11 }}>Firma electrónica válida según Art. 5 de la Ley 25.506 (Argentina).</p>
            </div>
          ) : (
            <>
              {error && <div className="alert alert-err">{error}</div>}
              <div className="card">
                <div className="card-hdr">📄 {solicitud.nombreArchivo}</div>
                <p className="muted" style={{ marginBottom: 14 }}>Enviado por {solicitud.emisor}. Revisá el documento completo antes de firmar.{solicitud.mensaje ? ` Mensaje: "${solicitud.mensaje}"` : ''}</p>
                <VisorPdf pdfBase64={solicitud.pdfBase64} zona={solicitud.zona} />
              </div>
              <div className="card">
                <div className="card-hdr">✍️ Tu firma</div>
                <CapturaFirma onFirma={(d, t) => { setFirma(d); setTipoFirma(t); }} />
                <div className="btn-row" style={{ marginTop: 16 }}>
                  <button className="btn" onClick={firmar} disabled={cargando || !firma}>{cargando ? 'Firmando...' : 'Firmar documento'}</button>
                </div>
                <p className="muted" style={{ marginTop: 12, fontSize: 11 }}>Al firmar confirmás tu identidad en los términos del Art. 5 de la Ley 25.506 de Firma Digital de la República Argentina.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
