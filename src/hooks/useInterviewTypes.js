import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { interviewTypeAPI } from '@/services/interviewTypeAPI';

/**
 * Loads the configurable interview types from the backend.
 * @param {boolean} activeOnly - when true, only active types (for scheduling dropdowns).
 */
export const useInterviewTypes = (activeOnly = true) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [interviewTypes, setInterviewTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(authLoading);
      if (!authLoading && !isAuthenticated) setInterviewTypes([]);
      return undefined;
    }

    let active = true;
    setLoading(true);
    interviewTypeAPI.getAll(activeOnly)
      .then((data) => {
        if (active) setInterviewTypes(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('Failed to load interview types:', error);
        if (active) setInterviewTypes([]);
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [activeOnly, authLoading, isAuthenticated, reloadToken]);

  return { interviewTypes, loading, refresh };
};

export default useInterviewTypes;
