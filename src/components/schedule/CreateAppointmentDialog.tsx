import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi, type CreateAppointmentInput, type Customer } from '@/lib/api';
import {
  formatPhoneDisplay,
  formatPhoneFull,
  isValidTurkishMobile,
  parsePhoneDigits,
  phoneDigitsFromStored,
} from '@/lib/phone';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

interface CreateAppointmentDialogProps {
  open: boolean;
  date: string;
  startTimes: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function CustomerSearchDropdown({
  anchorRef,
  customers,
  onSelect,
}: {
  anchorRef: RefObject<HTMLInputElement | null>;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef, customers]);

  if (!rect) return null;

  return createPortal(
    <ul
      className="fixed z-[200] border border-border rounded-sm bg-surface shadow-lg max-h-40 overflow-y-auto"
      style={{
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      }}
    >
      {customers.map((customer) => (
        <li key={customer.id}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(customer)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-surface-elevated"
          >
            <span className="font-display uppercase">
              {customer.firstName} {customer.lastName}
            </span>
            <span className="block text-xs text-text-muted mt-0.5">{customer.phone}</span>
          </button>
        </li>
      ))}
    </ul>,
    document.body,
  );
}

export function CreateAppointmentDialog({
  open,
  date,
  startTimes,
  onClose,
  onSuccess,
}: CreateAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [error, setError] = useState('');

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: adminApi.getServices,
    enabled: open,
  });

  const activeServices = services?.filter((s) => s.active) ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: customerMatches } = useQuery({
    queryKey: ['customers', 'search', debouncedSearch],
    queryFn: () => adminApi.searchCustomers(debouncedSearch),
    enabled: open && searchFocused && debouncedSearch.length >= 2,
  });

  useEffect(() => {
    if (!open) {
      setFirstName('');
      setLastName('');
      setPhoneDigits('');
      setSelectedServices([]);
      setNotes('');
      setSearch('');
      setDebouncedSearch('');
      setSearchFocused(false);
      setError('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<CreateAppointmentInput, 'startTime' | 'date'>) => {
      for (const startTime of startTimes) {
        await adminApi.createAppointment({ ...payload, date, startTime });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const fillCustomer = (customer: Customer) => {
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setPhoneDigits(phoneDigitsFromStored(customer.phone));
    setSearch('');
    setSearchFocused(false);
    setError('');
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (startTimes.length === 0) {
      setError('En az bir saat seçin');
      return;
    }
    if (!firstName.trim() || firstName.trim().length < 2) {
      setError('Ad en az 2 karakter olmalı');
      return;
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      setError('Soyad en az 2 karakter olmalı');
      return;
    }
    if (!isValidTurkishMobile(phoneDigits)) {
      setError('Geçerli bir cep telefonu numarası girin');
      return;
    }
    if (selectedServices.length === 0) {
      setError('En az bir hizmet seçin');
      return;
    }

    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: formatPhoneFull(phoneDigits),
      serviceIds: selectedServices,
      notes: notes.trim(),
      status: 'accepted',
    });
  };

  const formattedDate = format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr });
  const showSuggestions =
    searchFocused &&
    debouncedSearch.length >= 2 &&
    (customerMatches?.length ?? 0) > 0;

  return (
    <Dialog open={open} onClose={onClose} title="Randevu Oluştur">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-bg/60 border border-border rounded-sm px-3 py-3">
          <p className="text-xs uppercase tracking-wider text-text-muted mb-1">Tarih & Saat</p>
          <p className="font-display text-sm uppercase">{formattedDate}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {startTimes.map((time) => (
              <span
                key={time}
                className="inline-block px-2 py-1 text-sm font-mono tabular-nums bg-accent/10 text-accent border border-accent/30 rounded-sm"
              >
                {time}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">
            Müşteri ara
          </label>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Ad, soyad veya telefon..."
            className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text"
            autoComplete="off"
          />
          {showSuggestions && customerMatches && (
            <CustomerSearchDropdown
              anchorRef={searchInputRef}
              customers={customerMatches}
              onSelect={fillCustomer}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">Ad</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text"
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">Soyad</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">Telefon</label>
          <div className="flex items-center bg-bg border border-border rounded-sm overflow-hidden">
            <span className="px-3 py-2 text-sm text-text-muted border-r border-border shrink-0">+90</span>
            <input
              type="tel"
              inputMode="numeric"
              value={formatPhoneDisplay(phoneDigits)}
              onChange={(e) => setPhoneDigits(parsePhoneDigits(e.target.value))}
              placeholder="5XX XXX XX XX"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-text outline-none"
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">Hizmetler</label>
          {activeServices.length === 0 ? (
            <p className="text-sm text-text-muted">Aktif hizmet bulunamadı.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {activeServices.map((service) => {
                const selected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-2.5 border rounded-sm text-left text-sm transition-colors',
                      selected
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-accent/50',
                    )}
                  >
                    <span>{service.name.tr}</span>
                    <span className="text-xs text-text-muted shrink-0 tabular-nums">
                      {service.durationMinutes} dk · {service.price} ₺
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">
            Not (isteğe bağlı)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2.5 border border-border rounded-sm text-sm uppercase tracking-wider text-text-muted hover:text-text disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-accent/20 text-accent border border-accent/40 rounded-sm text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {createMutation.isPending
              ? 'Kaydediliyor...'
              : startTimes.length > 1
                ? `${startTimes.length} Randevu Oluştur`
                : 'Randevu Oluştur'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
