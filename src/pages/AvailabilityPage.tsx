import { useState } from 'react';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { ScheduleModeToggle } from '@/components/schedule/ScheduleModeToggle';
import type { SchedulePanelMode } from '@/components/schedule/DaySchedulePanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';

export function AvailabilityPage() {
  const [panelMode, setPanelMode] = useState<SchedulePanelMode>('block');

  return (
    <div>
      <PageHeader title="Müsaitlik" />

      <section>
        <SectionHeader
          title="Günlük / Saatlik Kapatma"
          actions={<ScheduleModeToggle mode={panelMode} onModeChange={setPanelMode} />}
        />
        <ScheduleCalendar panelMode={panelMode} onPanelModeChange={setPanelMode} />
      </section>
    </div>
  );
}
