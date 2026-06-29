const SESSION_KEY = 'ayazma_session';
const CONTACT_KEY = 'ayazma_contact';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function setSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}

export interface ContactCache {
  firstName: string;
  lastName: string;
  phone: string;
}

export function getContactCache(): ContactCache | null {
  const raw = sessionStorage.getItem(CONTACT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContactCache;
  } catch {
    return null;
  }
}

export function setContactCache(contact: ContactCache) {
  sessionStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
}
