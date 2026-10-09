import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { cn } from '@/lib/cn';
import { formatPhoneFull, phoneDigitsFromStored } from '@/lib/phone';
import { formatPersonName } from '@/lib/utils';
import { getSavedContacts, removeSavedContact, type SavedContact } from '@/lib/session';

export type ContactFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
};

interface BookingContactFormProps {
  control: Control<ContactFormData>;
  errors: FieldErrors<ContactFormData>;
  onSelectContact: (contact: SavedContact | null) => void;
}

export function BookingContactForm({
  control,
  errors,
  onSelectContact,
}: BookingContactFormProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<SavedContact[]>(() => getSavedContacts());
  const [selectedId, setSelectedId] = useState<string | null>(
    () => contacts[0]?.id ?? null,
  );

  const refreshContacts = () => setContacts(getSavedContacts());

  const selectContact = (contact: SavedContact) => {
    setSelectedId(contact.id);
    onSelectContact(contact);
  };

  const selectCustom = () => {
    setSelectedId(null);
    onSelectContact(null);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSavedContact(id);
    refreshContacts();
    if (selectedId === id) {
      setSelectedId(null);
      onSelectContact(null);
    }
  };

  return (
    <div className="space-y-4">
      {contacts.length > 0 && (
        <div>
          <p className="text-sm text-text-muted uppercase tracking-wider mb-2">
            {t('booking.savedContacts')}
          </p>
          <div className="flex flex-wrap gap-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => selectContact(contact)}
                className={cn(
                  'group relative flex items-center gap-2 pl-3 pr-8 py-2 border rounded-sm text-sm transition-colors',
                  selectedId === contact.id
                    ? 'border-accent bg-accent/10 text-text'
                    : 'border-border bg-surface text-text-muted hover:border-accent/50',
                )}
              >
                <span className="font-medium truncate max-w-[120px] uppercase">
                  {formatPersonName(contact.firstName)} {formatPersonName(contact.lastName)}
                </span>
                <span className="text-xs text-text-muted truncate max-w-[100px]">
                  {formatPhoneFull(phoneDigitsFromStored(contact.phone))}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t('booking.removeContact')}
                  onClick={(e) => handleRemove(e, contact.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRemove(e as unknown as React.MouseEvent, contact.id);
                    }
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-sm text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={selectCustom}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 border rounded-sm text-sm transition-colors',
                selectedId === null
                  ? 'border-accent bg-accent/10 text-text'
                  : 'border-border bg-surface text-text-muted hover:border-accent/50',
              )}
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {t('booking.newContact')}
            </button>
          </div>
        </div>
      )}

      <Controller
        name="firstName"
        control={control}
        render={({ field }) => (
          <Input
            label={t('booking.firstName')}
            {...field}
            className="uppercase"
            onChange={(e) => field.onChange(formatPersonName(e.target.value))}
            error={errors.firstName?.message}
          />
        )}
      />
      <Controller
        name="lastName"
        control={control}
        render={({ field }) => (
          <Input
            label={t('booking.lastName')}
            {...field}
            className="uppercase"
            onChange={(e) => field.onChange(formatPersonName(e.target.value))}
            error={errors.lastName?.message}
          />
        )}
      />
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <PhoneInput
            label={t('booking.phone')}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.phone?.message}
          />
        )}
      />
      <div>
        <label className="text-sm text-text-muted uppercase tracking-wider">{t('booking.notes')}</label>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              rows={3}
              className="mt-1.5 w-full bg-surface border border-border rounded-sm px-4 py-2.5 text-text focus:outline-none focus:border-accent"
            />
          )}
        />
      </div>
    </div>
  );
}
