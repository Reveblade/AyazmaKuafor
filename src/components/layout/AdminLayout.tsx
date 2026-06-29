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
  { to: '/musteriler', label: 'Müşteriler' },
  { to: '/ayarlar', label: 'Ayarlar' },
];

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

type SidebarContentProps = {
  notifPermission: NotificationPermission | 'unsupported';
  onEnableNotifications: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
};

function SidebarContent({
  notifPermission,
  onEnableNotifications,
  onLogout,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      <h1 className="font-display text-xl uppercase tracking-wider text-accent mb-8">Ayazma ADMIN</h1>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'px-3 py-2.5 text-sm uppercase tracking-wider rounded-sm transition-colors',
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
          onClick={onEnableNotifications}
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
        onClick={onLogout}
        className="mt-4 px-3 py-2 text-sm text-text-muted hover:text-danger text-left uppercase tracking-wider"
      >
        Çıkış
      </button>
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notifPermission, setNotifPermission] = useState(notificationPermission);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!menuOpen) return;

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    disconnectAdminSocket();
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const sidebarProps: SidebarContentProps = {
    notifPermission,
    onEnableNotifications: handleEnableNotifications,
    onLogout: handleLogout,
    onNavigate: closeMenu,
  };

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden">
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-surface border-b border-border shrink-0">
        <h1 className="font-display text-lg uppercase tracking-wider text-accent">Ayazma ADMIN</h1>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="text-text p-2 -mr-2"
          aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={menuOpen}
        >
          <BurgerIcon open={menuOpen} />
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-bg/70 z-40 md:hidden"
          onClick={closeMenu}
          aria-label="Menüyü kapat"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-surface border-r border-border p-4 flex flex-col transition-transform duration-200 md:hidden',
          menuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        )}
        aria-hidden={!menuOpen}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      <aside className="hidden md:flex w-56 bg-surface border-r border-border p-4 flex-col shrink-0">
        <SidebarContent
          notifPermission={notifPermission}
          onEnableNotifications={handleEnableNotifications}
          onLogout={handleLogout}
        />
      </aside>

      <main className="flex-1 min-h-0 p-4 sm:p-6 md:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
