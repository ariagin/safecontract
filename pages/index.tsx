// pages/index.tsx
import { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';

// react-pdf solo corre en el navegador -> import dinámico sin SSR
const VisorPdf = dynamic(() => import('@/components/VisorPdf'), { ssr: false });

import type { Zona } from '@/components/VisorPdf';

export default function Home() {
  const [step, setStep] = useState(1);
  const [pdfBase64, setPdfBase64] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [drag, setDrag] = useState(false);
  const [zona, setZona] = useState<Zona | null>(null);
  const [firmante, setFirmante] = useState({ nombre: '', email: '' });
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);

  const procesar = (file: File) => {
    if (file.type !== 'application/pdf') { setError('El archivo debe ser un PDF.'); return; }
    setError('');
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setPdfBase64((e.target?.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  };

  const enviar = async () => {
    setError('');
    if (!firmante.nombre.trim() || !firmante.email.trim()) {
      setError('Completá nombre y email del firmante.'); return;
    }
    setCargando(true);
    try {
      const r = await fetch('/api/crear-solicitud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, nombreArchivo, firmante, zona, mensaje }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setResultado(data);
      setStep(4);
    } catch (e: any) {
      setError(e.message || 'Error al enviar.');
    } finally {
      setCargando(false);
    }
  };

  const reset = () => {
    setStep(1); setPdfBase64(''); setNombreArchivo(''); setZona(null);
    setFirmante({ nombre: '', email: '' }); setMensaje(''); setResultado(null); setError('');
  };

  return (
    <>
      <Head><title>SafeContract — SGS World</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="app">
        <div className="topbar">
          <Logo />
          <div className="legal-badge">Art. 5 · Ley 25.506</div>
        </div>

        <div className="content">
          <div className="steps" style={{ justifyContent: 'center', marginBottom: 28 }}>
            {[{ n: 1, l: 'Documento' }, { n: 2, l: 'Zona de firma' }, { n: 3, l: 'Firmante' }, { n: 4, l: 'Enviado' }].map((s) => (
              <div key={s.n} className={`step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                <span className="step-num">{step > s.n ? '✓' : s.n}</span>{s.l}
              </div>
            ))}
          </div>

          {error && <div className="alert alert-err">{error}</div>}

          {/* PASO 1: cargar PDF */}
          {step === 1 && (
            <div className="card">
              <div className="card-hdr">📄 Cargar documento</div>
              {!pdfBase64 ? (
                <label
                  className={`upload ${drag ? 'drag' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) procesar(f); }}
                >
                  <div className="upload-icon">📄</div>
                  <div className="upload-title">Arrastrá tu PDF acá</div>
                  <div className="upload-sub">o hacé clic para elegir un archivo</div>
                  <input type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); }} />
                </label>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 26 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{nombreArchivo}</div>
                      <div className="muted">Documento cargado correctamente</div>
                    </div>
                    <button className="btn btn-sec" onClick={() => { setPdfBase64(''); setNombreArchivo(''); }}>Cambiar</button>
                  </div>
                  <div className="btn-row">
                    <button className="btn" onClick={() => setStep(2)}>Continuar →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: posicionar zona */}
          {step === 2 && (
            <div className="card">
              <div className="card-hdr">🎯 Marcá dónde va la firma</div>
              <p className="muted" style={{ marginBottom: 16 }}>Hacé clic y arrastrá sobre el documento para dibujar el recuadro donde irá la firma. Podés hacerlo en cualquier página. Para ajustarlo, arrastrá el recuadro para moverlo o tirá del punto celeste de la esquina para cambiar el tamaño.</p>
              <VisorPdf pdfBase64={pdfBase64} zona={zona || undefined} onZonaCambio={setZona} />
              {zona && (zona.wPct > 0.03 && zona.hPct > 0.02)
                ? <p className="muted" style={{ marginTop: 12, color: 'var(--cyan-soft)' }}>✓ Zona de firma definida en la página {zona.pagina + 1}.</p>
                : <p className="muted" style={{ marginTop: 12 }}>Todavía no dibujaste la zona de firma.</p>}
              <div className="btn-row">
                <button className="btn btn-sec" onClick={() => setStep(1)}>← Atrás</button>
                <button className="btn" onClick={() => setStep(3)} disabled={!zona || zona.wPct < 0.03 || zona.hPct < 0.02}>Continuar →</button>
              </div>
            </div>
          )}

          {/* PASO 3: datos del firmante */}
          {step === 3 && (
            <div className="card">
              <div className="card-hdr">✉️ Datos del firmante</div>
              <div className="field">
                <label className="label">Nombre completo</label>
                <input className="input" value={firmante.nombre} onChange={(e) => setFirmante({ ...firmante, nombre: e.target.value })} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" type="email" value={firmante.email} onChange={(e) => setFirmante({ ...firmante, email: e.target.value })} placeholder="firmante@email.com" />
              </div>
              <div className="field">
                <label className="label">Mensaje (opcional)</label>
                <input className="input" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej: Por favor firmá el escrito para presentar mañana" />
              </div>
              <div className="btn-row">
                <button className="btn btn-sec" onClick={() => setStep(2)}>← Atrás</button>
                <button className="btn" onClick={enviar} disabled={cargando}>{cargando ? 'Enviando...' : 'Enviar para firma →'}</button>
              </div>
            </div>
          )}

          {/* PASO 4: enviado */}
          {step === 4 && resultado && (
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <h2 style={{ margin: '8px 0' }}>Solicitud creada</h2>
                <p className="muted">
                  {resultado.mailEnviado
                    ? `Se envió un mail a ${firmante.email} con el link para firmar.`
                    : 'La solicitud se creó. (El mail no se envió: revisá la configuración de Resend.)'}
                </p>
              </div>
              <div className="cert-row"><span className="cert-k">ID de solicitud</span><span className="cert-v">{resultado.id}</span></div>
              <div className="cert-row"><span className="cert-k">SHA-256 (original)</span><span className="cert-v">{resultado.hashOriginal}</span></div>
              <div className="cert-row"><span className="cert-k">Link de firma</span><span className="cert-v"><a href={resultado.linkFirma} style={{ color: 'var(--cyan)' }}>{resultado.linkFirma}</a></span></div>
              <div className="btn-row"><button className="btn" onClick={reset}>Nueva solicitud</button></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
