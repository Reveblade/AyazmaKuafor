import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Dialog } from '@/components/ui/Dialog';
import { PasswordField } from '@/components/ui/PasswordField';

export function ResetSystemSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const resetMutation = useMutation({
    mutationFn: adminApi.resetSystem,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setPassword('');
      setError('');
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    if (!dialogOpen) {
      setPassword('');
      setError('');
    }
  }, [dialogOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError('');
    resetMutation.mutate(password);
  };

  return (
    <section className="flex flex-col h-full">
      <SectionHeader
        title="Sistemi Sıfırla"
        description="Tüm randevular, müşteriler ve özel ayarlar silinir. Varsayılan hizmetler ve haftalık saatler geri yüklenir."
      />
      <div className="flex flex-col flex-1 bg-surface border border-border rounded-sm p-6">
        <p className="text-sm text-text-muted flex-1">
          Bu işlem geri alınamaz. Devam etmek için admin şifrenizi girmeniz gerekir.
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="w-full mt-4 bg-danger/10 text-danger border border-danger/40 font-display uppercase tracking-wider py-2.5 rounded-sm hover:bg-danger/20 transition-colors"
        >
          Sistemi Sıfırla
        </button>
      </div>

      <Dialog open={dialogOpen} onClose={() => !resetMutation.isPending && setDialogOpen(false)} title="Sistemi Sıfırla">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-muted">
            Tüm veriler silinecek ve sistem varsayılan ayarlara dönecek. Bu işlem geri alınamaz.
          </p>

          <PasswordField
            label="Admin Şifresi"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            autoFocus
          />

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              disabled={resetMutation.isPending}
              className="flex-1 px-4 py-2.5 border border-border rounded-sm text-sm uppercase tracking-wider text-text-muted hover:text-text disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={resetMutation.isPending || !password.trim()}
              className="flex-1 px-4 py-2.5 bg-danger text-bg rounded-sm text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {resetMutation.isPending ? 'Sıfırlanıyor...' : 'Sistemi Sıfırla'}
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
