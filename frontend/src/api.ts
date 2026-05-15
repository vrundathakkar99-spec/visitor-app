import AsyncStorage from '@react-native-async-storage/async-storage';

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
  department?: string | null;
  assigned_to?: string | null;
  photo_base64?: string | null;
  status: VisitorStatus;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  department: string;
}

// --- Token helpers (AsyncStorage works on web + native) ---
const TOKEN_KEY = 'maxwell_emp_token_v1';
const PROFILE_KEY = 'maxwell_emp_profile_v1';

export async function saveSession(token: string, profile: EmployeeProfile) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadSession(): Promise<{ token: string; profile: EmployeeProfile } | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!token || !profileRaw) return null;
  try {
    return { token, profile: JSON.parse(profileRaw) as EmployeeProfile };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(PROFILE_KEY);
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Visitor APIs ---
export async function createVisitor(payload: {
  full_name: string;
  mobile: string;
  purpose: string;
  person_to_meet?: string;
  category: VisitorCategory;
  department?: string | null;
  assigned_to?: string | null;
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
  const res = await fetch(`${BASE}/api/visitors`, { headers: { 'X-Admin-Pin': pin } });
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

export async function updateStatusAdmin(
  id: string,
  status: 'approved' | 'rejected',
  pin: string,
): Promise<Visitor> {
  const res = await fetch(`${BASE}/api/visitors/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || 'Failed to update');
  }
  return res.json();
}

export async function updateStatusEmployee(
  id: string,
  status: 'approved' | 'rejected',
): Promise<Visitor> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
  const res = await fetch(`${BASE}/api/visitors/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || 'Failed to update');
  }
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

// --- Employee auth ---
export async function employeeLogin(email: string, password: string): Promise<{ token: string; profile: EmployeeProfile }> {
  const res = await fetch(`${BASE}/api/employee/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || 'Login failed');
  }
  const data = await res.json();
  return { token: data.access_token, profile: data.employee };
}

export async function employeeMe(): Promise<EmployeeProfile> {
  const res = await fetch(`${BASE}/api/employee/me`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Unauthorized');
  const data = await res.json();
  return data.employee;
}

export async function employeeVisitors(): Promise<Visitor[]> {
  const res = await fetch(`${BASE}/api/employee/visitors`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

// --- QR helpers ---
export function qrUrlFor(text: string, size = 8): string {
  return `${BASE}/api/qr?text=${encodeURIComponent(text)}&size=${size}`;
}
export function qrEntryUrl(size = 10): string {
  return `${BASE}/api/qr-entry?size=${size}`;
}
export function publicEntryUrl(): string {
  return BASE ? `${BASE}/` : '/';
}
