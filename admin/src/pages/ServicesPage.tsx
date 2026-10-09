import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ServicesPageSkeleton } from '@/components/ui/Skeleton';
import { adminApi, type Service, type ServiceCategory, type ServiceInput, type ServiceCategoryInput, type ServiceCombo, type ServiceComboInput } from '@/lib/api';

const emptyService: ServiceInput = {
  categoryId: null,
  name: { tr: '', en: '' },
  description: { tr: '', en: '' },
  price: 0,
  durationMinutes: 30,
  active: true,
  sortOrder: 0,
};

const emptyCategory: ServiceCategoryInput = {
  name: { tr: '', en: '' },
  sortOrder: 0,
  active: true,
};

const emptyCombo: ServiceComboInput = {
  name: { tr: '', en: '' },
  serviceIds: [],
  discountAmount: 0,
  active: true,
  sortOrder: 0,
};

export function ServicesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceInput>(emptyService);
  const [isNew, setIsNew] = useState(false);

  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<ServiceCategoryInput>(emptyCategory);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const [editingCombo, setEditingCombo] = useState<ServiceCombo | null>(null);
  const [comboForm, setComboForm] = useState<ServiceComboInput>(emptyCombo);
  const [isNewCombo, setIsNewCombo] = useState(false);

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: adminApi.getServices,
    staleTime: 5 * 60_000,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: adminApi.getServiceCategories,
    staleTime: 5 * 60_000,
  });

  const { data: combos, isLoading: isLoadingCombos } = useQuery({
    queryKey: ['service-combos'],
    queryFn: adminApi.getServiceCombos,
    staleTime: 5 * 60_000,
  });

  const isLoading = isLoadingServices || isLoadingCategories || isLoadingCombos;

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

  const saveCategoryMutation = useMutation({
    mutationFn: (data: { id?: string; input: ServiceCategoryInput }) =>
      data.id
        ? adminApi.updateServiceCategory(data.id, data.input)
        : adminApi.createServiceCategory(data.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      setEditingCategory(null);
      setIsNewCategory(false);
      setCategoryForm(emptyCategory);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: adminApi.deleteServiceCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const saveComboMutation = useMutation({
    mutationFn: (data: { id?: string; input: ServiceComboInput }) =>
      data.id
        ? adminApi.updateServiceCombo(data.id, data.input)
        : adminApi.createServiceCombo(data.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-combos'] });
      setEditingCombo(null);
      setIsNewCombo(false);
      setComboForm(emptyCombo);
    },
  });

  const deleteComboMutation = useMutation({
    mutationFn: adminApi.deleteServiceCombo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-combos'] }),
  });

  const openEdit = (service: Service) => {
    setEditing(service);
    setIsNew(false);
    setForm({
      categoryId: service.categoryId,
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

  const categoryName = (id: string | null) =>
    categories?.find((c) => c.id === id)?.name.tr ?? '—';

  const serviceName = (id: string) =>
    services?.find((s) => s.id === id)?.name.tr ?? '—';

  const toggleComboService = (id: string) => {
    setComboForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((s) => s !== id)
        : [...prev.serviceIds, id],
    }));
  };

  return (
    <div>
      <PageHeader title="Hizmetler" />

      {isLoading ? (
        <ServicesPageSkeleton />
      ) : (
        <>
      <section className="mt-10">
        <SectionHeader
          title="Kategoriler"
          actions={
            <button
              onClick={() => { setIsNewCategory(true); setEditingCategory(null); setCategoryForm({ ...emptyCategory, sortOrder: (categories?.length ?? 0) + 1 }); }}
              className="self-start px-4 py-2 bg-accent text-bg rounded-sm text-sm uppercase tracking-wider"
            >
              Yeni Kategori
            </button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories?.map((cat) => (
            <div key={cat.id} className="bg-surface border border-border rounded-sm p-3 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-sm">
              <span className="font-display uppercase">{cat.name.tr}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingCategory(cat); setIsNewCategory(false); setCategoryForm({ name: cat.name, sortOrder: cat.sortOrder, active: cat.active }); }} className="text-accent text-xs uppercase">Düzenle</button>
                <button onClick={() => deleteCategoryMutation.mutate(cat.id)} className="text-danger text-xs uppercase">Sil</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title="Hizmet Listesi"
          actions={
            <button onClick={openNew} className="self-start px-4 py-2 bg-accent text-bg rounded-sm text-sm uppercase tracking-wider">
              Yeni Hizmet
            </button>
          }
        />
        <div className="grid gap-3">
          {services?.map((s) => (
            <div key={s.id} className="bg-surface border border-border rounded-sm p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
              <div>
                <p className="font-display uppercase">{s.name.tr}</p>
                <p className="text-xs text-accent mt-0.5">{categoryName(s.categoryId)}</p>
                <p className="text-sm text-text-muted mt-1">{s.description.tr}</p>
                <p className="text-sm text-text-muted mt-1">{s.price} ₺ · {s.durationMinutes} dk</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="text-accent text-sm uppercase">Düzenle</button>
                <button onClick={() => deleteMutation.mutate(s.id)} className="text-danger text-sm uppercase">Sil</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title="Kombo İndirimleri"
          description="Belirli hizmetler birlikte seçildiğinde otomatik indirim uygulanır."
          actions={
            <button
              onClick={() => {
                setIsNewCombo(true);
                setEditingCombo(null);
                setComboForm({ ...emptyCombo, sortOrder: (combos?.length ?? 0) + 1 });
              }}
              className="self-start px-4 py-2 bg-accent text-bg rounded-sm text-sm uppercase tracking-wider shrink-0"
            >
              Yeni Kombo
            </button>
          }
        />
        <div className="grid gap-3">
          {combos?.map((combo) => (
            <div key={combo.id} className="bg-surface border border-border rounded-sm p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
              <div>
                <p className="font-display uppercase">{combo.name.tr}</p>
                <p className="text-sm text-text-muted mt-1">
                  {combo.serviceIds.map((id) => serviceName(id)).join(' + ')}
                </p>
                <p className="text-sm text-accent mt-1">−{combo.discountAmount} ₺ indirim</p>
                {!combo.active && <p className="text-xs text-text-muted mt-1">Pasif</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingCombo(combo);
                    setIsNewCombo(false);
                    setComboForm({
                      name: combo.name,
                      serviceIds: combo.serviceIds,
                      discountAmount: combo.discountAmount,
                      active: combo.active,
                      sortOrder: combo.sortOrder,
                    });
                  }}
                  className="text-accent text-sm uppercase"
                >
                  Düzenle
                </button>
                <button onClick={() => deleteComboMutation.mutate(combo.id)} className="text-danger text-sm uppercase">Sil</button>
              </div>
            </div>
          ))}
          {!combos?.length && (
            <p className="text-sm text-text-muted">Henüz kombo indirimi tanımlanmadı.</p>
          )}
        </div>
      </section>
        </>
      )}

      {(isNew || editing) && (
        <div className="fixed inset-0 bg-bg/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ id: editing?.id, input: form });
            }}
            className="bg-surface border border-border rounded-sm p-6 w-full max-w-md space-y-3 my-8"
          >
            <h2 className="font-display uppercase text-accent">{isNew ? 'Yeni Hizmet' : 'Düzenle'}</h2>
            <select
              value={form.categoryId ?? ''}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
              className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm"
            >
              <option value="">Kategori seçin</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name.tr}</option>
              ))}
            </select>
            <input placeholder="Ad (TR)" value={form.name.tr} onChange={(e) => setForm({ ...form, name: { ...form.name, tr: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input placeholder="Ad (EN)" value={form.name.en} onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <textarea placeholder="Açıklama (TR)" value={form.description.tr} onChange={(e) => setForm({ ...form, description: { ...form.description, tr: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" rows={2} />
            <textarea placeholder="Açıklama (EN)" value={form.description.en} onChange={(e) => setForm({ ...form, description: { ...form.description, en: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" rows={2} />
            <div>
              <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">Fiyat</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full bg-bg border border-border rounded-sm px-3 py-2 pr-12 text-sm"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">TL</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">Süre</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="w-full bg-bg border border-border rounded-sm px-3 py-2 pr-12 text-sm"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">dk</span>
              </div>
            </div>
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

      {(isNewCategory || editingCategory) && (
        <div className="fixed inset-0 bg-bg/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCategoryMutation.mutate({ id: editingCategory?.id, input: categoryForm });
            }}
            className="bg-surface border border-border rounded-sm p-6 w-full max-w-sm space-y-3"
          >
            <h2 className="font-display uppercase text-accent">{isNewCategory ? 'Yeni Kategori' : 'Kategori Düzenle'}</h2>
            <input placeholder="Ad (TR)" value={categoryForm.name.tr} onChange={(e) => setCategoryForm({ ...categoryForm, name: { ...categoryForm.name, tr: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input placeholder="Ad (EN)" value={categoryForm.name.en} onChange={(e) => setCategoryForm({ ...categoryForm, name: { ...categoryForm.name, en: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input type="number" placeholder="Sıra" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={categoryForm.active} onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })} />
              Aktif
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 bg-accent text-bg rounded-sm uppercase text-sm tracking-wider">Kaydet</button>
              <button type="button" onClick={() => { setIsNewCategory(false); setEditingCategory(null); }} className="flex-1 py-2 border border-border rounded-sm uppercase text-sm tracking-wider">İptal</button>
            </div>
          </form>
        </div>
      )}

      {(isNewCombo || editingCombo) && (
        <div className="fixed inset-0 bg-bg/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (comboForm.serviceIds.length < 2) {
                alert('En az 2 hizmet seçin.');
                return;
              }
              saveComboMutation.mutate({ id: editingCombo?.id, input: comboForm });
            }}
            className="bg-surface border border-border rounded-sm p-6 w-full max-w-md space-y-3 my-8"
          >
            <h2 className="font-display uppercase text-accent">{isNewCombo ? 'Yeni Kombo İndirimi' : 'Kombo Düzenle'}</h2>
            <input placeholder="Ad (TR)" value={comboForm.name.tr} onChange={(e) => setComboForm({ ...comboForm, name: { ...comboForm.name, tr: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <input placeholder="Ad (EN)" value={comboForm.name.en} onChange={(e) => setComboForm({ ...comboForm, name: { ...comboForm.name, en: e.target.value } })} className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm" required />
            <div>
              <p className="text-sm text-text-muted uppercase tracking-wider mb-2">Hizmetler (en az 2)</p>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-sm p-2">
                {services?.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm py-1 px-1 cursor-pointer hover:bg-bg/50 rounded-sm">
                    <input
                      type="checkbox"
                      checked={comboForm.serviceIds.includes(s.id)}
                      onChange={() => toggleComboService(s.id)}
                    />
                    {s.name.tr} ({s.price} ₺)
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-muted uppercase tracking-wider mb-2">İndirim Tutarı</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={comboForm.discountAmount || ''}
                  onChange={(e) => setComboForm({ ...comboForm, discountAmount: Number(e.target.value) })}
                  className="w-full bg-bg border border-border rounded-sm px-3 py-2 pr-12 text-sm"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">TL</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={comboForm.active} onChange={(e) => setComboForm({ ...comboForm, active: e.target.checked })} />
              Aktif
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 bg-accent text-bg rounded-sm uppercase text-sm tracking-wider">Kaydet</button>
              <button type="button" onClick={() => { setIsNewCombo(false); setEditingCombo(null); }} className="flex-1 py-2 border border-border rounded-sm uppercase text-sm tracking-wider">İptal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
