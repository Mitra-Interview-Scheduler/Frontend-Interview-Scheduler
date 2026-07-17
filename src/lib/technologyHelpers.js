export const getTechnologyCategoryLabel = (tech) =>
  tech?.category?.label ?? tech?.categoryLabel ?? 'Other';

export const getTechnologyCategoryCode = (tech) =>
  tech?.category?.code ?? tech?.categoryCode ?? '';

export const getSkillIsCore = (item) => Boolean(item?.isCore ?? item?.core);

export const getCandidateCoreTechnologyIds = (technologies = []) =>
  technologies
    .filter((item) => getSkillIsCore(item))
    .map((item) => item.technology?.id)
    .filter(Boolean);

export const normalizeSkillAssignment = (item) => (
  item ? { ...item, isCore: getSkillIsCore(item) } : item
);

export const filterTechnologiesByCategory = (technologies = [], categoryCode = '') => {
  if (!categoryCode) return technologies;
  return technologies.filter((tech) => getTechnologyCategoryCode(tech) === categoryCode);
};

export const toLookupCode = (value) =>
  (value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
