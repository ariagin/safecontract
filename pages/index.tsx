import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

type Paso = 1 | 2 | 3 | 4

interface Firmante {
  nombre: string
  email: string
}

export default function Home() {
  const [paso, setPaso] = useState<Paso>(1)
  const [pdfBase64, setPdfBase64] = useState('')
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [firmantes, setFirmantes] = useState<Firmante[]>([{ nombre: '', email: '' }])
  const [dragOver, setDragOver] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const procesarArchivo = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.')
      return
    }
    setNombreArchivo(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(',')[1]
      setPdfBase64(b64)
    }
    reader.readAsDataURL(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivo(file)
  }

  const agregarFirmante = () => {
    setFirmantes([...firmantes, { nombre: '', email: '' }])
  }

  const actualizarFirmante = (i: number, campo: 'nombre' | 'email', valor: string) => {
    const f = [...firmantes]
    f[i][campo] = valor
    setFirmantes(f)
  }

  const eliminarFirmante = (i: number) => {
    setFirmantes(firmantes.filter((_, idx) => idx !== i))
  }

  const enviar = async () => {
    setError('')
    const invalidos = firmantes.filter(f => !f.nombre.trim() || !f.email.trim())
    if (invalidos.length > 0) {
      setError('Completá nombre y email de todos los firmantes.')
      return
    }
    setCargando(true)
    try {
      const resp = await fetch('/api/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, nombreArchivo, firmantes })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error desconocido')
      setResultado(data)
      setPaso(4)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const reset = () => {
    setPaso(1)
    setPdfBase64('')
    setNombreArchivo('')
    setFirmantes([{ nombre: '', email: '' }])
    setResultado(null)
    setError('')
  }

  const pasoValido = () => {
    if (paso === 1) return !!pdfBase64
    if (paso === 2) return firmantes.length > 0 && firmantes.every(f => f.nombre && f.email)
    return true
  }

  return (
    <>
      <Head>
        <title>SafeContract – SGS World Legaltech</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.page}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🛡️</span>
            <div>
              <div className={styles.logoNombre}>SafeContract</div>
              <div className={styles.logoSub}>SGS World Legaltech</div>
            </div>
          </div>
          <div className={styles.legalBadge}>Art. 5 · Ley 25.506</div>
        </header>

        <main className={styles.main}>
          {paso < 4 && (
            <div className={styles.pasos}>
              {[
                { n: 1, label: 'Documento' },
                { n: 2, label: 'Firmantes' },
                { n: 3, label: 'Confirmar' }
              ].map(p => (
                <div
                  key={p.n}
                  className={`${styles.pasoItem} ${paso === p.n ? styles.pasoActivo : ''} ${paso > p.n ? styles.pasoDone : ''}`}
                >
                  <div className={styles.pasoNum}>{paso > p.n ? '✓' : p.n}</div>
                  <div className={styles.pasoLabel}>{p.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* PASO 1: Cargar PDF */}
          {paso === 1 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Cargá el documento</h2>
              <p className={styles.cardDesc}>El PDF que querés enviar a firmar</p>

              {!pdfBase64 ? (
                <div
                  className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneOver : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className={styles.uploadIcon}>📂</div>
                  <div className={styles.uploadTexto}>
                    <strong>Hacé clic o arrastrá un PDF aquí</strong>
                  </div>
                  <div className={styles.uploadSub}>Solo archivos PDF · Máximo 20MB</div>
                  <input ref={fileRef} type="file" accept=".pdf" onChange={onFileChange} hidden />
                </div>
              ) : (
                <div className={styles.archivoOk}>
                  <span className={styles.archivoIcon}>📄</span>
                  <div>
                    <div className={styles.archivoNombre}>{nombreArchivo}</div>
                    <div className={styles.archivoSub}>PDF cargado correctamente</div>
                  </div>
                  <button className={styles.btnGhost} onClick={() => { setPdfBase64(''); setNombreArchivo('') }}>
                    Cambiar
                  </button>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.navButtons}>
                <div />
                <button
                  className={styles.btnPrimary}
                  disabled={!pasoValido()}
                  onClick={() => setPaso(2)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Firmantes */}
          {paso === 2 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>¿Quién firma?</h2>
              <p className={styles.cardDesc}>Agregá los datos de cada firmante</p>

              <div className={styles.firmantesLista}>
                {firmantes.map((f, i) => (
                  <div key={i} className={styles.firmanteRow}>
                    <div className={styles.firmanteNum}>{i + 1}</div>
                    <div className={styles.firmanteFields}>
                      <input
                        className={styles.input}
                        placeholder="Nombre completo"
                        value={f.nombre}
                        onChange={e => actualizarFirmante(i, 'nombre', e.target.value)}
                      />
                      <input
                        className={styles.input}
                        placeholder="Email"
                        type="email"
                        value={f.email}
                        onChange={e => actualizarFirmante(i, 'email', e.target.value)}
                      />
                    </div>
                    {firmantes.length > 1 && (
                      <button className={styles.btnRemove} onClick={() => eliminarFirmante(i)}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <button className={styles.btnAgregar} onClick={agregarFirmante}>
                + Agregar otro firmante
              </button>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.navButtons}>
                <button className={styles.btnGhost} onClick={() => setPaso(1)}>← Atrás</button>
                <button
                  className={styles.btnPrimary}
                  disabled={!pasoValido()}
                  onClick={() => setPaso(3)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Confirmar */}
          {paso === 3 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Confirmá el envío</h2>
              <p className={styles.cardDesc}>Revisá todo antes de enviar los mails</p>

              <div className={styles.resumen}>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Documento</span>
                  <span className={styles.resumenVal}>📄 {nombreArchivo}</span>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Firmantes</span>
                  <div>
                    {firmantes.map((f, i) => (
                      <div key={i} className={styles.resumenFirmante}>
                        <strong>{f.nombre}</strong> — {f.email}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Validez legal</span>
                  <span className={styles.resumenVal} style={{ color: '#00B4D8' }}>
                    Art. 5 · Ley 25.506 · Firma electrónica
                  </span>
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.navButtons}>
                <button className={styles.btnGhost} onClick={() => setPaso(2)}>← Atrás</button>
                <button
                  className={styles.btnPrimary}
                  disabled={cargando}
                  onClick={enviar}
                >
                  {cargando ? 'Enviando...' : '✉️ Enviar a firmar'}
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: Éxito */}
          {paso === 4 && resultado && (
            <div className={styles.card}>
              <div className={styles.exitoIcon}>✅</div>
              <h2 className={styles.cardTitle}>¡Solicitud enviada!</h2>
              <p className={styles.cardDesc}>
                {firmantes.length === 1
                  ? 'El firmante recibió el mail con el link para firmar.'
                  : `Los ${firmantes.length} firmantes recibieron el mail con el link para firmar.`}
              </p>
              <div className={styles.certBlock}>
                <div className={styles.certRow}>
                  <span className={styles.certKey}>ID solicitud</span>
                  <span className={styles.certVal}>{resultado.id}</span>
                </div>
                <div className={styles.certRow}>
                  <span className={styles.certKey}>SHA-256</span>
                  <span className={styles.certVal}>{resultado.hash?.substring(0, 40)}...</span>
                </div>
                <div className={styles.certRow}>
                  <span className={styles.certKey}>Timestamp</span>
                  <span className={styles.certVal}>{new Date(resultado.timestamp).toLocaleString('es-AR')}</span>
                </div>
                <div className={styles.certRow}>
                  <span className={styles.certKey}>Marco legal</span>
                  <span className={styles.certVal}>Art. 5 · Ley 25.506</span>
                </div>
              </div>
              <button className={styles.btnPrimary} style={{ marginTop: 20 }} onClick={reset}>
                + Nuevo documento
              </button>
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          SafeContract © {new Date().getFullYear()} · SGS World Legaltech · Firma electrónica Ley 25.506
        </footer>
      </div>
    </>
  )
}
