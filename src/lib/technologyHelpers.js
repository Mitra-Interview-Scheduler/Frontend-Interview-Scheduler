export const getTechnologyCategoryLabel = (tech) =>
  tech?.category?.label ?? tech?.categoryLabel ?? 'Other';

export const getTechnologyCategoryCode = (tech) =>
  tech?.category?.code ?? tech?.categoryCode ?? '';

export const toLookupCode = (value) =>
  (value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
