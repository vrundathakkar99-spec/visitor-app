const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

import type { VisitorCategory } from './theme';

export type VisitorStatus = 'pending' | 'approved' | 'rejected';

export interface Visitor {
  id: string;
  pass_number: string;
  full_name: string;
  mobile: string;
  purpose: string;
  person_to_meet: string;
  category: VisitorCategory;
  sub_category?: string | null;
  photo_base64?: string | null;
  status: VisitorStatus;
  created_at: string;
}

export async function createVisitor(payload: {
  full_name: string;
  mobile: string;
  purpose: string;
  person_to_meet: string;
  category: VisitorCategory;
  sub_category?: string | null;
  photo_base64?: string | null;
}): Promise<Visitor> {
  const res = await fetch(`${BASE}/api/visitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Failed to submit');
  return res.json();
}

export async function listVisitors(pin: string): Promise<Visitor[]> {
  const res = await fetch(`${BASE}/api/visitors`, {
    headers: { 'X-Admin-Pin': pin },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function listByMobile(mobile: string): Promise<Visitor[]> {
  const res = await fetch(`${BASE}/api/visitors/by-mobile/${encodeURIComponent(mobile)}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export async function getVisitor(id: string): Promise<Visitor> {
  const res = await fetch(`${BASE}/api/visitors/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function updateStatus(
  id: string,
  status: 'approved' | 'rejected',
  pin: string,
): Promise<Visitor> {
  const res = await fetch(`${BASE}/api/visitors/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

export async function verifyPin(pin: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/admin/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.ok);
}

export function qrUrlFor(text: string, size = 8): string {
  return `${BASE}/api/qr?text=${encodeURIComponent(text)}&size=${size}`;
}

export function qrEntryUrl(size = 10): string {
  return `${BASE}/api/qr-entry?size=${size}`;
}

export function publicEntryUrl(): string {
  return BASE ? `${BASE}/` : '/';
}
