import { useEffect, useState } from 'react';

export function toCatalogTypeOptions(data) {
  return (Array.isArray(data) ? data : [])
    .filter((item) => item?.code && item?.label)
    .map((item) => ({ code: item.code, label: item.label }));
}

export function useActiveCatalogTypes(getActive, { enabled = true, fallback = [] } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    setLoading(true);

    getActive()
      .then((data) => {
        if (cancelled) return;
        const mapped = toCatalogTypeOptions(data);
        setOptions(mapped.length > 0 ? mapped : fallback);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions(fallback);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, getActive, fallback]);

  return { options, loading };
}
