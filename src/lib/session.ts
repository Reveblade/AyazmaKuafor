const SESSION_KEY = 'ayazma_session';
const CONTACTS_KEY = 'ayazma_contacts';
const LEGACY_CONTACT_KEY = 'ayazma_contact';

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

export interface SavedContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

function migrateLegacyContact(): SavedContact[] {
  const raw = sessionStorage.getItem(LEGACY_CONTACT_KEY);
  if (!raw) return [];
  try {
    const legacy = JSON.parse(raw) as { firstName: string; lastName: string; phone: string };
    sessionStorage.removeItem(LEGACY_CONTACT_KEY);
    if (legacy.firstName && legacy.lastName && legacy.phone) {
      return [{ id: crypto.randomUUID(), ...legacy }];
    }
  } catch {
    sessionStorage.removeItem(LEGACY_CONTACT_KEY);
  }
  return [];
}

export function getSavedContacts(): SavedContact[] {
  const raw = localStorage.getItem(CONTACTS_KEY);
  if (!raw) return migrateLegacyContact();
  try {
    return JSON.parse(raw) as SavedContact[];
  } catch {
    return [];
  }
}

function persistContacts(contacts: SavedContact[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function saveContact(contact: Omit<SavedContact, 'id'> & { id?: string }): SavedContact {
  const contacts = getSavedContacts();
  const existing = contacts.find(
    (c) => c.phone === contact.phone || (contact.id && c.id === contact.id),
  );

  const saved: SavedContact = {
    id: existing?.id ?? contact.id ?? crypto.randomUUID(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
  };

  const next = existing
    ? contacts.map((c) => (c.id === existing.id ? saved : c))
    : [saved, ...contacts];

  persistContacts(next);
  return saved;
}

export function removeSavedContact(id: string) {
  persistContacts(getSavedContacts().filter((c) => c.id !== id));
}

/** @deprecated use getSavedContacts */
export interface ContactCache {
  firstName: string;
  lastName: string;
  phone: string;
}

/** @deprecated use getSavedContacts */
export function getContactCache(): ContactCache | null {
  const contacts = getSavedContacts();
  return contacts[0] ?? null;
}

/** @deprecated use saveContact */
export function setContactCache(contact: ContactCache) {
  saveContact(contact);
}
