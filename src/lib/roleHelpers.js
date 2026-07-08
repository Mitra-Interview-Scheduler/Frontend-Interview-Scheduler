export const normalizeRole = (role) => {
  const value = String(role || '').trim();
  if (!value) return '';
  const upper = value.toUpperCase();
  return upper.startsWith('ROLE_') ? upper.slice(5) : upper;
};

export const hasRole = (roles, targetRole) =>
  (Array.isArray(roles) ? roles : [])
    .map(normalizeRole)
    .includes(normalizeRole(targetRole));

export const hasInterviewerRole = (roles) => hasRole(roles, 'INTERVIEWER');

export const getNormalizedRoles = (userOrRoles) => {
  if (Array.isArray(userOrRoles)) {
    return userOrRoles.map(normalizeRole).filter(Boolean);
  }
  const rawRoles = userOrRoles?.roles || (userOrRoles?.role ? [userOrRoles.role] : []);
  return rawRoles.map(normalizeRole).filter(Boolean);
};

export const shouldLoadInterviewerTechnologies = (profile, authUser) =>
  hasInterviewerRole(profile?.roles) || hasInterviewerRole(getNormalizedRoles(authUser));
