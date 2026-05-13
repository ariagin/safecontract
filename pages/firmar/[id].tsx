import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'

// Importar react-pdf solo en el cliente (no SSR)
const Document = dynamic(() => import('react-pdf').then(m => m.Document), { ssr: false })
const Page = dynamic(() => import('react-pdf').then(m => m.Page), { ssr: false })
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false })

import styles from '../../styles/Firmar.module.css'

type TipoFirma = 'manuscrita' | 'tipeada' | 'imagen'

export default function FirmarPage() {
  const router = useRouter()
  const { id, firmante: emailParam } = router.query as { id: string; firmante: string }

  const [solicitud, setSolicitud] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  // Firma
  const [tipoFirma, setTipoFirma] = useState<TipoFirma>('manuscrita')
  const [firmaDataUrl, setFirmaDataUrl] = useState<string>('')
  const [firmaNombre, setFirmaNombre] = useState<string>('')
  const [firmaImagen, setFirmaImagen] = useState<string>('')
  const [sigVacia, setSigVacia] = useState(true)
  const sigRef = useRef<any>(null)

  // Visor PDF
  const [numPages, setNumPages] = useState(0)
  const [pageActual, setPageActual] = useState(1)
  const [pdfData, setPdfData] = useState<any>(null)
  const [pdfWorkerReady, setPdfWorkerReady] = useState(false)

  const [cargando, setCargando] = useState(false)
  const [firmado, setFirmado] = useState(false)
  const [error, setError] = useState('')

  // Configurar worker de pdfjs solo en cliente
  useEffect(() => {
    import('react-pdf').then(({ pdfjs }) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
      setPdfWorkerReady(true)
    })
  }, [])

  // Cargar solicitud
  useEffect(() => {
    if (!id) return
    fetch(`/api/solicitud?id=${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setSolicitud(data)
        // Preparar PDF para react-pdf
        const binary = atob(data.pdfBase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        setPdfData({ data: bytes })
        // Pre-completar nombre
        const firmante = data.firmantes?.find((f: any) => f.email === emailParam)
        if (firmante) setFirmaNombre(firmante.nombre)
      })
      .catch(() => setNotFound(true))
  }, [id, emailParam])

  const getFirmaFinal = useCallback((): string => {
    if (tipoFirma === 'manuscrita') {
      if (sigRef.current && !sigRef.current.isEmpty()) {
        return sigRef.current.toDataURL('image/png')
      }
      return ''
    }
    if (tipoFirma === 'tipeada') return firmaDataUrl
    if (tipoFirma === 'imagen') return firmaImagen
    return ''
  }, [tipoFirma, firmaDataUrl, firmaImagen])

  // Generar imagen de firma tipeada
  useEffect(() => {
    if (tipoFirma !== 'tipeada' || !firmaNombre) { setFirmaDataUrl(''); return }
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 100
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 400, 100)
    ctx.fillStyle = '#071E3D'
    ctx.font = 'italic 42px Georgia, serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(firmaNombre, 20, 50)
    setFirmaDataUrl(canvas.toDataURL('image/png'))
  }, [firmaNombre, tipoFirma])

  const onImagenUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFirmaImagen(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const enviarFirma = async () => {
    setError('')
    const firma = getFirmaFinal()
    if (!firma) { setError('Primero completá tu firma.'); return }
    const firmante = solicitud?.firmantes?.find((f: any) => f.email === emailParam)
    if (!firmante) { setError('No sos parte de esta solicitud.'); return }

    setCargando(true)
    try {
      const resp = await fetch('/api/firmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          emailFirmante: firmante.email,
          nombreFirmante: firmante.nombre,
          firmaDataUrl: firma,
          tipoFirma
        })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error al firmar')
      setFirmado(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  if (notFound) return (
    <div className={styles.center}>
      <div className={styles.notFound}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h2>Solicitud no encontrada</h2>
        <p>El link puede haber expirado o ser incorrecto.</p>
      </div>
    </div>
  )

  if (!solicitud) return (
    <div className={styles.center}>
      <div className={styles.loading}>Cargando documento...</div>
    </div>
  )

  if (firmado) return (
    <div className={styles.center}>
      <Head><title>Documento firmado · SafeContract</title></Head>
      <div className={styles.exitoCard}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2>¡Firmaste el documento!</h2>
        <p>Tu firma fue registrada correctamente y el documento fue procesado.</p>
        <div className={styles.legalNote}>
          Firma electrónica válida · Art. 5 · Ley 25.506 (Argentina)
        </div>
      </div>
    </div>
  )

  const firmante = solicitud.firmantes?.find((f: any) => f.email === emailParam)

  return (
    <>
      <Head>
        <title>Firmar: {solicitud.nombreArchivo} · SafeContract</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <span>🛡️</span>
            <div>
              <div className={styles.logoNombre}>SafeContract</div>
              <div className={styles.logoSub}>SGS World Legaltech</div>
            </div>
          </div>
          <div className={styles.legalBadge}>Art. 5 · Ley 25.506</div>
        </header>

        <main className={styles.main}>
          {/* Pasos */}
          <div className={styles.pasos}>
            {[
              { n: 1, label: 'Leer' },
              { n: 2, label: 'Firmar' },
              { n: 3, label: 'Confirmar' }
            ].map(p => (
              <div key={p.n} className={`${styles.pasoItem} ${paso === p.n ? styles.pasoActivo : ''} ${paso > p.n ? styles.pasoDone : ''}`}>
                <div className={styles.pasoNum}>{paso > p.n ? '✓' : p.n}</div>
                <div className={styles.pasoLabel}>{p.label}</div>
              </div>
            ))}
          </div>

          {/* PASO 1: Leer */}
          {paso === 1 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Revisá el documento</h2>
              <p className={styles.cardDesc}>
                Hola <strong>{firmante?.nombre || emailParam}</strong>, te invitaron a firmar:
                <strong> {solicitud.nombreArchivo}</strong>
              </p>

              {/* Visor react-pdf */}
              {pdfWorkerReady && pdfData ? (
                <div className={styles.visorContainer}>
                  <div className={styles.visorToolbar}>
                    <span className={styles.visorNombre}>📄 {solicitud.nombreArchivo}</span>
                    {numPages > 0 && (
                      <div className={styles.visorNav}>
                        <button
                          onClick={() => setPageActual(p => Math.max(1, p - 1))}
                          disabled={pageActual <= 1}
                          className={styles.visorBtn}
                        >‹</button>
                        <span className={styles.visorPaginas}>{pageActual} / {numPages}</span>
                        <button
                          onClick={() => setPageActual(p => Math.min(numPages, p + 1))}
                          disabled={pageActual >= numPages}
                          className={styles.visorBtn}
                        >›</button>
                      </div>
                    )}
                  </div>
                  <div className={styles.visorBody}>
                    <Document
                      file={pdfData}
                      onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageActual(1) }}
                      onLoadError={(e) => setError('Error cargando PDF: ' + e.message)}
                      loading={<div className={styles.visorLoading}>Cargando...</div>}
                    >
                      <Page
                        pageNumber={pageActual}
                        width={520}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>
                </div>
              ) : (
                <div className={styles.visorLoading}>Preparando visor...</div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.navButtons}>
                <div />
                <button className={styles.btnPrimary} onClick={() => setPaso(2)}>
                  Leí el documento →
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Firmar */}
          {paso === 2 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Tu firma</h2>
              <p className={styles.cardDesc}>Elegí cómo querés firmar</p>

              {/* Selector de tipo */}
              <div className={styles.tipoSelector}>
                {(['manuscrita', 'tipeada', 'imagen'] as TipoFirma[]).map(t => (
                  <button
                    key={t}
                    className={`${styles.tipoBtn} ${tipoFirma === t ? styles.tipoBtnActivo : ''}`}
                    onClick={() => { setTipoFirma(t); setSigVacia(true) }}
                  >
                    {t === 'manuscrita' ? '✍️ Manuscrita' : t === 'tipeada' ? '⌨️ Tipeada' : '🖼️ Imagen'}
                  </button>
                ))}
              </div>

              {/* Manuscrita */}
              {tipoFirma === 'manuscrita' && (
                <div>
                  <div className={styles.canvasWrap}>
                    {typeof window !== 'undefined' && (
                      <SignatureCanvas
                        ref={sigRef}
                        penColor='#071E3D'
                        canvasProps={{ width: 520, height: 150, style: { display: 'block', width: '100%', height: 150, borderRadius: 8 } }}
                        onEnd={() => setSigVacia(false)}
                      />
                    )}
                    {sigVacia && (
                      <div className={styles.canvasPlaceholder}>Dibujá tu firma aquí</div>
                    )}
                  </div>
                  {!sigVacia && (
                    <button className={styles.btnGhost} onClick={() => { sigRef.current?.clear(); setSigVacia(true) }}>
                      ✕ Borrar
                    </button>
                  )}
                </div>
              )}

              {/* Tipeada */}
              {tipoFirma === 'tipeada' && (
                <div>
                  <input
                    className={styles.input}
                    placeholder="Escribí tu nombre completo"
                    value={firmaNombre}
                    onChange={e => setFirmaNombre(e.target.value)}
                    style={{ marginBottom: 14 }}
                  />
                  {firmaNombre && firmaDataUrl && (
                    <div className={styles.firmaPreview}>
                      <img src={firmaDataUrl} alt="Preview firma" style={{ maxWidth: '100%', height: 80 }} />
                    </div>
                  )}
                </div>
              )}

              {/* Imagen */}
              {tipoFirma === 'imagen' && (
                <div>
                  <label className={styles.uploadZone} style={{ cursor: 'pointer', display: 'block', textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                    <div style={{ color: '#fff', fontSize: 14 }}>Subir imagen de firma (PNG o JPG)</div>
                    <input type="file" accept="image/png,image/jpeg" onChange={onImagenUpload} hidden />
                  </label>
                  {firmaImagen && (
                    <div className={styles.firmaPreview}>
                      <img src={firmaImagen} alt="Firma" style={{ maxWidth: '100%', maxHeight: 100 }} />
                    </div>
                  )}
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.navButtons}>
                <button className={styles.btnGhost} onClick={() => setPaso(1)}>← Atrás</button>
                <button className={styles.btnPrimary} onClick={() => {
                  const f = getFirmaFinal()
                  if (!f) { setError('Completá tu firma antes de continuar.'); return }
                  setError(''); setPaso(3)
                }}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Confirmar */}
          {paso === 3 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Confirmá tu firma</h2>
              <p className={styles.cardDesc}>Al confirmar, el documento quedará firmado electrónicamente.</p>

              <div className={styles.resumen}>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Documento</span>
                  <span className={styles.resumenVal}>📄 {solicitud.nombreArchivo}</span>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Firmante</span>
                  <span className={styles.resumenVal}>{firmante?.nombre} · {firmante?.email}</span>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Tipo</span>
                  <span className={styles.resumenVal}>{tipoFirma === 'manuscrita' ? '✍️ Manuscrita' : tipoFirma === 'tipeada' ? '⌨️ Tipeada' : '🖼️ Imagen'}</span>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Validez</span>
                  <span className={styles.resumenVal} style={{ color: '#00B4D8' }}>Art. 5 · Ley 25.506</span>
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.navButtons}>
                <button className={styles.btnGhost} onClick={() => setPaso(2)}>← Atrás</button>
                <button
                  className={styles.btnPrimary}
                  disabled={cargando}
                  onClick={enviarFirma}
                >
                  {cargando ? 'Procesando...' : '✅ Confirmar firma'}
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          SafeContract · SGS World Legaltech · Firma electrónica Ley 25.506
        </footer>
      </div>
    </>
  )
}
