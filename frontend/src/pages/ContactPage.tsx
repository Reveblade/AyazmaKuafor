import { useTranslation } from 'react-i18next';
import { Container, Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { OWNER, PHONE, WHATSAPP_URL } from '@/lib/utils';

export function ContactPage() {
  const { t } = useTranslation();

  return (
    <Section>
      <Container>
        <h1 className="font-display text-4xl md:text-5xl uppercase">{t('contact.title')}</h1>
        <p className="mt-4 text-text-muted max-w-2xl">{t('contact.subtitle')}</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="grid gap-4">
            <Card>
              <h2 className="font-display text-sm uppercase tracking-wider text-accent">{t('contact.address')}</h2>
              <p className="mt-2 text-text-muted">{t('contact.addressValue')}</p>
            </Card>
            <Card>
              <h2 className="font-display text-sm uppercase tracking-wider text-accent">{t('contact.phone')}</h2>
              <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="mt-2 block text-text hover:text-accent">
                {PHONE}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-accent hover:text-accent-hover text-sm"
              >
                WhatsApp
              </a>
            </Card>
            <Card>
              <h2 className="font-display text-sm uppercase tracking-wider text-accent">{t('contact.owner')}</h2>
              <p className="mt-2">{OWNER}</p>
            </Card>
            <Card>
              <h2 className="font-display text-sm uppercase tracking-wider text-accent">{t('contact.hours')}</h2>
              <p className="mt-2 text-text-muted">{t('contact.hoursValue')}</p>
              <p className="mt-1 text-text-muted text-sm">{t('contact.closed')}</p>
            </Card>
          </div>
          <div className="aspect-square lg:aspect-auto lg:min-h-[480px] border border-border rounded-sm overflow-hidden">
            <iframe
              title="Ayazma Location Map"
              src="https://maps.google.com/maps?q=G%C3%BCnaltay,+4765.+Sk.+58%2FA,+35000+Karaba%C4%9Flar%2F%C4%B0zmir&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full min-h-[480px] border-0"
              loading="lazy"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
