// pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Logo from '@/components/Logo';

export default function Login() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión.');
        setCargando(false);
        return;
      }
      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      window.location.href = next;
    } catch {
      setError('Error de conexión. Probá de nuevo.');
      setCargando(false);
    }
  };

  return (
    <>
      <Head>
        <title>Ingresar · SafeContract</title>
      </Head>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#071E3D',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <form
          onSubmit={submit}
          style={{
            background: '#0c2a52',
            padding: '40px 36px',
            borderRadius: 14,
            width: 340,
            boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <Logo />
          </div>

          <h1 style={{ color: '#fff', fontSize: 18, textAlign: 'center', margin: '0 0 24px', fontWeight: 600 }}>
            Acceso del estudio
          </h1>

          <label style={{ display: 'block', color: '#9db4d1', fontSize: 13, marginBottom: 6 }}>Usuario</label>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
            style={inputStyle}
          />

          <label style={{ display: 'block', color: '#9db4d1', fontSize: 13, marginBottom: 6 }}>Clave</label>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#ff8080', fontSize: 13, margin: '4px 0 0' }}>{error}</p>
          )}

          <button type="submit" disabled={cargando} style={buttonStyle}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: 18,
  borderRadius: 8,
  border: '1px solid #1e3a5f',
  background: '#071E3D',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  marginTop: 6,
  borderRadius: 8,
  border: 'none',
  background: '#00B4D8',
  color: '#071E3D',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
};
