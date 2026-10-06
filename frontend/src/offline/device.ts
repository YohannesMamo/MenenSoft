/**
 * Stable per-device code used to bind an issued license to this install.
 *
 * On Android a tiny native Capacitor plugin (`MenenDeviceId`, registered in
 * MainActivity) returns the ANDROID_ID — stable across reinstalls until a
 * factory reset. In the browser dev preview (no Capacitor bridge) we fall back
 * to a random UUID persisted in localStorage so the whole flow is testable.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const DEVICE_CODE_KEY = 'menen_device_code';

interface MenenDeviceIdPlugin {
  getAndroidId(): Promise<{ id: string; source: string }>;
}

const MenenDeviceId = registerPlugin<MenenDeviceIdPlugin>('MenenDeviceId');

async function nativeAndroidId(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const { id } = await MenenDeviceId.getAndroidId();
      if (id && id.trim().length > 0) {
        return id.trim().toUpperCase();
      }
    }
  } catch (e) {
    console.warn('[device] native Android ID unavailable, falling back to persisted UUID', e);
  }
  return null;
}

async function persistedUuid(): Promise<string> {
  const existing = localStorage.getItem(DEVICE_CODE_KEY);
  if (existing && existing.trim().length >= 8) {
    return existing.trim().toUpperCase();
  }
  const raw = crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  const code = raw.toUpperCase();
  localStorage.setItem(DEVICE_CODE_KEY, code);
  return code;
}

let cachedDeviceCode: string | null = null;

/**
 * Resolves this install's device code (stable for the lifetime of the install).
 */
export async function getStableDeviceCode(): Promise<string> {
  if (cachedDeviceCode) return cachedDeviceCode;
  const native = await nativeAndroidId();
  cachedDeviceCode = native || (await persistedUuid());
  return cachedDeviceCode;
}

/** Synchronous read once the device code has been resolved at least once. */
export function getCachedDeviceCode(): string | null {
  return cachedDeviceCode;
}