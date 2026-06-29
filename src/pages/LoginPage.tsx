import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { connectAdminSocket } from '@/lib/socket';

export function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(pin);
      connectAdminSocket();
      navigate('/');
    } catch {
      setError('Geçersiz PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-border rounded-sm p-8">
        <h1 className="font-display text-2xl uppercase tracking-wider text-accent text-center mb-6">
          Ayazma Admin
        </h1>
        <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">PIN</label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full bg-bg border border-border rounded-sm px-4 py-2.5 text-text focus:outline-none focus:border-accent mb-4"
          autoFocus
        />
        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-bg font-display uppercase tracking-wider py-2.5 rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Giriş...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
