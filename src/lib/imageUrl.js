import { env } from '@/config/env';

const API_BASE_URL = env.API_BASE_URL;

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const unquoted = trimmed.replace(/^['\"]+|['\"]+$/g, '').trim();
  const normalized = unquoted.replace(/\\\//g, '/');

  if (!normalized) return null;
  if (/^(null|undefined|n\/a|na)$/i.test(normalized)) return null;

  if (/^(https?:)?\/\//i.test(normalized)) {
    return normalized.startsWith('//') ? `https:${normalized}` : normalized;
  }

  if (/^(data:image|blob:)/i.test(normalized)) {
    return normalized;
  }

  if (normalized.includes('googleusercontent.com') && !normalized.startsWith('http')) {
    return `https://${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `${API_ORIGIN}${normalized}`;
  }

  return `${API_ORIGIN}/${normalized}`;
};
