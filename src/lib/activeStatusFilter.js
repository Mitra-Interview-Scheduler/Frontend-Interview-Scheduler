export const ACTIVE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ALL: 'all',
};

export const DEFAULT_ACTIVE_STATUS = ACTIVE_STATUS.ACTIVE;

export function isRecordActive(item) {
  if (!item) return true;
  if (item.isActive === false || item.active === false) return false;
  if (item.isActive === true || item.active === true) return true;
  return true;
}

export function filterByActiveStatus(items, status = DEFAULT_ACTIVE_STATUS) {
  if (!Array.isArray(items)) return [];
  if (status === ACTIVE_STATUS.ALL) return items;
  if (status === ACTIVE_STATUS.INACTIVE) return items.filter((item) => !isRecordActive(item));
  return items.filter((item) => isRecordActive(item));
}
