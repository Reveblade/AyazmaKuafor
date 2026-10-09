import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/ui/Section';
import { api } from '@/lib/api';
import { formatWorkingHoursDisplay } from '@/lib/workingHours';
import { OWNER, PHONE, SHOP_NAME, WHATSAPP_URL } from '@/lib/utils';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const { data: workingHours } = useQuery({
    queryKey: ['working-hours'],
    queryFn: api.getWorkingHours,
    staleTime: 5 * 60_000,
  });

  const dayNames = t('contact.dayNames', { returnObjects: true }) as string[];
  const twoDaySeparator = t('contact.dayJoiner', { defaultValue: ' & ' });

  const hoursDisplay = workingHours?.length
    ? formatWorkingHoursDisplay(
        workingHours,
        dayNames,
        (days, open, close) => t('contact.hoursRange', { days, open, close }),
        (days) => t('contact.closedDays', { days }),
        twoDaySeparator,
      )
    : null;

  return (
    <footer className="border-t border-border bg-surface">
      <Container className="py-12 grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="font-display text-xl uppercase tracking-wider text-accent mb-3">{SHOP_NAME}</h3>
          <p className="text-text-muted text-sm leading-relaxed">{OWNER}</p>
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-wider mb-3">{t('contact.address')}</h4>
          <p className="text-text-muted text-sm leading-relaxed">{t('contact.addressValue')}</p>
          <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="block mt-3 text-accent hover:text-accent-hover text-sm">
            {PHONE}
          </a>
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-wider mb-3">{t('contact.hours')}</h4>
          {hoursDisplay ? (
            <div className="space-y-1">
              {hoursDisplay.openLines.map((line) => (
                <p key={line} className="text-text-muted text-sm">
                  {line}
                </p>
              ))}
              {hoursDisplay.closedLines.map((line) => (
                <p key={line} className="text-text-muted text-sm">
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <>
              <p className="text-text-muted text-sm">{t('contact.hoursValue')}</p>
              <p className="text-text-muted text-sm mt-1">{t('contact.closed')}</p>
            </>
          )}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-accent hover:text-accent-hover text-sm uppercase tracking-wider"
          >
            WhatsApp
          </a>
        </div>
      </Container>
      <div className="border-t border-border py-4">
        <Container className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-text-muted text-center sm:text-left">
          <span className="sm:justify-self-start">© {year} {SHOP_NAME}. {t('footer.rights')}</span>
          <a
            href="https://reveblade.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent sm:justify-self-center sm:text-center"
          >
            Made By Reve
          </a>
          <Link to="/randevu" className="hover:text-accent sm:justify-self-end sm:text-right">
            {t('nav.booking')}
          </Link>
        </Container>
      </div>
    </footer>
  );
}
