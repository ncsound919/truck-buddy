import { Linking } from 'react-native';

import type { Contact } from '@/domain/types';

/**
 * One-tap outreach (spec: auto text / call back). `openCall` / `openSms` /
 * `openEmail` hand off to the OS apps via deep links, so the driver never
 * types — the message travels on the driver's own carrier plan. Fully
 * automatic sending (no tap) goes through the API seam's `sendDispatch`:
 * email direct, SMS via the recipient's carrier gateway.
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
