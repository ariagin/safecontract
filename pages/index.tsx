// pages/index.tsx
import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import styles from '@/styles/Home.module.css'

interface Firmante {
  nombre: string
  email: string
}

interface SigZone {
  xPct: number
  yPct: number
  width: number
  height: number
}

type Step = 1 | 2 | 3

export default function Home() {
  const [step, setStep] = useState<Step>(1)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfBase64, setPdfBase64] = useState<string>('')
  const [firmantes, setFirmantes] = useState<Firmante[]>([{ nombre: '', email: '' }])
  const [mensaje, setMensaje] = useState('')
  const [sigZone, setSigZone] = useState<SigZone>({ xPct: 10, yPct: 75, width: 220, height: 70 })
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ id: string; hash: string } | null>(null)
  const [dragSig, setDragSig] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const pdfAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1]
      setPdfBase64(b64)
    }
    reader.readAsDataURL(file)
  }

  const addFirmante = () => setFirmantes([...firmantes, { nombre: '', email: '' }])
  const removeFirmante = (i: number) => {
    if (firmantes.length === 1) return
    setFirmantes(firmantes.filter((_, idx) => idx !== i))
  }
  const updateFirmante = (i: number, field: keyof Firmante, val: string) => {
    const updated = [...firmantes]
    updated[i][field] = val
    setFirmantes(updated)
  }

  const handlePdfAreaClick = (e: React.MouseEvent) => {
    if (dragSig) return
    const rect = pdfAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPct = ((e.clientX - rect.left - 110) / rect.width) * 100
    const yPct = ((e.clientY - rect.top - 35) / rect.height) * 100
    setSigZone(z => ({
      ...z,
      xPct: Math.max(0, Math.min(xPct, 100 - (z.width / rect.width) * 100)),
      yPct: Math.max(0, Math.min(yPct, 100 - (z.height / rect.height) * 100)),
    }))
  }

  const handleSigMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDragSig(true)
    const rect = pdfAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const sigX = (sigZone.xPct / 100) * rect.width
    const sigY = (sigZone.yPct / 100) * rect.height
    setDragOffset({ x: e.clientX - rect.left - sigX, y: e.clientY - rect.top - sigY })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragSig) return
    const rect = pdfAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y
    setSigZone(z => ({
      ...z,
      xPct: Math.max(0, Math.min((x / rect.width) * 100, 100 - (z.width / rect.width) * 100)),
      yPct: Math.max(0, Math.min((y / rect.height) * 100, 100 - (z.height / rect.height) * 100)),
    }))
  }, [dragSig, dragOffset])

  const enviarSolicitud = async () => {
    if (!pdfBase64) return alert('Seleccioná un PDF primero.')
    if (firmantes.some(f => !f.nombre || !f.email)) return alert('Completá nombre y email de todos los firmantes.')
    setLoading(true)
    try {
      const res = await fetch('/api/crear-solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          nombreArchivo: pdfFile?.name || 'documento.pdf',
          firmantes,
          sigZone: {
            x: sigZone.xPct,
            y: sigZone.yPct,
            width: sigZone.width,
            height: sigZone.height,
            page: 0,
          },
          mensaje,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultado(data)
      setStep(3)
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>SafeContract — SGS World Firma Electrónica</title>
        <meta name="description" content="Plataforma de firma electrónica · SGS World Legaltech" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.app}>
        {/* TOPBAR */}
        <div className={styles.topbar}>
          <div className={styles.logo}>
            <svg viewBox="0 0 34 38" fill="none" className={styles.shield}>
              <path d="M17 1L3 7v10c0 9 6.2 17.4 14 20 7.8-2.6 14-11 14-20V7L17 1z" fill="rgba(0,180,216,0.12)" stroke="#00B4D8" strokeWidth="1.5"/>
              <ellipse cx="17" cy="17" rx="7" ry="9" stroke="#90E0EF" strokeWidth="1"/>
              <path d="M11 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none"/>
              <path d="M13 19c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none"/>
              <path d="M15 21c0-1.1.9-2 2-2s2 .9 2 2" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none"/>
            </svg>
            <div>
              <div className={styles.brandName}>Safe<span>Contract</span></div>
              <div className={styles.brandSub}>SGS World · Firma Electrónica</div>
            </div>
          </div>
          <div className={styles.stepBar}>
            {[
              { n: 1, label: 'Documento' },
              { n: 2, label: 'Posicionar' },
              { n: 3, label: 'Enviado' },
            ].map(s => (
              <div key={s.n} className={`${styles.step} ${step === s.n ? styles.stepActive : step > s.n ? styles.stepDone : ''}`}>
                <span className={styles.stepNum}>{step > s.n ? '✓' : s.n}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <div className={styles.content}>
            <div className={styles.card}>
              <div className={styles.cardHdr}>📄 Cargar documento</div>
              {!pdfFile ? (
                <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                  <div className={styles.uploadIcon}>⬆</div>
                  <div className={styles.uploadTitle}>Arrastrá el PDF aquí o hacé clic para seleccionar</div>
                  <div className={styles.uploadSub}>Formato PDF · Hasta 20 MB</div>
                  <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
              ) : (
                <div className={styles.fileRow}>
                  <span className={styles.fileIcon}>📄</span>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{pdfFile.name}</div>
                    <div className={styles.fileSize}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB · PDF</div>
                  </div>
                  <button className={styles.removeBtn} onClick={() => { setPdfFile(null); setPdfBase64('') }}>✕</button>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHdr}>👥 Firmantes</div>
              {firmantes.map((f, i) => (
                <div key={i} className={styles.firmanteRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Nombre completo</label>
                    <input type="text" placeholder="Juan García" value={f.nombre} onChange={e => updateFirmante(i, 'nombre', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Correo electrónico</label>
                    <input type="email" placeholder="firmante@email.com" value={f.email} onChange={e => updateFirmante(i, 'email', e.target.value)} />
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeFirmante(i)}>✕</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addFirmante}>+ Agregar firmante</button>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHdr}>💬 Mensaje (opcional)</div>
              <input type="text" placeholder="Ej: Por favor firmá el escrito antes del viernes." value={mensaje} onChange={e => setMensaje(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => { if (!pdfBase64) { alert('Seleccioná un PDF primero.'); return } if (firmantes.some(f => !f.nombre || !f.email)) { alert('Completá todos los campos.'); return } setStep(2) }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className={styles.content}>
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.pdfToolbar}>
                <span>📄 {pdfFile?.name}</span>
                <span className={styles.badge}>Pág. 1</span>
                <span className={styles.pdfHint}>Hacé clic o arrastrá la zona azul</span>
              </div>
              <div
                ref={pdfAreaRef}
                className={styles.pdfArea}
                onClick={handlePdfAreaClick}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDragSig(false)}
                onMouseLeave={() => setDragSig(false)}
              >
                <div className={styles.docContent}>
                  <div className={styles.docTitle}>ESCRITO DE DEMANDA</div>
                  {[90, 85, 88, 55, 92, 87, 90, 79, 50, 89, 82, 88, 72, 89, 83, 42].map((w, i) => (
                    <div key={i} className={styles.docLine} style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div
                  className={styles.sigZone}
                  style={{
                    left: `${sigZone.xPct}%`,
                    top: `${sigZone.yPct}%`,
                    width: sigZone.width,
                    height: sigZone.height,
                  }}
                  onMouseDown={handleSigMouseDown}
                >
                  <div className={styles.sigZoneLabel}>✍ Zona de firma</div>
                  <div className={styles.sigZoneSub}>{firmantes[0]?.nombre || 'Firmante'}</div>
                </div>
              </div>
            </div>

            <div className={styles.card} style={{ padding: '12px 16px' }}>
              <span className={styles.tagCyan}>Arrastrá la zona azul para reposicionarla</span>
            </div>

            <div className={styles.actions}>
              <button className={styles.btnSec} onClick={() => setStep(1)}>← Atrás</button>
              <button className={styles.btnPrimary} onClick={enviarSolicitud} disabled={loading}>
                {loading ? 'Enviando...' : '📨 Enviar para firma'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Confirmación */}
        {step === 3 && resultado && (
          <div className={styles.content}>
            <div className={styles.card} style={{ textAlign: 'center', padding: '48px 28px' }}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successTitle}>¡Solicitud enviada!</div>
              <div className={styles.successSub}>
                Se enviaron los mails a {firmantes.length} firmante{firmantes.length > 1 ? 's' : ''}.<br />
                Cuando firmen, recibirás el PDF firmado por mail.
              </div>
              <div className={styles.certBlock}>
                <div><span className={styles.certKey}>ID solicitud:</span> <span className={styles.certVal}>{resultado.id}</span></div>
                <div><span className={styles.certKey}>SHA-256:</span> <span className={styles.certVal}>{resultado.hash.substring(0, 32)}...</span></div>
                <div><span className={styles.certKey}>Firmantes:</span> <span className={styles.certVal}>{firmantes.map(f => f.email).join(', ')}</span></div>
              </div>
              <button className={styles.btnPrimary} style={{ marginTop: 24 }} onClick={() => { setStep(1); setPdfFile(null); setPdfBase64(''); setFirmantes([{ nombre: '', email: '' }]); setMensaje(''); setResultado(null) }}>
                + Nuevo documento
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
