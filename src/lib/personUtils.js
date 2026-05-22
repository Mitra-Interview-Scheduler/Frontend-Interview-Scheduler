export const getInitial = (name, fallback = 'C') => {
  if (!name || typeof name !== 'string') return fallback;
  return name.trim().charAt(0).toUpperCase() || fallback;
};
