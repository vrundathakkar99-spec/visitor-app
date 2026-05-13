// Web-only helper to pick / capture a photo via the device's native camera
// Returns a data URL (base64) or null if cancelled.
export function pickPhotoFromCameraWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // `capture` hints mobile browsers to open the camera app
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';

    let settled = false;
    const done = (val: string | null) => {
      if (settled) return;
      settled = true;
      try {
        document.body.removeChild(input);
      } catch {}
      resolve(val);
    };

    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return done(null);
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : null;
        done(result);
      };
      reader.onerror = () => done(null);
      reader.readAsDataURL(file);
    };

    // If user dismisses the picker without choosing, focus returns; resolve null shortly after.
    const onFocus = () => {
      setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          done(null);
        }
        window.removeEventListener('focus', onFocus);
      }, 400);
    };
    window.addEventListener('focus', onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

// Simple PIN session helpers (web sessionStorage).
const KEY = 'visitor_admin_session_v1';
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export function saveAdminSession(pin: string) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ pin, expiresAt: Date.now() + TTL_MS }),
    );
  } catch {}
}

export function loadAdminSession(): string | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { pin: string; expiresAt: number };
    if (!parsed?.pin || !parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed.pin;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}
