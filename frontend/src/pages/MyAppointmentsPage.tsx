import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Container, Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getSessionId } from '@/lib/session';
import { connectSocket } from '@/lib/socket';
import { getLocale } from '@/i18n';
import { formatDate, formatPrice, localized, PHONE, WHATSAPP_URL } from '@/lib/utils';
import type { Appointment } from '@/types';

const CANCELLABLE_STATUSES: Appointment['status'][] = ['pending', 'accepted'];

function patchAppointmentCache(
  queryClient: QueryClient,
  sessionId: string,
  updated: Appointment,
) {
  queryClient.setQueryData<Appointment[]>(['appointments', sessionId], (old) =>
    old?.map((a) =>
      a.id === updated.id ? { ...a, ...updated, services: updated.services ?? a.services } : a,
    ),
  );
}

function whatsappCancelUrl(appt: Appointment, locale: 'tr' | 'en') {
  const dateStr = formatDate(appt.date, locale);
  const services = appt.services?.map((s) => localized(s.name, locale)).join(', ') ?? '';
  const message =
    locale === 'tr'
      ? `Merhaba, ${dateStr} ${appt.startTime} tarihli randevumu iptal etmek istiyorum.${services ? ` (${services})` : ''}`
      : `Hello, I would like to cancel my appointment on ${dateStr} at ${appt.startTime}.${services ? ` (${services})` : ''}`;
  return `${WHATSAPP_URL.split('?')[0]}?text=${encodeURIComponent(message)}`;
}

export function MyAppointmentsPage() {
  const { t } = useTranslation();
  const locale = getLocale();
  const sessionId = getSessionId();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', sessionId],
    queryFn: () => api.getAppointments(sessionId),
  });

  useEffect(() => {
    const socket = connectSocket(sessionId);
    const handler = (updated: Appointment) => {
      patchAppointmentCache(queryClient, sessionId, updated);
    };
    socket.on('appointment:updated', handler);
    return () => { socket.off('appointment:updated', handler); };
  }, [sessionId, queryClient]);

  return (
    <Section>
      <Container>
        <h1 className="font-display text-4xl md:text-5xl uppercase">{t('appointments.title')}</h1>
        <p className="mt-4 text-text-muted">{t('appointments.subtitle')}</p>

        {isLoading && <p className="mt-12 text-text-muted">{t('common.loading')}</p>}

        {!isLoading && !appointments?.length && (
          <Card className="mt-12 text-center">
            <p className="text-text-muted">{t('appointments.empty')}</p>
            <Link to="/randevu" className="inline-block mt-4">
              <Button>{t('nav.booking')}</Button>
            </Link>
          </Card>
        )}

        <div className="mt-12 grid gap-4">
          {appointments?.map((appt) => (
            <Card key={appt.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg uppercase">
                    {formatDate(appt.date, locale)} · {appt.startTime}
                  </p>
                  <p className="text-text-muted text-sm mt-1">
                    {appt.services?.map((s) => localized(s.name, locale)).join(', ')}
                  </p>
                  {appt.totalPrice != null && (
                    <p className="text-sm mt-2">
                      {appt.discountAmount ? (
                        <>
                          <span className="text-text-muted line-through mr-2">{formatPrice(appt.subtotal ?? 0, locale)}</span>
                          <span className="font-display">{formatPrice(appt.totalPrice, locale)}</span>
                        </>
                      ) : (
                        <span className="font-display">{formatPrice(appt.totalPrice, locale)}</span>
                      )}
                    </p>
                  )}
                  {appt.adminNote && (
                    <p className="text-sm text-text-muted mt-2 italic">{appt.adminNote}</p>
                  )}
                </div>
                <Badge
                  status={appt.status}
                  label={t(`appointments.status.${appt.status}`)}
                />
              </div>

              {CANCELLABLE_STATUSES.includes(appt.status) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-text-muted">{t('appointments.cancelNotice')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`tel:${PHONE.replace(/\s/g, '')}`}
                      className="inline-flex items-center justify-center font-display uppercase tracking-wider rounded-sm transition-colors px-3 py-1.5 text-sm bg-surface-elevated text-text border border-border hover:border-accent"
                    >
                      {t('appointments.cancelCall')}
                    </a>
                    <a
                      href={whatsappCancelUrl(appt, locale)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center font-display uppercase tracking-wider rounded-sm transition-colors px-3 py-1.5 text-sm bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 hover:bg-[#25D366]/30"
                    >
                      {t('appointments.cancelWhatsApp')}
                    </a>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
