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
  login: (password: string) =>
    request<{ ok: boolean }>('/admin/auth', { method: 'POST', body: JSON.stringify({ password }) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/admin/password', { method: 'PATCH', body: JSON.stringify(data) }),
  resetSystem: (password: string) =>
    request<{ ok: boolean }>('/admin/reset', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),
  me: () => request<{ ok: boolean }>('/admin/me'),
  getStats: () => request<{ pending: number; todayCount: number; total: number }>('/admin/stats'),
  getAppointments: (params?: { status?: string; date?: string; month?: string; scope?: 'current' | 'past' }) => {
    const q = new URLSearchParams();
    if (params?.scope) q.set('scope', params.scope);
    if (params?.status) q.set('status', params.status);
    if (params?.date) q.set('date', params.date);
    if (params?.month) q.set('month', params.month);
    return request<Appointment[]>('/admin/appointments?' + q);
  },
  getAppointmentsPaginated: (params: {
    scope: 'past';
    status?: string;
    page: number;
    limit: number;
    month?: string;
  }) => {
    const q = new URLSearchParams({
      scope: params.scope,
      page: String(params.page),
      limit: String(params.limit),
    });
    if (params.status) q.set('status', params.status);
    if (params.month) q.set('month', params.month);
    return request<PaginatedAppointments>('/admin/appointments?' + q);
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
  getServiceCategories: () => request<ServiceCategory[]>('/admin/service-categories'),
  createServiceCategory: (data: ServiceCategoryInput) =>
    request('/admin/service-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateServiceCategory: (id: string, data: Partial<ServiceCategoryInput>) =>
    request(`/admin/service-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteServiceCategory: (id: string) =>
    request(`/admin/service-categories/${id}`, { method: 'DELETE' }),
  getServiceCombos: () => request<ServiceCombo[]>('/admin/service-combos'),
  createServiceCombo: (data: ServiceComboInput) =>
    request('/admin/service-combos', { method: 'POST', body: JSON.stringify(data) }),
  updateServiceCombo: (id: string, data: Partial<ServiceComboInput>) =>
    request(`/admin/service-combos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteServiceCombo: (id: string) =>
    request(`/admin/service-combos/${id}`, { method: 'DELETE' }),
  getAvailabilityRules: () => request<AvailabilityRule[]>('/admin/availability-rules'),
  saveAvailabilityRules: (rules: AvailabilityRuleInput[]) =>
    request('/admin/availability-rules', { method: 'PUT', body: JSON.stringify(rules) }),
  getAvailabilityBlocks: () => request<AvailabilityBlock[]>('/admin/availability-blocks'),
  createAvailabilityBlock: (data: AvailabilityBlockInput) =>
    request('/admin/availability-blocks', { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailabilityBlock: (id: string) =>
    request(`/admin/availability-blocks/${id}`, { method: 'DELETE' }),
  getDaySchedule: (date: string) =>
    request<DayScheduleResponse>(`/admin/schedule?date=${date}`),
  saveDaySchedule: (date: string, data: { allDay: boolean; blockedStarts: string[]; reason?: string }) =>
    request<DayScheduleResponse>(`/admin/schedule/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
  getMonthAvailability: (year: number, month: number) => {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    return request<{ year: number; month: number; summary: Record<string, 'closed' | 'available' | 'full'> }>(
      `/availability/month?${params}`,
    );
  },
  createAppointment: (data: CreateAppointmentInput) =>
    request<Appointment>('/admin/appointments', { method: 'POST', body: JSON.stringify(data) }),
  searchCustomers: (search: string) =>
    request<Customer[]>(`/admin/customers?${new URLSearchParams({ search })}`),
  getCustomers: (params?: { search?: string; page?: number; limit?: number; hasDebt?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.hasDebt) q.set('hasDebt', 'true');
    return request<PaginatedCustomers | Customer[]>(`/admin/customers?${q}`);
  },
  getCustomersWithDebt: () => request<Customer[]>('/admin/customers?hasDebt=true'),
  getCustomer: (id: string) => request<CustomerDetail>(`/admin/customers/${id}`),
  updateCustomer: (id: string, data: CustomerInput) =>
    request<Customer>(`/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) =>
    request<{ ok: boolean }>(`/admin/customers/${id}`, { method: 'DELETE' }),
  addCustomerDebt: (id: string, data: AddCustomerDebtInput) =>
    request<CustomerDetail>(`/admin/customers/${id}/debt`, { method: 'POST', body: JSON.stringify(data) }),
};

export interface LocalizedText { tr: string; en: string; }

export interface ServiceCategory {
  id: string;
  name: LocalizedText;
  sortOrder: number;
  active: boolean;
}

export type ServiceCategoryInput = Omit<ServiceCategory, 'id'>;

export interface Service {
  id: string;
  categoryId: string | null;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
}

export type ServiceInput = Omit<Service, 'id'>;

export interface ServiceCombo {
  id: string;
  name: LocalizedText;
  serviceIds: string[];
  discountAmount: number;
  active: boolean;
  sortOrder: number;
}

export type ServiceComboInput = Omit<ServiceCombo, 'id'>;

export interface PaginatedAppointments {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  subtotal?: number;
  discountAmount?: number;
  totalPrice?: number;
  appliedComboIds?: string[];
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

export type ScheduleSlotStatus = 'available' | 'blocked' | 'booked';

export interface ScheduleSlot {
  startTime: string;
  endTime: string;
  status: ScheduleSlotStatus;
  bookable: boolean;
}

export interface DaySchedule {
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
  allDayBlocked: boolean;
  slots: ScheduleSlot[];
}

export interface DayScheduleResponse {
  date: string;
  slotInterval: number;
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
  allDayBlocked: boolean;
  slots: ScheduleSlot[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  debtBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDebtEntry {
  id: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  debtHistory: CustomerDebtEntry[];
  appointments: Appointment[];
}

export type CustomerInput = Pick<Customer, 'firstName' | 'lastName' | 'phone'>;

export interface AddCustomerDebtInput {
  amount: number;
  note?: string;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAppointmentInput {
  firstName: string;
  lastName: string;
  phone: string;
  serviceIds: string[];
  date: string;
  startTime: string;
  notes?: string;
  status?: 'pending' | 'accepted';
}

export { API_URL };
