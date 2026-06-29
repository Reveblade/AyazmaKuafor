import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Section';
import { setLocale, getLocale } from '@/i18n';
import { cn } from '@/lib/cn';

const TOP_THRESHOLD = 8;
const HOVER_ZONE = 80;
const HIDE_DELAY_MS = 5000;

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
  const [revealed, setRevealed] = useState(
    () => typeof window !== 'undefined' && window.scrollY <= TOP_THRESHOLD,
  );
  const [canAutoHide, setCanAutoHide] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inTriggerAreaRef = useRef(true);
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const locale = getLocale();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setCanAutoHide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const showHeader = () => {
      clearHideTimer();
      inTriggerAreaRef.current = true;
      revealedRef.current = true;
      setRevealed(true);
    };

    const scheduleHide = () => {
      if (hideTimerRef.current) return;

      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        inTriggerAreaRef.current = false;
        revealedRef.current = false;
        setRevealed(false);
      }, HIDE_DELAY_MS);
    };

    const leaveTriggerArea = () => {
      if (!inTriggerAreaRef.current) return;
      inTriggerAreaRef.current = false;
      scheduleHide();
    };

    const isInTriggerArea = (clientY: number, target: EventTarget | null) => {
      if (window.scrollY <= TOP_THRESHOLD) return true;
      if (clientY <= HOVER_ZONE) return true;
      if (target instanceof Node && headerRef.current?.contains(target)) return true;
      return false;
    };

    if (canAutoHide && window.scrollY > TOP_THRESHOLD) {
      revealedRef.current = false;
      setRevealed(false);
      inTriggerAreaRef.current = false;
    }

    const onScroll = () => {
      const y = window.scrollY;

      if (!canAutoHide) {
        clearHideTimer();
        inTriggerAreaRef.current = true;
        revealedRef.current = true;
        setRevealed(true);
        lastScrollY.current = y;
        return;
      }

      if (y <= TOP_THRESHOLD) {
        showHeader();
      } else if (y > lastScrollY.current + 4 && !hideTimerRef.current) {
        clearHideTimer();
        inTriggerAreaRef.current = false;
        revealedRef.current = false;
        setRevealed(false);
      }

      lastScrollY.current = y;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!canAutoHide) return;

      if (isInTriggerArea(event.clientY, event.target)) {
        showHeader();
        return;
      }

      leaveTriggerArea();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      clearHideTimer();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [canAutoHide]);

  const toggleLocale = () => {
    const next = locale === 'tr' ? 'en' : 'tr';
    setLocale(next);
  };

  const isVisible = !canAutoHide || revealed || open;

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur border-b border-border',
        'transition-transform duration-300 ease-out will-change-transform',
        isVisible ? 'translate-y-0 pointer-events-auto' : '-translate-y-full pointer-events-none',
      )}
    >
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
