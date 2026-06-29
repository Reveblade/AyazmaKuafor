import type { InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { formatPhoneDisplay, formatPhoneFull, parsePhoneDigits } from '@/lib/phone';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function PhoneInput({ label, value, onChange, error, className, id, onBlur, ...props }: PhoneInputProps) {
  const { t } = useTranslation();
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  const digits = parsePhoneDigits(value);
  const showMobileWarning = digits.length > 0 && digits[0] !== '5';
  const displayError = error ?? (showMobileWarning ? t('booking.phoneMobileOnly') : undefined);

  const handleChange = (raw: string) => {
    onChange(formatPhoneFull(parsePhoneDigits(raw)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex w-full bg-surface border border-border rounded-sm overflow-hidden focus-within:border-accent transition-colors',
          displayError && 'border-danger focus-within:border-danger',
        )}
      >
        <span className="px-4 py-2.5 bg-surface-elevated border-r border-border text-text-muted shrink-0 select-none">
          +90
        </span>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="5XX XXX XX XX"
          className={cn(
            'flex-1 min-w-0 bg-transparent px-4 py-2.5 text-text placeholder:text-text-muted focus:outline-none',
            className,
          )}
          value={formatPhoneDisplay(digits)}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          {...props}
        />
      </div>
      <span
        className={cn(
          'text-sm text-danger min-h-10 max-h-10 overflow-y-auto scrollbar-hidden block',
          !displayError && 'invisible',
        )}
      >
        {displayError || '\u00a0'}
      </span>
    </div>
  );
}
