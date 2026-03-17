const toCsvValue = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const buildCsv = (rows: Record<string, unknown>[]): string => {
  const keys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach(k => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  const header = keys.map(toCsvValue).join(',');
  const lines = rows.map(r => keys.map(k => toCsvValue(r[k])).join(','));
  return [header, ...lines].join('\n');
};

export const buildExcelHtml = (rows: Record<string, unknown>[]): string => {
  const keys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach(k => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  const header = `<tr>${keys.map(k => `<th>${String(k)}</th>`).join('')}</tr>`;
  const body = rows
    .map(r => `<tr>${keys.map(k => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${header}${body}</table></body></html>`;
};

export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const fromBase64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes as Uint8Array<ArrayBuffer>;
};

const randomBytes = (length: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(length) as Uint8Array<ArrayBuffer>;
  crypto.getRandomValues(bytes);
  return bytes;
};

const deriveKey = async (passphrase: string, salt: Uint8Array<ArrayBuffer>) => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey'
  ]);

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export type EncryptedPayload = {
  v: 1;
  alg: 'AES-GCM';
  saltB64: string;
  ivB64: string;
  cipherB64: string;
};

export const encryptJson = async (data: unknown, passphrase: string): Promise<EncryptedPayload> => {
  const enc = new TextEncoder();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const plaintext = enc.encode(JSON.stringify(data));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as unknown as BufferSource)
  ) as Uint8Array<ArrayBuffer>;

  return {
    v: 1,
    alg: 'AES-GCM',
    saltB64: toBase64(salt),
    ivB64: toBase64(iv),
    cipherB64: toBase64(cipher)
  };
};

export const decryptJson = async <T = unknown>(payload: EncryptedPayload, passphrase: string): Promise<T> => {
  const dec = new TextDecoder();
  const salt = fromBase64(payload.saltB64);
  const iv = fromBase64(payload.ivB64);
  const cipher = fromBase64(payload.cipherB64);
  const key = await deriveKey(passphrase, salt);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher as unknown as BufferSource)
  ) as Uint8Array<ArrayBuffer>;
  return JSON.parse(dec.decode(plaintext)) as T;
};
