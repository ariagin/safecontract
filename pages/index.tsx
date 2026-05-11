// pages/index.tsx
import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import styles from '@/styles/Home.module.css'

const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false })

interface Firmante { nombre: string; email: string }
interface SigZone { xPct: number; yPct: number; width: number; height: number }
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
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    if (!file || file.type !== 'application/pdf') { alert('Seleccioná un archivo PDF.'); return }
    setPdfFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => { setPdfBase64((ev.target?.result as string).split(',')[1]) }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]; if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const addFirmante = () => setFirmantes([...firmantes, { nombre: '', email: '' }])
  const removeFirmante = (i: number) => { if (firmantes.length > 1) setFirmantes(firmantes.filter((_, idx) => idx !== i)) }
  const updateFirmante = (i: number, field: keyof Firmante, val: string) => {
    const u = [...firmantes]; u[i][field] = val; setFirmantes(u)
  }

  const enviarSolicitud = async () => {
    if (!pdfBase64) return alert('Seleccioná un PDF primero.')
    if (firmantes.some(f => !f.nombre || !f.email)) return alert('Completá nombre y email de todos los firmantes.')
    setLoading(true)
    try {
      const res = await fetch('/api/crear-solicitud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, nombreArchivo: pdfFile?.name || 'documento.pdf', firmantes, sigZone: { x: sigZone.xPct, y: sigZone.yPct, width: sigZone.width, height: sigZone.height, page: 0 }, mensaje }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultado(data); setStep(3)
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally { setLoading(false) }
  }

  const reset = () => { setStep(1); setPdfFile(null); setPdfBase64(''); setFirmantes([{ nombre: '', email: '' }]); setMensaje(''); setResultado(null) }

  return (
    <>
      <Head>
        <title>SafeContract — SGS World Firma Electrónica</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.app}>
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
            {[{ n: 1, label: 'Documento' }, { n: 2, label: 'Posicionar' }, { n: 3, label: 'Enviado' }].map(s => (
              <div key={s.n} className={`${styles.step} ${step === s.n ? styles.stepActive : step > s.n ? styles.stepDone : ''}`}>
                <span className={styles.stepNum}>{step > s.n ? '✓' : s.n}</span>{s.label}
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
                <div
                  className={`${styles.uploadZone} ${isDragOver ? styles.uploadZoneOver : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDragEnter={handleDragOver}
                >
                  <div className={styles.uploadIcon}>{isDragOver ? '📂' : '⬆'}</div>
                  <div className={styles.uploadTitle}>{isDragOver ? 'Soltá el PDF aquí' : 'Arrastrá el PDF aquí o hacé clic para seleccionar'}</div>
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
              <button className={styles.btnPrimary} onClick={() => {
                if (!pdfBase64) { alert('Seleccioná un PDF primero.'); return }
                if (firmantes.some(f => !f.nombre || !f.email)) { alert('Completá todos los campos.'); return }
                setStep(2)
              }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className={styles.content}>
            <PdfViewer
              pdfBase64={pdfBase64}
              firmanteName={firmantes[0]?.nombre || 'Firmante'}
              sigZone={sigZone}
              onSigZoneChange={setSigZone}
            />
            <div className={styles.actions} style={{ marginTop: 16 }}>
              <button className={styles.btnSec} onClick={() => setStep(1)}>← Atrás</button>
              <button className={styles.btnPrimary} onClick={enviarSolicitud} disabled={loading}>
                {loading ? 'Enviando...' : '📨 Enviar para firma'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 */}
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
              <button className={styles.btnPrimary} style={{ marginTop: 24 }} onClick={reset}>
                + Nuevo documento
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
