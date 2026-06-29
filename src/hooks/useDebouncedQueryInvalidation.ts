import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const DEBOUNCE_MS = 300;

export function useDebouncedQueryInvalidation() {
  const queryClient = useQueryClient();
  const appointmentTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const invalidateAppointments = useCallback(() => {
    if (appointmentTimerRef.current) clearTimeout(appointmentTimerRef.current);
    appointmentTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }, DEBOUNCE_MS);
  }, [queryClient]);

  const invalidateSchedule = useCallback(() => {
    if (scheduleTimerRef.current) clearTimeout(scheduleTimerRef.current);
    scheduleTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
      queryClient.invalidateQueries({ queryKey: ['day-schedule'] });
    }, DEBOUNCE_MS);
  }, [queryClient]);

  useEffect(
    () => () => {
      if (appointmentTimerRef.current) clearTimeout(appointmentTimerRef.current);
      if (scheduleTimerRef.current) clearTimeout(scheduleTimerRef.current);
    },
    [],
  );

  return { invalidateAppointments, invalidateSchedule };
}
