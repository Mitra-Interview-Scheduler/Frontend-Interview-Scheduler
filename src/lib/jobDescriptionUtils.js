const flattenJsonSections = (parsed) => {
  if (!Array.isArray(parsed)) return '';
  return parsed
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      const text = (item?.text || '').trim();
      const url = (item?.url || '').trim();
      return [text, url].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
};

/** Read jdUrl as a single multiline string (supports legacy JSON sections and URLs). */
export const parseJobDescriptionText = (rawValue) => {
  if (!rawValue || !String(rawValue).trim()) return '';

  const raw = String(rawValue).trim();
  try {
    const parsed = JSON.parse(raw);
    const flattened = flattenJsonSections(parsed);
    return flattened || raw;
  } catch {
    return raw;
  }
};

export const serializeJobDescriptionText = (value) => {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
};
