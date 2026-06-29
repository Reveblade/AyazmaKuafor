import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { disconnectAdminSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Panel' },
  { to: '/randevular', label: 'Randevular' },
  { to: '/takvim', label: 'Takvim' },
  { to: '/musaitlik', label: 'Müsaitlik' },
  { to: '/hizmetler', label: 'Hizmetler' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

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
