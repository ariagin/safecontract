// components/CapturaFirma.tsx
// Las 3 formas de firmar: manuscrita (canvas), tipeada (texto en cursiva),
// e imagen (subir PNG/JPG). Devuelve siempre un data URL de imagen PNG.
// La opcion "Subir imagen" tiene vista previa, quita el fondo blanco
// automaticamente y recorta los bordes vacios para que la firma quede limpia.
import { useRef, useState, useEffect } from 'react';

interface Props {
  onFirma: (dataUrl: string | null, tipo: string) => void;
}

export default function CapturaFirma({ onFirma }: Props) {
  const [tab, setTab] = useState<'dibujar' | 'tipear' | 'imagen'>('dibujar');
  const [texto, setTexto] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const hayTrazo = useRef(false);

  // estado de la pestaña "imagen"
  const [imgOriginal, setImgOriginal] = useState<HTMLImageElement | null>(null);
  const [quitarFondo, setQuitarFondo] = useState(true);
  const [umbral, setUmbral] = useState(220); // 0-255: que tan claro se considera "fondo"
  const [previa, setPrevia] = useState<string | null>(null);

  // ---- DIBUJAR ----
  useEffect(() => {
    if (tab !== 'dibujar') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.strokeStyle = '#071E3D';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tab]);

  const pos = (e: any, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches?.[0];
    return { x: (t ? t.clientX : e.clientX) - r.left, y: (t ? t.clientY : e.clientY) - r.top };
  };
  const start = (e: any) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const p = pos(e, canvas);
    dibujando.current = true; hayTrazo.current = true;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: any) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const p = pos(e, canvas);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const end = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (hayTrazo.current) onFirma(canvasRef.current!.toDataURL('image/png'), 'manuscrita');
  };
  const limpiar = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hayTrazo.current = false;
    onFirma(null, 'manuscrita');
  };

  // ---- TIPEAR ----
  const generarTipeada = (valor: string) => {
    setTexto(valor);
    if (!valor.trim()) { onFirma(null, 'tipeada'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#071E3D';
    ctx.font = 'italic 56px "Segoe Script", "Brush Script MT", cursive';
    ctx.textBaseline = 'middle';
    ctx.fillText(valor, 20, 100);
    onFirma(canvas.toDataURL('image/png'), 'tipeada');
  };

  // ---- IMAGEN: procesar (quitar fondo + recortar bordes vacios) ----
  const procesarImagen = (img: HTMLImageElement, borrarFondo: boolean, umbralLuz: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;

    // limites del contenido (para recortar bordes vacios)
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hayContenido = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const claro = r >= umbralLuz && g >= umbralLuz && b >= umbralLuz;
        if (borrarFondo && claro) {
          px[i + 3] = 0; // transparente
        } else {
          // es trazo (pixel oscuro): cuenta para el recorte
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hayContenido = true;
        }
      }
    }
    ctx.putImageData(data, 0, 0);

    // recortar a los limites del trazo (con un pequeno margen)
    if (!hayContenido) { minX = 0; minY = 0; maxX = canvas.width; maxY = canvas.height; }
    const margen = 10;
    const cx = Math.max(0, minX - margen);
    const cy = Math.max(0, minY - margen);
    const cw = Math.min(canvas.width, maxX + margen) - cx;
    const ch = Math.min(canvas.height, maxY + margen) - cy;

    const recorte = document.createElement('canvas');
    recorte.width = Math.max(1, cw);
    recorte.height = Math.max(1, ch);
    recorte.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return recorte.toDataURL('image/png');
  };

  // regenera la previa cuando cambian los ajustes
  useEffect(() => {
    if (tab !== 'imagen' || !imgOriginal) return;
    const dataUrl = procesarImagen(imgOriginal, quitarFondo, umbral);
    setPrevia(dataUrl);
    onFirma(dataUrl, 'imagen');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgOriginal, quitarFondo, umbral, tab]);

  const subirImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setImgOriginal(img);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="sig-tabs">
        <button className={`sig-tab ${tab === 'dibujar' ? 'active' : ''}`} onClick={() => setTab('dibujar')}>Dibujar</button>
        <button className={`sig-tab ${tab === 'tipear' ? 'active' : ''}`} onClick={() => setTab('tipear')}>Tipear</button>
        <button className={`sig-tab ${tab === 'imagen' ? 'active' : ''}`} onClick={() => setTab('imagen')}>Subir imagen</button>
      </div>

      {tab === 'dibujar' && (
        <div>
          <canvas
            ref={canvasRef}
            className="sig-pad"
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          />
          <div className="btn-row">
            <button className="btn btn-sec" onClick={limpiar}>Limpiar</button>
          </div>
        </div>
      )}

      {tab === 'tipear' && (
        <div>
          <input
            className="input"
            placeholder="Escribí tu nombre completo"
            value={texto}
            onChange={(e) => generarTipeada(e.target.value)}
          />
          {texto && (
            <div style={{ background: '#fff', borderRadius: 10, padding: '24px', marginTop: 12, textAlign: 'center' }}>
              <span style={{ fontFamily: '"Segoe Script","Brush Script MT",cursive', fontSize: 40, fontStyle: 'italic', color: '#071E3D' }}>{texto}</span>
            </div>
          )}
        </div>
      )}

      {tab === 'imagen' && (
        <div>
          <input type="file" accept="image/png,image/jpeg" onChange={subirImagen} className="input" />
          <p className="muted" style={{ marginTop: 8 }}>Subí una foto o escaneo de tu firma. Mejor con fondo blanco y buena luz.</p>

          {previa && (
            <div style={{ marginTop: 16 }}>
              <div className="label">Vista previa de tu firma</div>
              {/* fondo a cuadros para que se note la transparencia */}
              <div style={{
                marginTop: 6, borderRadius: 10, padding: 16, display: 'grid', placeItems: 'center',
                background: 'repeating-conic-gradient(#e7eef7 0% 25%, #cdd9e8 0% 50%) 50% / 20px 20px',
                minHeight: 140,
              }}>
                <img src={previa} alt="Vista previa de la firma" style={{ maxWidth: '100%', maxHeight: 160 }} />
              </div>

              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="qf" checked={quitarFondo} onChange={(e) => setQuitarFondo(e.target.checked)} />
                <label htmlFor="qf" className="muted" style={{ cursor: 'pointer' }}>Quitar fondo blanco automáticamente</label>
              </div>

              {quitarFondo && (
                <div style={{ marginTop: 12 }}>
                  <div className="label">Ajuste de fondo (si queda fondo, bajá; si se borran trazos, subí)</div>
                  <input type="range" min={120} max={250} value={umbral}
                    onChange={(e) => setUmbral(Number(e.target.value))}
                    style={{ width: '100%' }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
