import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { calculatePricing } from '@/lib/pricing';
import { getLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatPrice, localized } from '@/lib/utils';

interface BookingPriceSummaryProps {
  selectedIds: string[];
  className?: string;
  variant?: 'default' | 'floating';
}

export function BookingPriceSummary({ selectedIds, className, variant = 'default' }: BookingPriceSummaryProps) {
  const { t } = useTranslation();
  const locale = getLocale();

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });

  const { data: combos } = useQuery({
    queryKey: ['service-combos'],
    queryFn: api.getServiceCombos,
  });

  const pricing = useMemo(() => {
    if (!services?.length || !selectedIds.length) return null;
    return calculatePricing(selectedIds, services, combos ?? []);
  }, [selectedIds, services, combos]);

  if (!pricing || !selectedIds.length) return null;

  const content = (
    <>
      <p className="text-xs uppercase tracking-wider text-text-muted">{t('booking.priceSummary')}</p>
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-text-muted min-w-0">{t('booking.subtotal')}</span>
        <span className="shrink-0 tabular-nums">{formatPrice(pricing.subtotal, locale)}</span>
      </div>
      {pricing.appliedCombos.map((combo) => (
        <div key={combo.id} className="flex justify-between gap-3 text-sm text-accent">
          <span className="min-w-0">{localized(combo.name, locale)}</span>
          <span className="shrink-0 tabular-nums">−{formatPrice(combo.discountAmount, locale)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-3 font-display uppercase pt-2 border-t border-border">
        <span className="min-w-0">{t('booking.total')}</span>
        <span className="shrink-0 tabular-nums">{formatPrice(pricing.total, locale)}</span>
      </div>
    </>
  );

  if (variant === 'floating') {
    return (
      <div
        className={cn(
          'fixed bottom-6 left-6 z-50 lg:hidden',
          'border border-border rounded-sm bg-surface p-4 shadow-lg space-y-2',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
          'min-w-[11.5rem] w-[calc(100vw-7rem)] max-w-[17rem]',
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={cn('border border-border rounded-sm bg-surface p-4 space-y-2', className)}>
      {content}
    </div>
  );
}
