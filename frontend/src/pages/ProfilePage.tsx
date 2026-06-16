import { useState } from 'react';
import { Layout } from '../components/Layout';
import { authApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setMessage('');
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setMessage('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-infinito-navy mb-6">Mi Perfil</h2>

      <div className="card max-w-md mb-8">
        <div className="space-y-2 text-sm">
          <div><span className="text-gray-500">Usuario:</span> <strong>{user?.username}</strong></div>
          <div><span className="text-gray-500">Email:</span> <strong>{user?.email ?? '—'}</strong></div>
          <div><span className="text-gray-500">Rol:</span> <strong>{user?.role}</strong></div>
        </div>
      </div>

      <div className="card max-w-md">
        <h3 className="font-bold text-infinito-navy mb-4">Cambiar contraseña</h3>
        {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{message}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña actual</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar nueva contraseña</label>
            <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Actualizar contraseña</button>
        </form>
      </div>
    </Layout>
  );
}
