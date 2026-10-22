let accessToken = null;
let csrfToken = null;

const readCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const encoded = name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${encoded}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const getCsrfToken = () => csrfToken || readCookie('XSRF-TOKEN');

export const setCsrfToken = (token) => {
  csrfToken = token || null;
};
