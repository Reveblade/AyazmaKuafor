import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Container, Section } from '@/components/ui/Section';
import { api } from '@/lib/api';
import { getLocale } from '@/i18n';
import { formatPrice, localized } from '@/lib/utils';
import type { Service } from '@/types';

const UNCATEGORIZED = '__uncategorized__';

export function ServicesPage() {
  const { t } = useTranslation();
  const locale = getLocale();
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const { data: services, isLoading, error } = useQuery({
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

  return (
    <Section>
      <Container>
        <h1 className="font-display text-4xl md:text-5xl uppercase">{t('services.title')}</h1>
        <p className="mt-4 text-text-muted max-w-2xl">{t('services.subtitle')}</p>

        {isLoading && <p className="mt-12 text-text-muted">{t('common.loading')}</p>}
        {error && <p className="mt-12 text-danger">{t('common.error')}</p>}

        <div className="mt-12 border border-border rounded-sm bg-surface divide-y divide-border max-w-3xl">
          {grouped.map((group) => {
            const isOpen = openCategories.has(group.id);

            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleCategory(group.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-elevated transition-colors"
                >
                  <span className="font-display text-xl uppercase text-accent">{group.name}</span>
                  <span className="text-xl text-text-muted leading-none">{isOpen ? '−' : '+'}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-4">
                    {group.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-border/50 last:border-0 last:pb-0"
                      >
                        <div>
                          <h2 className="font-display text-lg uppercase">
                            {localized(service.name, locale)}
                          </h2>
                          <p className="mt-1 text-text-muted text-sm leading-relaxed">
                            {localized(service.description, locale)}
                          </p>
                          <p className="mt-2 text-xs text-text-muted uppercase tracking-wider">
                            {t('services.duration', { minutes: service.durationMinutes })}
                          </p>
                        </div>
                        <p className="font-display text-2xl shrink-0">{formatPrice(service.price, locale)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
