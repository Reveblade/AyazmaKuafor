import { useEffect, useLayoutEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  formatAppointmentDate,
  statusLabels,
} from '@/components/appointments/AppointmentCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog } from '@/components/ui/Dialog';
import {
  CustomerDetailSkeleton,
  CustomerListSkeleton,
} from '@/components/ui/Skeleton';
import { adminApi, type Customer, type CustomerDetail, type CustomerInput, type PaginatedCustomers } from '@/lib/api';
import {
  formatPhoneDisplay,
  formatPhoneFull,
  isValidTurkishMobile,
  parsePhoneDigits,
  phoneDigitsFromStored,
} from '@/lib/phone';
import { cn } from '@/lib/utils';
import { useMinimumLoading } from '@/hooks/useMinimumLoading';

const MIN_DETAIL_LOADING_MS = 400;

const panelShellClass =
  'border border-border rounded-sm bg-surface flex flex-col min-h-0 h-full overflow-hidden';

function normalizeCustomersPage(data: PaginatedCustomers | Customer[] | undefined) {
  if (!data) return { items: [] as Customer[], totalPages: 1 };
  if (Array.isArray(data)) return { items: data, totalPages: 1 };
  return { items: data.items, totalPages: data.totalPages };
}

interface AddDebtDialogProps {
  open: boolean;
  customerName: string;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => void;
  isPending: boolean;
  error?: string;
}

function AddDebtDialog({
  open,
  customerName,
  onClose,
  onSubmit,
  isPending,
  error,
}: AddDebtDialogProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setAmount('');
      setNote('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit(parsed, note.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} title="Borç Ekle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-muted">
          <span className="font-display uppercase text-text">{customerName}</span> için borç kaydı
        </p>

        <div>
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">
            Tutar (₺)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
            className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text tabular-nums"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">
            Not (isteğe bağlı)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text resize-none"
            placeholder="Örn. Saç kesimi"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 border border-border rounded-sm text-sm uppercase tracking-wider text-text-muted hover:text-text disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isPending || !amount.trim()}
            className="flex-1 px-4 py-2.5 bg-warning/20 text-warning border border-warning/40 rounded-sm text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor...' : 'Borç Ekle'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

interface CustomerDetailPanelProps {
  customerId: string | null;
  loading?: boolean;
  onDeleted: () => void;
}

export function CustomerDetailPanel({ customerId, loading: loadingProp, onDeleted }: CustomerDetailPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [error, setError] = useState('');
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [debtError, setDebtError] = useState('');

  const { data: customerData, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => adminApi.getCustomer(customerId!),
    enabled: !!customerId,
  });

  const customerReady = customerData?.id === customerId;
  const customer = customerReady ? customerData : undefined;
  const detailLoading = loadingProp ?? (!!customerId && !customerReady && !isError);

  useLayoutEffect(() => {
    setFirstName('');
    setLastName('');
    setPhoneDigits('');
    setError('');
    setDebtDialogOpen(false);
    setDebtError('');
  }, [customerId]);

  useEffect(() => {
    if (!customer || customer.id !== customerId) return;
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setPhoneDigits(phoneDigitsFromStored(customer.phone));
    setError('');
  }, [customer, customerId]);

  const updateMutation = useMutation({
    mutationFn: (input: CustomerInput) => adminApi.updateCustomer(customerId!, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<CustomerDetail>(['customer', customerId], (prev) =>
        prev ? { ...prev, ...updated } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setPhoneDigits(phoneDigitsFromStored(updated.phone));
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteCustomer(customerId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onDeleted();
    },
    onError: (err: Error) => setError(err.message),
  });

  const addDebtMutation = useMutation({
    mutationFn: (data: { amount: number; note: string }) =>
      adminApi.addCustomerDebt(customerId!, { amount: data.amount, note: data.note || undefined }),
    onSuccess: (detail) => {
      queryClient.setQueryData(['customer', customerId], detail);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDebtDialogOpen(false);
      setDebtError('');
    },
    onError: (err: Error) => setDebtError(err.message),
  });

  if (!customerId) {
    return (
      <div className={cn(panelShellClass, 'items-center justify-center p-6')}>
        <p className="text-text-muted text-sm">Detay için listeden bir müşteri seçin.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!customer) return;
    setError('');
    if (firstName.trim().length < 2) {
      setError('Ad en az 2 karakter olmalı');
      return;
    }
    if (lastName.trim().length < 2) {
      setError('Soyad en az 2 karakter olmalı');
      return;
    }
    if (!isValidTurkishMobile(phoneDigits)) {
      setError('Geçerli bir cep telefonu numarası girin');
      return;
    }
    updateMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: formatPhoneFull(phoneDigits),
    });
  };

  const handleDelete = () => {
    if (!customer) return;
    const name = `${customer.firstName} ${customer.lastName}`;
    if (!window.confirm(`${name} müşterisini silmek istediğinize emin misiniz? Randevu kayıtları silinmez.`)) {
      return;
    }
    deleteMutation.mutate();
  };

  const isDirty = customer
    ? firstName !== customer.firstName ||
      lastName !== customer.lastName ||
      phoneDigits !== phoneDigitsFromStored(customer.phone)
    : false;

  return (
    <>
      <div className={panelShellClass}>
        {detailLoading ? (
          <CustomerDetailSkeleton className="border-0 rounded-none h-full" />
        ) : !customer ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-text-muted text-sm">Müşteri bilgisi yüklenemedi.</p>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 h-full">
        <div className="p-4 sm:p-5 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg uppercase truncate">
                {customer.firstName} {customer.lastName}
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Kayıt: {format(parseISO(customer.createdAt), 'd MMM yyyy', { locale: tr })}
              </p>
              <p className={cn(
                'text-sm mt-2 tabular-nums font-medium',
                customer.debtBalance > 0 ? 'text-warning' : 'text-text-muted',
              )}>
                Borç: {customer.debtBalance} ₺
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDebtError('');
                  setDebtDialogOpen(true);
                }}
                className="px-3 py-1.5 text-sm uppercase tracking-wider text-warning border border-warning/40 rounded-sm hover:bg-warning/10"
              >
                Borç Ekle
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-sm uppercase tracking-wider text-danger border border-danger/40 rounded-sm hover:bg-danger/10 disabled:opacity-50"
              >
                Sil
              </button>
            </div>
          </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">Ad</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">Soyad</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">Telefon</label>
          <div className="flex items-center bg-bg border border-border rounded-sm overflow-hidden">
            <span className="px-3 py-2 text-sm text-text-muted border-r border-border shrink-0">+90</span>
            <input
              type="tel"
              inputMode="numeric"
              value={formatPhoneDisplay(phoneDigits)}
              onChange={(e) => setPhoneDigits(parsePhoneDigits(e.target.value))}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-text outline-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 min-h-[2.625rem]">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || !isDirty}
            className={cn(
              'px-4 py-2 bg-accent/20 text-accent border border-accent/40 rounded-sm text-sm uppercase tracking-wider disabled:opacity-50 transition-opacity duration-150',
              isDirty || updateMutation.isPending ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
          >
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6">
        <section>
          <h3 className="font-display text-sm uppercase tracking-wider mb-3">
            Borç Geçmişi ({customer.debtHistory.length})
          </h3>
          {customer.debtHistory.length === 0 ? (
            <p className="text-sm text-text-muted">Henüz borç kaydı yok.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {customer.debtHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-bg/60 border border-border rounded-sm px-3 py-2.5 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm tabular-nums text-warning font-medium">+{entry.amount} ₺</p>
                    {entry.note && (
                      <p className="text-sm text-text-muted mt-0.5">{entry.note}</p>
                    )}
                  </div>
                  <p className="text-xs text-text-muted shrink-0 tabular-nums">
                    {format(parseISO(entry.createdAt), 'd MMM yyyy HH:mm', { locale: tr })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="font-display text-sm uppercase tracking-wider mb-3">
            Randevu Geçmişi ({customer.appointments.length})
          </h3>

        {customer.appointments.length === 0 ? (
          <p className="text-sm text-text-muted">Bu müşteriye ait randevu kaydı yok.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {customer.appointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/randevular?tab=past&highlight=${appointment.id}&date=${appointment.date}`,
                  )
                }
                className="bg-bg/60 border border-border rounded-sm p-4 text-left w-full transition-colors hover:border-accent/50 hover:bg-accent/5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm uppercase">
                      {formatAppointmentDate(appointment.date)}
                    </p>
                    <p className="text-sm tabular-nums mt-1">
                      {appointment.startTime} – {appointment.endTime}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-text-muted shrink-0">
                    {statusLabels[appointment.status]}
                  </span>
                </div>
                {appointment.services && appointment.services.length > 0 && (
                  <p className="text-sm text-text-muted mt-2">
                    {appointment.services.map((s) => s.name.tr).join(', ')}
                    {appointment.totalPrice != null && (
                      <span className="ml-2 tabular-nums">{appointment.totalPrice} ₺</span>
                    )}
                  </p>
                )}
                {appointment.notes && (
                  <p className="text-sm mt-2 italic text-text-muted">&ldquo;{appointment.notes}&rdquo;</p>
                )}
              </button>
            ))}
          </div>
        )}
        </section>
      </div>
          </div>
        )}
      </div>

      {customer && (
      <AddDebtDialog
        open={debtDialogOpen}
        customerName={`${customer.firstName} ${customer.lastName}`}
        onClose={() => setDebtDialogOpen(false)}
        onSubmit={(amount, note) => addDebtMutation.mutate({ amount, note })}
        isPending={addDebtMutation.isPending}
        error={debtError}
      />
      )}
    </>
  );
}

interface CustomerListItemProps {
  customer: Customer;
  selected: boolean;
  loading?: boolean;
  onSelect: () => void;
}

function CustomerListItem({ customer, selected, loading, onSelect }: CustomerListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border/60 border-l-2 transition-colors',
        selected
          ? 'bg-accent/10 border-l-accent'
          : 'hover:bg-surface-elevated border-l-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display uppercase text-sm sm:text-base truncate min-w-0">
          {customer.firstName} {customer.lastName}
        </p>
        {loading && (
          <div
            className="h-3.5 w-3.5 border-2 border-border border-t-accent rounded-full animate-spin shrink-0"
            aria-label="Yükleniyor"
          />
        )}
      </div>
      <p className="text-sm text-text-muted mt-0.5">{customer.phone}</p>
      {customer.debtBalance > 0 && (
        <p className="text-xs text-warning tabular-nums mt-1">{customer.debtBalance} ₺ borç</p>
      )}
    </button>
  );
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDetailId, setPendingDetailId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: () =>
      adminApi.getCustomers({
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      }),
    placeholderData: keepPreviousData,
  });

  const { items: customers, totalPages } = normalizeCustomersPage(data);
  const listLoading = isLoading && !data;

  const { data: selectedDetail, isError: detailError } = useQuery({
    queryKey: ['customer', selectedId],
    queryFn: () => adminApi.getCustomer(selectedId!),
    enabled: !!selectedId,
  });

  const detailReady = !!selectedId && selectedDetail?.id === selectedId;
  const detailFetching =
    !!selectedId &&
    !detailError &&
    (pendingDetailId === selectedId || !detailReady);
  const detailLoading = useMinimumLoading(detailFetching, MIN_DETAIL_LOADING_MS, selectedId);

  const handleSelectCustomer = (id: string) => {
    setSelectedId(id);
    setPendingDetailId(id);
  };

  useEffect(() => {
    if (detailReady && pendingDetailId === selectedId) {
      setPendingDetailId(null);
    }
  }, [detailReady, pendingDetailId, selectedId]);

  useEffect(() => {
    if (customers.length === 0) {
      setSelectedId(null);
      setPendingDetailId(null);
      return;
    }
    if (selectedId && !customers.some((c) => c.id === selectedId)) {
      setSelectedId(null);
      setPendingDetailId(null);
    }
  }, [customers, selectedId]);

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-4rem)] min-h-0 overflow-hidden">
      <PageHeader className="mb-4 shrink-0" title="Müşteriler" />

      <div className="shrink-0 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad, soyad veya telefon ile ara..."
          className="w-full max-w-md bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text"
        />
      </div>

      <div className="flex-1 min-h-0 grid gap-4 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        <div className={panelShellClass}>
          {listLoading ? (
            <CustomerListSkeleton count={8} />
          ) : customers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-text-muted text-center">
                {debouncedSearch ? 'Aramanızla eşleşen müşteri bulunamadı.' : 'Henüz kayıtlı müşteri yok.'}
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'flex-1 min-h-0 overflow-y-auto transition-opacity duration-150',
                  isFetching && data ? 'opacity-60' : 'opacity-100',
                )}
              >
                {customers.map((customer) => (
                  <CustomerListItem
                    key={customer.id}
                    customer={customer}
                    selected={selectedId === customer.id}
                    loading={selectedId === customer.id && detailLoading}
                    onSelect={() => handleSelectCustomer(customer.id)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 p-3 border-t border-border shrink-0">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm text-text-muted hover:text-accent disabled:opacity-30"
                  >
                    ‹ Önceki
                  </button>
                  <span className="text-xs text-text-muted tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm text-text-muted hover:text-accent disabled:opacity-30"
                  >
                    Sonraki ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <CustomerDetailPanel
          customerId={selectedId}
          loading={detailLoading}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}
