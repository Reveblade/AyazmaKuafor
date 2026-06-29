import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { WeeklyHoursSettings } from '@/components/settings/WeeklyHoursSettings';

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
};

function PasswordField({ label, value, onChange, autoComplete, required, minLength }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-bg border border-border rounded-sm px-4 py-2.5 pr-11 text-text focus:outline-none focus:border-accent"
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

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

      <WeeklyHoursSettings />

      <section className="mt-10 max-w-md">
        <SectionHeader title="Şifre Değiştir" />
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-sm p-6 space-y-4">
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
