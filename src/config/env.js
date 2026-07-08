const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';
const DEFAULT_ROOT_KEY = 'root';
const DEFAULT_CALENDAR_MIN_HOUR = 7;
const DEFAULT_CALENDAR_MAX_HOUR = 19;

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');
const isBlank = (value) => value == null || String(value).trim() === '';
const isProdBuild = Boolean(import.meta.env.PROD);

const toNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getEnv = (key, value, { fallback = '', requiredInProd = false } = {}) => {
  if (!isBlank(value)) return String(value).trim();

  if (requiredInProd && isProdBuild && isBlank(fallback)) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }

  if (import.meta.env.DEV) {
    console.warn(`[env] Missing ${key}; using fallback.`);
  }

  return fallback;
};

const normalizeApiBaseUrl = (rawValue) => {
  const trimmed = trimTrailingSlash(rawValue);
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(
  getEnv('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL, {
    fallback: DEFAULT_API_BASE_URL,
    requiredInProd: true,
  }),
);

const GOOGLE_CLIENT_ID = getEnv(
  'VITE_GOOGLE_CLIENT_ID',
  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  { fallback: '', requiredInProd: true },
);

export const env = {
  API_BASE_URL,
  API_ORIGIN: API_BASE_URL.replace(/\/api$/, ''),
  ROOT_KEY: getEnv('VITE_ROOT_KEY', import.meta.env.VITE_ROOT_KEY, { fallback: DEFAULT_ROOT_KEY }),
  GOOGLE_CLIENT_ID,
  CALENDAR_MIN_HOUR: toNumber(import.meta.env.VITE_CALENDAR_MIN_HOUR, DEFAULT_CALENDAR_MIN_HOUR),
  CALENDAR_MAX_HOUR: toNumber(import.meta.env.VITE_CALENDAR_MAX_HOUR, DEFAULT_CALENDAR_MAX_HOUR),
};
