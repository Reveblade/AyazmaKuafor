import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { WeeklyHoursSettings } from '@/components/settings/WeeklyHoursSettings';

export function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const changeMutation = useMutation({
    mutationFn: adminApi.changePassword,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('Şifre başarıyla güncellendi.');
    },
    onError: (err: Error) => {
      setSuccess('');
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 4) {
      setError('Yeni şifre en az 4 karakter olmalı.');
      return;
    }

    changeMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Ayarlar</h1>

      <WeeklyHoursSettings />

      <section className="mt-12 max-w-md">
        <h2 className="font-display text-xl uppercase mb-4">Şifre Değiştir</h2>
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-sm p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">
              Mevcut Şifre
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-4 py-2.5 text-text focus:outline-none focus:border-accent"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">
              Yeni Şifre
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-4 py-2.5 text-text focus:outline-none focus:border-accent"
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">
              Yeni Şifre (Tekrar)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-4 py-2.5 text-text focus:outline-none focus:border-accent"
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-accent text-sm">{success}</p>}

          <button
            type="submit"
            disabled={changeMutation.isPending}
            className="w-full bg-accent text-bg font-display uppercase tracking-wider py-2.5 rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {changeMutation.isPending ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
        <p className="text-sm text-text-muted mt-3">
          Şifre en az 4 karakter olmalıdır. Harf, rakam ve özel karakter kullanabilirsiniz.
        </p>
      </section>
    </div>
  );
}
