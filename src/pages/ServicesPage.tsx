import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Service, type ServiceInput } from '@/lib/api';

const emptyService: ServiceInput = {
  name: { tr: '', en: '' },
  description: { tr: '', en: '' },
  price: 0,
  durationMinutes: 30,
  active: true,
  sortOrder: 0,
};

export function ServicesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceInput>(emptyService);
  const [isNew, setIsNew] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: adminApi.getServices,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: string; input: ServiceInput }) =>
      data.id
        ? adminApi.updateService(data.id, data.input)
        : adminApi.createService(data.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
      setIsNew(false);
      setForm(emptyService);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  const openEdit = (service: Service) => {
    setEditing(service);
    setIsNew(false);
    setForm({
      name: service.name,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes,
      active: service.active,
      sortOrder: service.sortOrder,
    });
  };

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ ...emptyService, sortOrder: (services?.length ?? 0) + 1 });
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl uppercase">Hizmetler</h1>
        <button onClick={openNew} className="px-4 py-2 bg-accent text-bg rounded-sm text-sm uppercase tracking-wider">
          Yeni Hizmet
        </button>
      </div>

      <div className="mt-8 grid gap-3">
        {services?.map((s) => (
          <div key={s.id} className="bg-surface border border-border rounded-sm p-4 flex justify-between items-center">
            <div>
              <p className="font-display uppercase">{s.name.tr}</p>
              <p className="text-sm text-text-muted">{s.price} ₺ · {s.durationMinutes} dk</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)} className="text-accent text-sm uppercase">Düzenle</button>
              <button onClick={() => deleteMutation.mutate(s.id)} className="text-danger text-sm uppercase">Sil</button>
            </div>
          </div>
        ))}
      </div>

      {(isNew || editing) && (
        <div className="fixed inset-0 bg-bg/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ id: editing?.id, input: form });
            }}
            className="bg-surface border border-border rounded-sm p-6 w-full max-w-md space-y-3"
          >
            <h2 className="font-display uppercase text-accent">{isNew ? 'Yeni Hizmet' : 'Düzenle'}</h2>
            <input placeholder="Ad (TR)" value={form.name.tr} onChange={(e) => setForm({ ...form, name: { ...form.name, tr: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input placeholder="Ad (EN)" value={form.name.en} onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input type="number" placeholder="Fiyat" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input type="number" placeholder="Süre (dk)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Aktif
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 bg-accent text-bg rounded-sm uppercase text-sm tracking-wider">Kaydet</button>
              <button type="button" onClick={() => { setIsNew(false); setEditing(null); }} className="flex-1 py-2 border border-border rounded-sm uppercase text-sm tracking-wider">İptal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
