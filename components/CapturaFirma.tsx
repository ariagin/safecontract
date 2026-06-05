// components/CapturaFirma.tsx
// Las 3 formas de firmar: manuscrita (canvas), tipeada (texto en cursiva),
// e imagen (subir PNG/JPG). Devuelve siempre un data URL de imagen PNG
// listo para estampar en el PDF.
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
    dibujando.current = true;
    hayTrazo.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: any) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const p = pos(e, canvas);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
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

  // ---- IMAGEN ----
  const subirImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onFirma(ev.target?.result as string, 'imagen');
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
          <p className="muted" style={{ marginTop: 8 }}>Subí una foto o escaneo de tu firma (PNG o JPG). Idealmente con fondo claro o transparente.</p>
        </div>
      )}
    </div>
  );
}
