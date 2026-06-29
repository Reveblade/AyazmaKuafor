import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';

export function AvailabilityPage() {
  return (
    <div>
      <PageHeader title="Müsaitlik" />

      <section>
        <SectionHeader
          title="Günlük / Saatlik Kapatma"
          description="Takvimden bir gün seçin. Saat dilimlerini kapatmak/açmak için “Saat Kapat / Aç” modunu, müşteri adına randevu oluşturmak için “Randevu Yaz” modunu kullanın. Dolu saatler (randevulu) değiştirilemez."
        />
        <ScheduleCalendar />
      </section>
    </div>
  );
}
