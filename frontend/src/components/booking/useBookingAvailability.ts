import { useCallback, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { connectBookingSocket } from '@/lib/socket';

const PREFETCH_THROTTLE_MS = 300;

export function useBookingAvailability(
  selectedDate: string | null,
  serviceIds: string[],
  currentMonth: Date,
) {
  const queryClient = useQueryClient();
  const lastPrefetchAtRef = useRef(0);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const sortedServiceIds = useMemo(
    () => [...serviceIds].sort(),
    [serviceIds.join(',')],
  );

  useEffect(() => {
    if (serviceIds.length === 0) return;

    const socket = connectBookingSocket();

    const refreshMonth = () => {
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
    };

    const refreshDay = ({ date }: { date: string }) => {
      queryClient.invalidateQueries({ queryKey: ['availability', date] });
      refreshMonth();
    };

    socket.on('schedule:updated', refreshDay);
    socket.on('availability:rules-updated', refreshMonth);

    return () => {
      socket.off('schedule:updated', refreshDay);
      socket.off('availability:rules-updated', refreshMonth);
    };
  }, [queryClient, serviceIds.length]);

  const monthQuery = useQuery({
    queryKey: ['month-availability', year, month, sortedServiceIds],
    queryFn: () => api.getMonthAvailability(year, month, serviceIds),
    enabled: serviceIds.length > 0,
  });

  const dayQuery = useQuery({
    queryKey: ['availability', selectedDate, sortedServiceIds],
    queryFn: () => api.getAvailability(selectedDate!, serviceIds),
    enabled: !!selectedDate && serviceIds.length > 0,
    placeholderData: keepPreviousData,
  });

  const scheduleReady = dayQuery.data?.date === selectedDate;
  const schedule = scheduleReady ? dayQuery.data?.schedule : undefined;
  const scheduleLoading = !!selectedDate && !scheduleReady && dayQuery.isFetching;

  const prefetchDay = useCallback((dateStr: string) => {
    if (serviceIds.length === 0) return;

    const now = Date.now();
    if (now - lastPrefetchAtRef.current < PREFETCH_THROTTLE_MS) return;
    lastPrefetchAtRef.current = now;

    queryClient.prefetchQuery({
      queryKey: ['availability', dateStr, sortedServiceIds],
      queryFn: () => api.getAvailability(dateStr, serviceIds),
    });
  }, [queryClient, serviceIds, sortedServiceIds]);

  return {
    monthData: monthQuery.data,
    schedule,
    scheduleLoading,
    bookingDurationMinutes: dayQuery.data?.durationMinutes,
    slotInterval: dayQuery.data?.slotInterval,
    prefetchDay,
  };
}
