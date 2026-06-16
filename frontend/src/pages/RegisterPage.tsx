import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!/^[\p{L}\p{N}_.-]{3,30}$/u.test(trimmedUsername)) {
      setError('Usuario: 3-30 caracteres, solo letras, números, puntos, guiones o _ (sin espacios)');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!turnstileToken) {
      setError('Completa la verificación de seguridad');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(trimmedUsername, password, turnstileToken, email.trim() || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto card">
        <h2 className="text-2xl font-bold text-infinito-navy mb-6">Crear Cuenta</h2>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              placeholder="ej: juan_perez o María92"
            />
            <p className="text-xs text-gray-500 mt-1">
              3-30 caracteres. Letras (con tildes), números, punto, guion o _. Sin espacios.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (opcional)</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
            <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta? <Link to="/login" className="text-infinito-orange font-medium">Inicia sesión</Link>
        </p>
      </div>
    </Layout>
  );
}
