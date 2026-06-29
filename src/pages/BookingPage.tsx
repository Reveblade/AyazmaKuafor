import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Container, Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { api } from '@/lib/api';
import { getSessionId, setSessionId, getContactCache, setContactCache } from '@/lib/session';
import { connectSocket } from '@/lib/socket';
import { getLocale } from '@/i18n';
import { formatPrice, localized } from '@/lib/utils';
import { cn } from '@/lib/cn';

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(10),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export function BookingPage() {
  const { t } = useTranslation();
  const locale = getLocale();
  const queryClient = useQueryClient();
  const cached = getContactCache();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });

  const { data: availability } = useQuery({
    queryKey: ['availability', selectedDate, selectedServices],
    queryFn: () => api.getAvailability(selectedDate!, selectedServices),
    enabled: !!selectedDate && selectedServices.length > 0,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: cached?.firstName ?? '',
      lastName: cached?.lastName ?? '',
      phone: cached?.phone ?? '',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: api.createAppointment,
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setContactCache({
        firstName: data.appointment.firstName,
        lastName: data.appointment.lastName,
        phone: data.appointment.phone,
      });
      connectSocket(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSuccess(true);
    },
  });

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const onSubmit = (data: FormData) => {
    if (!selectedServices.length) return alert(t('booking.selectService'));
    if (!selectedDate) return alert(t('booking.selectDate'));
    if (!selectedTime) return alert(t('booking.selectTime'));

    mutation.mutate({
      sessionId: getSessionId(),
      ...data,
      serviceIds: selectedServices,
      date: selectedDate,
      startTime: selectedTime,
    });
  };

  const availableSlots = availability?.slots.filter((s) => s.available) ?? [];

  if (success) {
    return (
      <Section>
        <Container className="max-w-lg text-center">
          <Card>
            <p className="text-success text-lg">{t('booking.success')}</p>
            <Link to="/randevularim" className="inline-block mt-6">
              <Button>{t('nav.myAppointments')}</Button>
            </Link>
          </Card>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <h1 className="font-display text-4xl md:text-5xl uppercase">{t('booking.title')}</h1>
        <p className="mt-4 text-text-muted">{t('booking.subtitle')}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-12 grid gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-lg uppercase tracking-wider mb-4">{t('booking.step1')}</h2>
              <div className="grid gap-3">
                {services?.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      'text-left p-4 border rounded-sm transition-colors',
                      selectedServices.includes(service.id)
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-surface hover:border-accent/50',
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-display uppercase">{localized(service.name, locale)}</span>
                      <span>{formatPrice(service.price, locale)}</span>
                    </div>
                    <p className="text-sm text-text-muted mt-1">
                      {service.durationMinutes} min
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div>
                <h2 className="font-display text-lg uppercase tracking-wider mb-4">{t('booking.step2')}</h2>
                <AvailabilityCalendar
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                  serviceIds={selectedServices}
                />

                {selectedDate && (
                  <div className="mt-4">
                    {availableSlots.length === 0 ? (
                      <p className="text-text-muted">{t('booking.noSlots')}</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setSelectedTime(slot.startTime)}
                            className={cn(
                              'py-2 text-sm border rounded-sm transition-colors',
                              selectedTime === slot.startTime
                                ? 'border-accent bg-accent/20 text-accent'
                                : 'border-border hover:border-accent',
                            )}
                          >
                            {slot.startTime}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-lg uppercase tracking-wider mb-4">{t('booking.step3')}</h2>
            <Card className="space-y-4">
              <Input label={t('booking.firstName')} {...register('firstName')} error={errors.firstName?.message} />
              <Input label={t('booking.lastName')} {...register('lastName')} error={errors.lastName?.message} />
              <Input label={t('booking.phone')} type="tel" {...register('phone')} error={errors.phone?.message} />
              <div>
                <label className="text-sm text-text-muted uppercase tracking-wider">{t('booking.notes')}</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-1.5 w-full bg-surface border border-border rounded-sm px-4 py-2.5 text-text focus:outline-none focus:border-accent"
                />
              </div>
              {mutation.isError && (
                <p className="text-danger text-sm">{(mutation.error as Error).message}</p>
              )}
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? t('common.loading') : t('booking.submit')}
              </Button>
            </Card>
          </div>
        </form>
      </Container>
    </Section>
  );
}
