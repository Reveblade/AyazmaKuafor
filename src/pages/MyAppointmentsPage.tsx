import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { formatDate, localized } from '@/lib/utils';
import type { Appointment } from '@/types';

export function MyAppointmentsPage() {
  const { t } = useTranslation();
  const locale = getLocale();
  const sessionId = getSessionId();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', sessionId],
    queryFn: () => api.getAppointments(sessionId),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const socket = connectSocket(sessionId);
    const handler = (_updated: Appointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionId] });
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
                  {appt.adminNote && (
                    <p className="text-sm text-text-muted mt-2 italic">{appt.adminNote}</p>
                  )}
                </div>
                <Badge
                  status={appt.status}
                  label={t(`appointments.status.${appt.status}`)}
                />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
