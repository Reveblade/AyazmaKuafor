import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { WeeklyHoursSettings } from '@/components/settings/WeeklyHoursSettings';
import { ResetSystemSettings } from '@/components/settings/ResetSystemSettings';
import { PasswordField } from '@/components/ui/PasswordField';

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
      <PageHeader title="Ayarlar" />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="lg:row-span-2">
          <WeeklyHoursSettings />
        </div>

        <section className="flex flex-col h-full">
          <SectionHeader title="Şifre Değiştir" />
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 bg-surface border border-border rounded-sm p-6 space-y-4"
          >
            <div className="text-sm text-text-muted space-y-1 pb-4 border-b border-border">
              <p>Şifrenizi buradan değiştirin, lütfen güçlü bir şifre oluşturun.</p>
              <p>
                <a
                  href="https://reveblade.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                  Eğer şifrenizi unuttuysanız bizimle iletişime geçin.
                </a>
              </p>
            </div>

            <PasswordField
              label="Mevcut Şifre"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              required
            />
            <PasswordField
              label="Yeni Şifre"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              required
              minLength={4}
            />
            <PasswordField
              label="Yeni Şifre (Tekrar)"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
              minLength={4}
            />

            {error && <p className="text-danger text-sm">{error}</p>}
            {success && <p className="text-accent text-sm">{success}</p>}

            <p className="text-sm text-text-muted">
              Şifre en az 4 karakter olmalıdır. Harf, rakam ve özel karakter kullanabilirsiniz.
            </p>

            <button
              type="submit"
              disabled={changeMutation.isPending}
              className="w-full bg-accent text-bg font-display uppercase tracking-wider py-2.5 rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {changeMutation.isPending ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </section>

        <ResetSystemSettings />
      </div>
    </div>
  );
}
