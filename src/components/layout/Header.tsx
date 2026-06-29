import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Container } from '@/components/ui/Section';
import { setLocale, getLocale } from '@/i18n';
import { cn } from '@/lib/cn';

const links = [
  { to: '/', key: 'home' },
  { to: '/hizmetler', key: 'services' },
  { to: '/galeri', key: 'gallery' },
  { to: '/iletisim', key: 'contact' },
  { to: '/randevu', key: 'booking' },
  { to: '/randevularim', key: 'myAppointments' },
] as const;

export function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const locale = getLocale();

  const toggleLocale = () => {
    const next = locale === 'tr' ? 'en' : 'tr';
    setLocale(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
      <Container className="flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="font-display text-2xl md:text-3xl tracking-widest uppercase text-accent">
          Ayazma
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map(({ to, key }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'text-sm uppercase tracking-wider transition-colors hover:text-accent',
                location.pathname === to ? 'text-accent' : 'text-text-muted',
              )}
            >
              {t(`nav.${key}`)}
            </Link>
          ))}
          <button
            onClick={toggleLocale}
            className="text-sm uppercase tracking-wider text-text-muted hover:text-accent border border-border px-2 py-1 rounded-sm"
          >
            {i18n.language === 'tr' ? 'EN' : 'TR'}
          </button>
        </nav>

        <button
          className="lg:hidden text-text p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <nav className="lg:hidden border-t border-border bg-surface">
          <Container className="py-4 flex flex-col gap-3">
            {links.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  'py-2 text-sm uppercase tracking-wider',
                  location.pathname === to ? 'text-accent' : 'text-text-muted',
                )}
              >
                {t(`nav.${key}`)}
              </Link>
            ))}
            <button onClick={toggleLocale} className="py-2 text-left text-sm uppercase tracking-wider text-text-muted">
              {i18n.language === 'tr' ? 'English' : 'Türkçe'}
            </button>
          </Container>
        </nav>
      )}
    </header>
  );
}
