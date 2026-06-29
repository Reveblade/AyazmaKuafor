const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

function parseErrorBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.error === 'string') return record.error;
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    if (nested.formErrors?.length) return nested.formErrors.join(', ');
    const fieldMessages = Object.values(nested.fieldErrors ?? {}).flat();
    if (fieldMessages.length) return fieldMessages.join(', ');
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new Error('API unreachable. Is the server running on ' + API_URL + '?');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(parseErrorBody(err, res.statusText || 'Request failed'));
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  login: (pin: string) =>
    request<{ ok: boolean }>('/admin/auth', { method: 'POST', body: JSON.stringify({ pin }) }),
  logout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),
  me: () => request<{ ok: boolean }>('/admin/me'),
  getStats: () => request<{ pending: number; todayCount: number; total: number }>('/admin/stats'),
  getAppointments: (params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<Appointment[]>('/admin/appointments?' + q);
  },
  updateAppointment: (id: string, data: { status?: string; adminNote?: string }) =>
    request(`/admin/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getServices: () => request<Service[]>('/admin/services'),
  createService: (data: ServiceInput) =>
    request('/admin/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: Partial<ServiceInput>) =>
    request(`/admin/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteService: (id: string) =>
    request(`/admin/services/${id}`, { method: 'DELETE' }),
  getAvailabilityRules: () => request<AvailabilityRule[]>('/admin/availability-rules'),
  saveAvailabilityRules: (rules: AvailabilityRuleInput[]) =>
    request('/admin/availability-rules', { method: 'PUT', body: JSON.stringify(rules) }),
  getAvailabilityBlocks: () => request<AvailabilityBlock[]>('/admin/availability-blocks'),
  createAvailabilityBlock: (data: AvailabilityBlockInput) =>
    request('/admin/availability-blocks', { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailabilityBlock: (id: string) =>
    request(`/admin/availability-blocks/${id}`, { method: 'DELETE' }),
};

export interface LocalizedText { tr: string; en: string; }

export interface Service {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
}

export type ServiceInput = Omit<Service, 'id'>;

export interface Appointment {
  id: string;
  sessionId: string;
  firstName: string;
  lastName: string;
  phone: string;
  serviceIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  adminNote?: string;
  services?: Service[];
}

export interface AvailabilityRule {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export type AvailabilityRuleInput = Omit<AvailabilityRule, 'id'>;

export interface AvailabilityBlock {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  reason?: string;
}

export type AvailabilityBlockInput = Omit<AvailabilityBlock, 'id'>;

export { API_URL };
