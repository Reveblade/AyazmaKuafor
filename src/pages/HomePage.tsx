import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { api } from '@/lib/api';
import { getLocale } from '@/i18n';
import { formatPrice, localized, ADDRESS } from '@/lib/utils';
import { heroImage } from '@/data/images';

export function HomePage() {
  const { t } = useTranslation();
  const locale = getLocale();
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });

  const featured = services?.slice(0, 3) ?? [];

  return (
    <>
      <section className="relative min-h-dvh flex items-center">
        <div className="absolute inset-0">
          <OptimizedImage
            src={heroImage.src}
            alt={heroImage.alt}
            width={heroImage.width}
            height={heroImage.height}
            className="w-full h-full"
            priority
          />
          <div className="absolute inset-0 bg-bg/70" />
        </div>
        <Container className="relative z-10 py-24">
          <p className="font-display text-accent uppercase tracking-[0.2em] text-sm mb-4">İzmir · Karabağlar</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase max-w-3xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-text-muted max-w-xl leading-relaxed">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/randevu">
              <Button size="lg">{t('hero.ctaBook')}</Button>
            </Link>
            <Link to="/hizmetler">
              <Button variant="secondary" size="lg">{t('hero.ctaServices')}</Button>
            </Link>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <h2 className="font-display text-3xl md:text-4xl uppercase">{t('home.featured')}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((service) => (
              <Card key={service.id} className="flex flex-col">
                <h3 className="font-display text-xl uppercase text-accent">
                  {localized(service.name, locale)}
                </h3>
                <p className="mt-2 text-text-muted text-sm flex-1">
                  {localized(service.description, locale)}
                </p>
                <p className="mt-4 font-display text-2xl">{formatPrice(service.price, locale)}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-surface">
        <Container className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl uppercase">{t('home.locationTitle')}</h2>
            <p className="mt-4 text-text-muted">{t('home.locationText')}</p>
            <p className="mt-4 text-text">{ADDRESS}</p>
            <Link to="/iletisim" className="inline-block mt-6">
              <Button variant="secondary">{t('nav.contact')}</Button>
            </Link>
          </div>
          <div className="aspect-video border border-border rounded-sm overflow-hidden">
            <iframe
              title="Ayazma Location"
              src="https://maps.google.com/maps?q=G%C3%BCnaltay,+4765.+Sk.+58%2FA,+35000+Karaba%C4%9Flar%2F%C4%B0zmir&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
