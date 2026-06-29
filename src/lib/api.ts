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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

export const api = {
  getServices: () => request<import('@/types').Service[]>('/services'),
  getShopSettings: () => request<import('@/types').ShopSettings>('/shop-settings'),
  getAvailability: (date: string, serviceIds: string[]) => {
    const params = new URLSearchParams({ date });
    if (serviceIds.length) params.set('serviceIds', serviceIds.join(','));
    return request<{ date: string; durationMinutes: number; slots: import('@/types').TimeSlot[] }>(
      `/availability?${params}`,
    );
  },
  getMonthAvailability: (year: number, month: number, serviceIds: string[]) => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (serviceIds.length) params.set('serviceIds', serviceIds.join(','));
    return request<{ year: number; month: number; summary: Record<string, import('@/types').DayAvailability> }>(
      `/availability/month?${params}`,
    );
  },
  getAppointments: (sessionId: string) =>
    request<import('@/types').Appointment[]>(`/appointments?sessionId=${sessionId}`),
  createAppointment: (data: {
    sessionId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    notes?: string;
  }) =>
    request<{ appointment: import('@/types').Appointment; sessionId: string }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export { API_URL };
