// Tracks whether the API server is reachable, based on the outcome of real requests.
const listeners = new Set();
let reachable = true;

export const isServerReachable = () => reachable;

export const setServerReachable = (next) => {
  if (next === reachable) return;
  reachable = next;
  listeners.forEach((listener) => listener());
};

export const subscribeServerStatus = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** No response at all (server down, DNS, CORS, offline) or a gateway/unavailable error. */
export const isServerUnavailableError = (error) => {
  if (!error || error.code === 'ERR_CANCELED') return false;
  if (!error.response) return Boolean(error.request || error.isAxiosError);
  return [502, 503, 504].includes(error.response.status);
};
