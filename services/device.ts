export type DeviceInfo = {
  userAgent?: string;
  platform?: string;
  language?: string;
  timezone?: string;
  screen?: string;
};

export const getOrCreateDeviceId = (): string => {
  const key = 'educasense_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created =
    globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? (globalThis.crypto as Crypto).randomUUID()
      : `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  localStorage.setItem(key, created);
  return created;
};

export const buildDeviceInfo = (): DeviceInfo => {
  const screenValue =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : undefined;
  const timezone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;

  return {
    userAgent: navigator.userAgent,
    platform: (navigator as any).platform,
    language: navigator.language,
    timezone,
    screen: screenValue
  };
};

