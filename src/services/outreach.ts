import { Linking } from 'react-native';

import type { Contact } from '@/domain/types';

/**
 * One-tap outreach (spec: auto text / call back). These hand off to the OS via
 * deep links, so the driver never types. True *background auto-send* of SMS and
 * email requires a telecom/SMTP gateway and is out of scope for the offline app —
 * those flows are represented by the API seam's `sendDispatch`.
 */

function strip(phone?: string): string {
  return phone ? phone.replace(/[^+\d]/g, '') : '';
}

/** Dials a contact. Falls back to dispatch if the contact has no number. */
export function openCall(contact: Contact, fallback?: Contact): void {
  const number = strip(contact.phone) || (fallback ? strip(fallback.phone) : '');
  if (!number) return;
  void Linking.openURL(`tel:${number}`).catch(() => {});
}

/** Opens the SMS app pre-filled with a message. */
export function openSms(contact: Contact, body: string): void {
  const number = strip(contact.phone);
  if (!number) return;
  void Linking.openURL(`sms:${number}?body=${encodeURIComponent(body)}`).catch(() => {});
}

/** Opens the mail app pre-filled (compose sheet) — one tap to send. */
export function openEmail(contact: Contact, subject: string, body: string): void {
  const address = contact.email;
  if (!address) return;
  void Linking.openURL(
    `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  ).catch(() => {});
}
