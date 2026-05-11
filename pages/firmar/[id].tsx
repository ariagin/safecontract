// pages/firmar/[id].tsx
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import styles from '@/styles/Firmar.module.css'

const PdfViewerFirmante = dynamic(() => import('@/components/PdfViewerFirmante'), { ssr: false })

type Modalidad = 'draw' | 'type' | 'img'

export default function FirmarPage() {
  const router = useRouter()
  const { id, email } = router.query

  const [nombreArchivo, setNombreArchivo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [firmado, setFirmado] = useState(false)
  const [pdfFirmadoB64, setPdfFirmadoB64] = useState('')
  const [hashFirmado, setHashFirmado] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [pdfOriginalB64, setPdfOriginalB64] = useState('')
  const [verPdf, setVerPdf] = useState(false)

  const [modalidad, setModalidad] = useState<Modalidad>('draw')
  const [nombreFirmante, setNombreFirmante] = useState('')
  const [dni, setDni] = useState('')
  const [imgSrc, setImgSrc] = useState('')
  const [typedSig, setTypedSig] = useState('')
  const [enviando, setEnviando] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/solicitud/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setCargando(false); return }
        setNombreArchivo(data.nombreArchivo)
        const firmante = data.firmantes?.find((f: { email: string; nombre: string; firmado: boolean }) => f.email === email)
        if (firmante?.firmado) setFirmado(true)
        if (firmante?.nombre) setNombreFirmante(firmante.nombre)
        setCargando(false)
      })
      .catch(() => { setError('No se pudo cargar el documento.'); setCargando(false) })
  }, [id, email])

  useEffect(() => {
    if (!id) return
    fetch(`/api/pdf/${id}`)
      .then(r => r.json())
      .then(data => { if (data.pdfBase64) setPdfOriginalB64(data.pdfBase64) })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#071E3D'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect(), c = canvasRef.current!
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  const getPosTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0], r = canvasRef.current!.getBoundingClientRect(), c = canvasRef.current!
    return { x: (t.clientX - r.left) * (c.width / r.width), y: (t.clientY - r.top) * (c.height / r.height) }
  }
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawingRef.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke()
  }
  const startDrawT = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); drawingRef.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const p = getPosTouch(e); ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  const drawT = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!drawingRef.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = getPosTouch(e); ctx.lineTo(p.x, p.y); ctx.stroke()
  }
  const stopDraw = () => { drawingRef.current = false }
  const clearCanvas = () => { canvasRef.current!.getContext('2d')!.clearRect(0, 0, 520, 140) }
  const loadImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImgSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const getFirmaBase64 = () => {
    if (modalidad === 'draw') return canvasRef.current!.toDataURL('image/png')
    if (modalidad === 'type') return typedSig
    return imgSrc
  }

  const enviarFirma = async () => {
    const firma = getFirmaBase64()
    if (!firma || firma === 'data:,') return alert('Completá tu firma primero.')
    if (!nombreFirmante) return alert('Ingresá tu nombre completo.')
    setEnviando(true)
    try {
      const res = await fetch('/api/firmar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: id, email, nombre: nombreFirmante, dni, firmaBase64: firma, modalidad }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFirmado(true); setPdfFirmadoB64(data.pdfFirmadoBase64)
      setHashFirmado(data.hashFirmado); setTimestamp(data.timestamp)
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally { setEnviando(false) }
  }

  const descargarPdf = () => {
    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${pdfFirmadoB64}`
    link.download = `FIRMADO_${nombreArchivo}`; link.click()
  }

  if (cargando) return (
    <div className={styles.loading}><div className={styles.spinner}></div>Cargando documento...</div>
  )
  if (error) return (
    <div className={styles.errorPage}><div className={styles.errorIcon}>✕</div><div>{error}</div></div>
  )

  return (
    <>
      <Head><title>Firmar — {nombreArchivo}</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className={styles.app}>
        <div className={styles.topbar}>
          <svg viewBox="0 0 34 38" fill="none" className={styles.shield}>
            <path d="M17 1L3 7v10c0 9 6.2 17.4 14 20 7.8-2.6 14-11 14-20V7L17 1z" fill="rgba(0,180,216,0.12)" stroke="#00B4D8" strokeWidth="1.5"/>
            <ellipse cx="17" cy="17" rx="7" ry="9" stroke="#90E0EF" strokeWidth="1"/>
            <path d="M11 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#00B4D8" strokeWidth="1" strokeLinecap="round" fill="none"/>
          </svg>
          <div>
            <div className={styles.brandName}>Safe<span>Contract</span></div>
            <div className={styles.brandSub}>SGS World · Firma Electrónica</div>
          </div>
        </div>

        <div className={styles.content}>
          {firmado ? (
            <div className={styles.card} style={{ textAlign: 'center', padding: '48px 28px' }}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successTitle}>Documento firmado</div>
              <div className={styles.successSub}>Recibiste una copia por mail.</div>
              <div className={styles.certBlock}>
                <div><span className={styles.certKey}>Documento:</span><span className={styles.certVal}>{nombreArchivo}</span></div>
                <div><span className={styles.certKey}>Firmante:</span><span className={styles.certVal}>{nombreFirmante}</span></div>
                {hashFirmado && <div><span className={styles.certKey}>SHA-256:</span><span className={styles.certVal}>{hashFirmado.substring(0, 32)}...</span></div>}
                {timestamp && <div><span className={styles.certKey}>Timestamp:</span><span className={styles.certVal}>{timestamp.replace('T', ' ').substring(0, 19)} UTC</span></div>}
                <div><span className={styles.certKey}>Marco legal:</span><span className={styles.certVal}>Ley 25.506 Art. 5 — Argentina</span></div>
              </div>
              {pdfFirmadoB64 && (
                <button className={styles.btnPrimary} style={{ marginTop: 24 }} onClick={descargarPdf}>
                  ⬇ Descargar PDF firmado
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.docHeader}>
                <span className={styles.docIcon}>📄</span>
                <div style={{ flex: 1 }}>
                  <div className={styles.docName}>{nombreArchivo}</div>
                  <div className={styles.docSub}>Enviado por SGS World Legaltech · Leé el documento antes de firmar</div>
                </div>
                <button className={styles.btnVerDoc} onClick={() => setVerPdf(v => !v)}>
                  {verPdf ? '▲ Ocultar' : '👁 Ver documento'}
                </button>
              </div>

              {verPdf && pdfOriginalB64 && (
                <PdfViewerFirmante pdfBase64={pdfOriginalB64} nombreArchivo={nombreArchivo} />
              )}
              {verPdf && !pdfOriginalB64 && (
                <div className={styles.pdfLoading}>Cargando vista previa...</div>
              )}

              <div className={styles.card}>
                <div className={styles.cardHdr}>✍ Tu firma</div>
                <div className={styles.tabs}>
                  {(['draw', 'type', 'img'] as Modalidad[]).map(m => (
                    <button key={m} className={`${styles.tab} ${modalidad === m ? styles.tabActive : ''}`} onClick={() => setModalidad(m)}>
                      {m === 'draw' ? '✏ Manuscrita' : m === 'type' ? 'Aa Tipeada' : '🖼 Imagen'}
                    </button>
                  ))}
                </div>
                {modalidad === 'draw' && (
                  <div className={styles.canvasWrap}>
                    <canvas ref={canvasRef} width={520} height={140} className={styles.canvas}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDrawT} onTouchMove={drawT} onTouchEnd={stopDraw} />
                    <div className={styles.canvasHint}>Firmá aquí con el mouse o tu dedo</div>
                    <button className={styles.btnSec} style={{ marginTop: 8 }} onClick={clearCanvas}>↺ Limpiar</button>
                  </div>
                )}
                {modalidad === 'type' && (
                  <div className={styles.canvasWrap}>
                    <input type="text" className={styles.typedSig} placeholder="Escribí tu nombre completo" value={typedSig} onChange={e => setTypedSig(e.target.value)} />
                  </div>
                )}
                {modalidad === 'img' && (
                  <div className={styles.imgPanel}>
                    {!imgSrc ? (
                      <div className={styles.imgUpload} onClick={() => imgInputRef.current?.click()}>
                        <div style={{ fontSize: 28 }}>🖼</div>
                        <div>Subí tu firma como imagen</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>PNG o JPG</div>
                        <input ref={imgInputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={loadImg} />
                      </div>
                    ) : (
                      <div className={styles.imgPreview}>
                        <img src={imgSrc} alt="Firma" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
                        <button className={styles.btnSec} onClick={() => { setImgSrc(''); if (imgInputRef.current) imgInputRef.current.value = '' }}>Cambiar</button>
                        <input ref={imgInputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={loadImg} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.card}>
                <div className={styles.cardHdr}>🪪 Tus datos</div>
                <div className={styles.row2}>
                  <div className={styles.field}><label className={styles.label}>Nombre completo</label><input type="text" placeholder="Tu nombre" value={nombreFirmante} onChange={e => setNombreFirmante(e.target.value)} /></div>
                  <div className={styles.field}><label className={styles.label}>DNI / CUIT</label><input type="text" placeholder="20-12345678-9" value={dni} onChange={e => setDni(e.target.value)} /></div>
                </div>
              </div>

              <div className={styles.legalNotice}>
                <strong>Declaración legal —</strong> Al confirmar, prestás consentimiento expreso según el Art. 5 de la Ley 25.506 de Firma Digital de la República Argentina. Se registrará el hash SHA-256, tu IP y timestamp UTC.
              </div>
              <button className={styles.btnFirmar} onClick={enviarFirma} disabled={enviando}>
                {enviando ? 'Procesando...' : '✍ Firmar documento'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
