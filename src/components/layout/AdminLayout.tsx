import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import type { Appointment } from '@/lib/api';
import {
  notificationPermission,
  notifyNewAppointment,
  requestNotificationPermission,
} from '@/lib/notifications';
import {
  addUnseenCancelled,
} from '@/lib/cancelledNotifications';
import { connectAdminSocket, disconnectAdminSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Panel' },
  { to: '/randevular', label: 'Randevular' },
  { to: '/takvim', label: 'Takvim' },
  { to: '/musaitlik', label: 'Müsaitlik' },
  { to: '/hizmetler', label: 'Hizmetler' },
  { to: '/ayarlar', label: 'Ayarlar' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notifPermission, setNotifPermission] = useState(notificationPermission);

  useEffect(() => {
    const socket = connectAdminSocket();

    const refreshAppointments = () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const refreshSchedule = () => {
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
      queryClient.invalidateQueries({ queryKey: ['day-schedule'] });
    };

    const onAppointmentCreated = (appointment: Appointment) => {
      refreshAppointments();
      notifyNewAppointment(appointment, () => navigate('/randevular'));
    };

    const onAppointmentUpdated = (appointment: Appointment) => {
      refreshAppointments();
      if (appointment.status === 'cancelled') {
        addUnseenCancelled(appointment.id);
      }
    };

    socket.on('appointment:created', onAppointmentCreated);
    socket.on('appointment:updated', onAppointmentUpdated);
    socket.on('schedule:updated', refreshSchedule);
    socket.on('availability:rules-updated', refreshSchedule);

    return () => {
      socket.off('appointment:created', onAppointmentCreated);
      socket.off('appointment:updated', onAppointmentUpdated);
      socket.off('schedule:updated', refreshSchedule);
      socket.off('availability:rules-updated', refreshSchedule);
    };
  }, [queryClient, navigate]);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  const handleLogout = async () => {
    disconnectAdminSocket();
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh flex">
      <aside className="w-56 bg-surface border-r border-border p-4 flex flex-col shrink-0">
        <h1 className="font-display text-xl uppercase tracking-wider text-accent mb-8">Ayazma Admin</h1>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 text-sm uppercase tracking-wider rounded-sm transition-colors',
                  isActive ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="mb-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-sm text-left uppercase tracking-wider border border-accent/30"
          >
            Bildirimleri aç
          </button>
        )}
        {notifPermission === 'denied' && (
          <p className="mb-2 px-3 text-xs text-text-muted leading-relaxed">
            Bildirimler tarayıcıda kapalı. Site ayarlarından izin verin.
          </p>
        )}
        <button
          onClick={handleLogout}
          className="mt-4 px-3 py-2 text-sm text-text-muted hover:text-danger text-left uppercase tracking-wider"
        >
          Çıkış
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
