import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { getLocale } from '@/i18n';
import { formatPrice, localized } from '@/lib/utils';
import type { Service } from '@/types';

interface ServiceCategoryPickerProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const UNCATEGORIZED = '__uncategorized__';

export function ServiceCategoryPicker({ selectedIds, onToggle }: ServiceCategoryPickerProps) {
  const { t } = useTranslation();
  const locale = getLocale();
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: api.getServiceCategories,
  });

  const grouped = useMemo(() => {
    if (!services?.length) return [];

    const byCategory = new Map<string, Service[]>();
    for (const service of services) {
      const key = service.categoryId ?? UNCATEGORIZED;
      const list = byCategory.get(key) ?? [];
      list.push(service);
      byCategory.set(key, list);
    }

    const result: { id: string; name: string; services: Service[] }[] = [];

    for (const cat of categories ?? []) {
      const catServices = byCategory.get(cat.id);
      if (catServices?.length) {
        result.push({
          id: cat.id,
          name: localized(cat.name, locale),
          services: catServices.sort((a, b) => a.sortOrder - b.sortOrder),
        });
        byCategory.delete(cat.id);
      }
    }

    const uncategorized = byCategory.get(UNCATEGORIZED);
    if (uncategorized?.length) {
      result.push({
        id: UNCATEGORIZED,
        name: t('services.uncategorized'),
        services: uncategorized.sort((a, b) => a.sortOrder - b.sortOrder),
      });
    }

    for (const [catId, catServices] of byCategory) {
      if (catId === UNCATEGORIZED) continue;
      const cat = categories?.find((c) => c.id === catId);
      result.push({
        id: catId,
        name: cat ? localized(cat.name, locale) : t('services.uncategorized'),
        services: catServices.sort((a, b) => a.sortOrder - b.sortOrder),
      });
    }

    return result;
  }, [services, categories, locale, t]);

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!services?.length) {
    return <p className="text-text-muted text-sm">{t('common.loading')}</p>;
  }

  return (
    <div className="border border-border rounded-sm bg-surface divide-y divide-border h-full overflow-y-auto scrollbar-hidden">
      {grouped.map((group) => {
        const isOpen = openCategories.has(group.id);
        const selectedInGroup = group.services.filter((s) => selectedIds.includes(s.id)).length;

        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggleCategory(group.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-elevated transition-colors"
            >
              <span className="font-display uppercase tracking-wider text-sm">{group.name}</span>
              <span className="flex items-center gap-2 text-xs text-text-muted shrink-0">
                {selectedInGroup > 0 && (
                  <span className="text-accent">{selectedInGroup} {t('services.selected')}</span>
                )}
                <span className="text-lg leading-none">{isOpen ? '−' : '+'}</span>
              </span>
            </button>

            {isOpen && (
              <div className="px-2 pb-2 space-y-1">
                {group.services.map((service) => {
                  const selected = selectedIds.includes(service.id);
                  const description = localized(service.description, locale);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => onToggle(service.id)}
                      className={cn(
                        'w-full text-left px-3 py-3 rounded-sm border transition-colors',
                        selected
                          ? 'border-accent bg-accent/10'
                          : 'border-transparent hover:border-border hover:bg-bg/50',
                      )}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="font-display uppercase text-sm">
                          {localized(service.name, locale)}
                        </span>
                        <span className="text-sm shrink-0">{formatPrice(service.price, locale)}</span>
                      </div>
                      {description && (
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
                      )}
                      <p className="text-xs text-text-muted/70 mt-1">
                        {t('services.duration', { minutes: service.durationMinutes })}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
