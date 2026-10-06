/**
 * Offline license verification — the APK side of "Menen Verify".
 *
 * A license is a permanent RS256 JWT issued by the Menen Verify admin tool:
 *
 *   header:  { "alg": "RS256", "typ": "JWT" }
 *   payload: { "iss": "menen-verify", "sub": "premium", "device_code": "...",
 *              "customer": "Student Name", "product": "menen-grade12",
 *              "features": { "premium": true }, "iat": <seconds> }
 *
 * Verification happens entirely on-device with WebCrypto + the embedded public
 * key (see licenseKeys.ts). No network, no phone-home. The unlocked state is
 * persisted in SQLite app_settings, so it survives WebView storage clears and
 * survives until the app is uninstalled or the license is explicitly removed.
 */
import { sqliteDb } from './db';
import { getStableDeviceCode, getCachedDeviceCode } from './device';
import {
  MENEN_VERIFY_PUBLIC_KEY_PEM,
  LICENSE_ISSUER
} from './licenseKeys';

export const FREE_DAILY_PRACTICE_LIMIT = 5;

const SETTING_JWT = 'menen_license_jwt';
const SETTING_CLAIMS = 'menen_license_claims';
const SETTING_DEVICE_CODE = 'menen_device_code';

export interface LicenseInfo {
  device_code: string;
  customer: string;
  product: string;
  features: string[] | Record<string, unknown>;
  issued_at: number;
}

type Listener = () => void;

let currentLicense: LicenseInfo | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => {
    try {
      l();
    } catch {
      // ignore listener errors
    }
  });
}

/** Subscribe to license state changes (activation / removal). Returns unsubscribe. */
export function onLicenseChanged(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isPremium(): boolean {
  return currentLicense !== null;
}

export function getLicenseInfo(): LicenseInfo | null {
  return currentLicense;
}

// ---------------------------------------------------------------------------
// JWT / PEM base64url helpers
// ---------------------------------------------------------------------------

function b64urlDecode(input: string): Uint8Array<ArrayBuffer> {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function textDecode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return b64urlDecode(body);
}

// ---------------------------------------------------------------------------
// Verifier
// ---------------------------------------------------------------------------

let cachedKey: CryptoKey | null = null;

async function getVerificationKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (!crypto?.subtle) {
    throw new Error('WebCrypto unavailable — cannot verify the offline license.');
  }
  const der = pemToDer(MENEN_VERIFY_PUBLIC_KEY_PEM);
  cachedKey = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return cachedKey;
}

interface JwtClaims {
  iss?: string;
  sub?: string;
  device_code?: string;
  customer?: string;
  product?: string;
  features?: unknown;
  iat?: number;
  [k: string]: unknown;
}

/**
 * Menen Verify historically signed `features` as a list (["premium"]); accept
 * the object form ({premium:true}) too so old and new codes both unlock.
 */
function hasPremiumFeature(features: unknown): boolean {
  if (Array.isArray(features)) return features.includes('premium');
  if (features && typeof features === 'object') {
    return (features as Record<string, unknown>)['premium'] === true;
  }
  return false;
}

/**
 * Validates a Menen Verify activation code for THIS device.
 * Returns parsed claims when the signature verifies AND the device binding,
 * issuer and premium claims all match; otherwise throws a human-readable error.
 */
async function verifyActivationCode(rawCode: string, deviceCode: string): Promise<JwtClaims> {
  const code = rawCode.trim();
  if (!code) throw new Error('Paste or type the activation code you received.');
  const parts = code.split('.');
  if (parts.length !== 3) {
    throw new Error('Not a valid activation code (must be header.payload.signature).');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string };
  let claims: JwtClaims;
  try {
    header = JSON.parse(textDecode(b64urlDecode(headerB64)));
    claims = JSON.parse(textDecode(b64urlDecode(payloadB64)));
  } catch {
    throw new Error('Activation code is malformed.');
  }

  if (header.alg !== 'RS256') {
    throw new Error(`Wrong signing algorithm (${header.alg || '?'}); expected RS256.`);
  }
  if (claims.iss !== LICENSE_ISSUER) {
    throw new Error(`Unknown issuer (${claims.iss || '?'}); this code was not issued by Menen Verify.`);
  }
  if (claims.sub !== 'premium') {
    throw new Error('This code does not grant the premium plan.');
  }
  if (!hasPremiumFeature(claims.features)) {
    throw new Error('This code does not carry the premium feature flag.');
  }
  if ((claims.device_code || '').trim().toUpperCase() !== deviceCode) {
    throw new Error('This code belongs to a different device. Ask the administrator for a code matching this Device Code.');
  }

  const key = await getVerificationKey();
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = b64urlDecode(signatureB64);
  } catch {
    throw new Error('Signature is malformed.');
  }
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
  if (!ok) {
    throw new Error('Signature verification failed. The code is invalid or tampered with.');
  }
  return claims;
}

// ---------------------------------------------------------------------------
// Persistence + lifecycle
// ---------------------------------------------------------------------------

/**
 * Loads any previously stored license and restores premium state. Call once
 * after the offline DB is initialized (OfflineAppRoot does this before render).
 */
export async function initLicense(): Promise<void> {
  const deviceCode = await getStableDeviceCode();
  sqliteDb.setSetting(SETTING_DEVICE_CODE, deviceCode);

  const storedJwt = await sqliteDb.getSetting(SETTING_JWT);
  if (!storedJwt) {
    currentLicense = null;
    emit();
    return;
  }
  try {
    const claims = await verifyActivationCode(storedJwt, deviceCode);
    currentLicense = normalizeLicense(claims, deviceCode);
    emit();
  } catch (e) {
    console.warn('[license] stored license no longer valid, clearing.', e);
    await removeLicense();
  }
}

function normalizeLicense(claims: JwtClaims, deviceCode: string): LicenseInfo {
  const raw: unknown = claims.features;
  const features: LicenseInfo['features'] = Array.isArray(raw)
    ? (raw as string[])
    : raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};
  const license: LicenseInfo = {
    device_code: deviceCode,
    customer: typeof claims.customer === 'string' ? claims.customer : 'Student',
    product: typeof claims.product === 'string' ? claims.product : '',
    features,
    issued_at: typeof claims.iat === 'number' ? claims.iat : Date.now() / 1000
  };
  return license;
}

/**
 * Attempts to activate the app with a code from Menen Verify. Resolves on
 * success (premium unlocked immediately), rejects with an error message on any
 * failure. The stored JWT survives restarts.
 */
export async function activateWithCode(rawCode: string): Promise<LicenseInfo> {
  const deviceCode = await getStableDeviceCode();
  const claims = await verifyActivationCode(rawCode, deviceCode);
  const license = normalizeLicense(claims, deviceCode);
  currentLicense = license;
  sqliteDb.setSetting(SETTING_JWT, rawCode.trim());
  sqliteDb.setSetting(SETTING_CLAIMS, JSON.stringify(license));
  sqliteDb.setSetting(SETTING_DEVICE_CODE, deviceCode);
  emit();
  return license;
}

/** Removes the license (logout / refund). Resets the app to the free plan. */
export async function removeLicense(): Promise<void> {
  currentLicense = null;
  sqliteDb.setSetting(SETTING_JWT, '');
  sqliteDb.setSetting(SETTING_CLAIMS, '');
  emit();
}

/** Best-effort sync read of the already-resolved device code for rendering. */
export function currentDeviceCode(): string | null {
  return getCachedDeviceCode();
}