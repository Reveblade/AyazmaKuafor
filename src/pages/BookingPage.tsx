import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { Container, Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BookingContactForm } from '@/components/booking/BookingContactForm';
import { ServiceCategoryPicker } from '@/components/booking/ServiceCategoryPicker';
import { BookingPriceSummary } from '@/components/booking/BookingPriceSummary';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { DaySchedulePanel } from '@/components/booking/DaySchedulePanel';
import { useBookingAvailability } from '@/components/booking/useBookingAvailability';
import { api } from '@/lib/api';
import { formatPhoneFull, isValidTurkishMobile, parsePhoneDigits, phoneDigitsFromStored } from '@/lib/phone';
import { getSessionId, setSessionId, getSavedContacts, saveContact } from '@/lib/session';
import { connectSocket } from '@/lib/socket';
import { cn } from '@/lib/cn';

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
};

export function BookingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const defaultContact = getSavedContacts()[0];

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        phone: z.string().superRefine((val, ctx) => {
          const digits = parsePhoneDigits(val);
          if (!isValidTurkishMobile(digits)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: digits.length > 0 && digits[0] !== '5'
                ? t('booking.phoneMobileOnly')
                : t('booking.phoneInvalid'),
            });
          }
        }),
        notes: z.string().max(500).optional(),
      }),
    [t],
  );

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [success, setSuccess] = useState(false);

  const { monthData, schedule, scheduleLoading, bookingDurationMinutes, slotInterval, prefetchDay } = useBookingAvailability(
    selectedDate,
    selectedServices,
    currentMonth,
  );

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultContact?.firstName ?? '',
      lastName: defaultContact?.lastName ?? '',
      phone: defaultContact?.phone ? formatPhoneFull(phoneDigitsFromStored(defaultContact.phone)) : '',
      notes: '',
    },
  });

  const fillContact = (contact: { firstName: string; lastName: string; phone: string } | null) => {
    if (contact) {
      reset({
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: formatPhoneFull(phoneDigitsFromStored(contact.phone)),
        notes: '',
      });
    } else {
      reset({ firstName: '', lastName: '', phone: '', notes: '' });
    }
  };

  const mutation = useMutation({
    mutationFn: api.createAppointment,
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      saveContact({
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

  const showSchedule = selectedServices.length > 0;

  return (
    <Section className={showSchedule ? 'pb-36 lg:pb-0' : undefined}>
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl md:text-5xl uppercase">{t('booking.title')}</h1>
            <p className="mt-4 text-text-muted">{t('booking.subtitle')}</p>
          </div>
          <BookingPriceSummary selectedIds={selectedServices} className="hidden lg:block lg:w-72 shrink-0" />
        </div>

        <BookingPriceSummary selectedIds={selectedServices} variant="floating" />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-12 grid gap-6 lg:grid-cols-2 lg:auto-rows-fr"
        >
          {/* Row 1: Hizmet seçimi */}
          <div className="order-1 lg:order-none flex flex-col h-[520px] lg:h-[520px]">
            <h2 className="font-display text-lg uppercase tracking-wider mb-4 shrink-0">{t('booking.step1')}</h2>
            <div className="flex-1 min-h-0">
              <ServiceCategoryPicker
                selectedIds={selectedServices}
                onToggle={toggleService}
              />
            </div>
          </div>

          {/* Bilgileriniz — mobil: hizmetten hemen sonra veya tarih/saatten sonra */}
          <div className={cn('flex flex-col h-[520px]', showSchedule ? 'order-4 lg:order-none' : 'order-2 lg:order-none')}>
            <h2 className="font-display text-lg uppercase tracking-wider mb-4 shrink-0">{t('booking.step3')}</h2>
            <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
                <BookingContactForm
                  register={register}
                  control={control}
                  errors={errors}
                  onSelectContact={fillContact}
                />
              </div>
              {mutation.isError && (
                <p className="text-danger text-sm mt-4 shrink-0">{(mutation.error as Error).message}</p>
              )}
              <Button type="submit" className="w-full mt-4 shrink-0" disabled={mutation.isPending}>
                {mutation.isPending ? t('common.loading') : t('booking.submit')}
              </Button>
            </Card>
          </div>

          {/* Tarih — mobil: hizmet seçildikten sonra */}
          {showSchedule && (
            <div className="order-2 lg:order-none flex flex-col min-h-[360px]">
              <h2 className="font-display text-lg uppercase tracking-wider mb-4">{t('booking.step2Date')}</h2>
              <div className="flex-1">
                <BookingCalendar
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                  monthSummary={monthData?.summary}
                  onPrefetchDate={prefetchDay}
                />
              </div>
            </div>
          )}

          {/* Saat — mobil: tarihten sonra */}
          {showSchedule && (
            <div className="order-3 lg:order-none flex flex-col min-h-[360px]">
              <h2 className="font-display text-lg uppercase tracking-wider mb-4">{t('booking.step2Time')}</h2>
              <div className="flex-1">
                {selectedDate ? (
                  <DaySchedulePanel
                    mode="customer"
                    date={selectedDate}
                    schedule={schedule}
                    isLoading={scheduleLoading}
                    selectedTime={selectedTime}
                    onSelectTime={setSelectedTime}
                    bookingDurationMinutes={bookingDurationMinutes}
                    slotInterval={slotInterval}
                  />
                ) : (
                  <div className="border border-border rounded-sm p-4 bg-surface h-full min-h-[320px] flex items-center justify-center">
                    <p className="text-text-muted text-sm">{t('schedule.selectDay')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </Container>
    </Section>
  );
}
