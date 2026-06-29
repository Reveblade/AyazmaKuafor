import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Container, Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { getLocale } from '@/i18n';
import { formatPrice, localized } from '@/lib/utils';

export function ServicesPage() {
  const { t } = useTranslation();
  const locale = getLocale();
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });

  return (
    <Section>
      <Container>
        <h1 className="font-display text-4xl md:text-5xl uppercase">{t('services.title')}</h1>
        <p className="mt-4 text-text-muted max-w-2xl">{t('services.subtitle')}</p>

        {isLoading && <p className="mt-12 text-text-muted">{t('common.loading')}</p>}
        {error && <p className="mt-12 text-danger">{t('common.error')}</p>}

        <div className="mt-12 grid gap-4">
          {services?.map((service) => (
            <Card key={service.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl uppercase text-accent">
                  {localized(service.name, locale)}
                </h2>
                <p className="mt-1 text-text-muted text-sm">
                  {localized(service.description, locale)}
                </p>
                <p className="mt-2 text-xs text-text-muted uppercase tracking-wider">
                  {t('services.duration', { minutes: service.durationMinutes })}
                </p>
              </div>
              <p className="font-display text-3xl shrink-0">{formatPrice(service.price, locale)}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
