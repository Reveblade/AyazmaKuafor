import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AppointmentsPage } from '@/pages/AppointmentsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { AvailabilityPage } from '@/pages/AvailabilityPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CustomersPage } from '@/pages/CustomersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function LoginRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<DashboardPage />} />
              <Route path="randevular" element={<AppointmentsPage />} />
              <Route path="takvim" element={<CalendarPage />} />
              <Route path="musaitlik" element={<AvailabilityPage />} />
              <Route path="hizmetler" element={<ServicesPage />} />
              <Route path="musteriler" element={<CustomersPage />} />
              <Route path="ayarlar" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
