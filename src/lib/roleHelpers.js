export const normalizeRole = (role) => {
  const value = String(role || '').trim();
  if (!value) return '';
  const upper = value.toUpperCase();
  return upper.startsWith('ROLE_') ? upper.slice(5) : upper;
};

export const ROLE_DISPLAY_ORDER = ['ADMIN', 'HR', 'INTERVIEWER'];

export const sortRoles = (roles) => {
  const normalized = [...new Set(
    (Array.isArray(roles) ? roles : [])
      .map(normalizeRole)
      .filter(Boolean),
  )];

  return normalized.sort((a, b) => {
    const indexA = ROLE_DISPLAY_ORDER.indexOf(a);
    const indexB = ROLE_DISPLAY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

export const hasRole = (roles, targetRole) =>
  sortRoles(roles).includes(normalizeRole(targetRole));

export const hasInterviewerRole = (roles) => hasRole(roles, 'INTERVIEWER');

export const getDefaultDashboardPath = (userOrRoles) => {
  const roles = getNormalizedRoles(userOrRoles);
  if (hasRole(roles, 'ADMIN')) return '/admin/dashboard';
  if (hasRole(roles, 'HR')) return '/hr/dashboard';
  if (hasInterviewerRole(roles)) return '/interviewer/dashboard';
  return '/login';
};

export const getNormalizedRoles = (userOrRoles) => {
  if (Array.isArray(userOrRoles)) {
    return sortRoles(userOrRoles);
  }
  const rawRoles = userOrRoles?.roles || (userOrRoles?.role ? [userOrRoles.role] : []);
  return sortRoles(rawRoles);
};

export const shouldLoadInterviewerTechnologies = (profile, authUser) =>
  hasInterviewerRole(profile?.roles) || hasInterviewerRole(getNormalizedRoles(authUser));
