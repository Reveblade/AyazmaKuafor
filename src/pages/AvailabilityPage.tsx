import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';

export function AvailabilityPage() {
  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl uppercase">Müsaitlik</h1>

      <section className="mt-8">
        <h2 className="font-display text-lg uppercase mb-4">Günlük / Saatlik Kapatma</h2>
        <p className="text-sm text-text-muted mb-4 max-w-2xl">
          Takvimden bir gün seçin. Sağ tarafta saat dilimlerini tıklayarak randevuya kapatın veya açın.
          Dolu saatler (randevulu) değiştirilemez.
        </p>
        <ScheduleCalendar />
      </section>
    </div>
  );
}
