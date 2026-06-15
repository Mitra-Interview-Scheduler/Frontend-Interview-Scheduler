import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { candidatePipelineAPI } from '@/services/candidatePipelineApi';
import { masterStepAPI } from '@/services/masterStepApi';
import { normalizeCandidateSteps } from '@/lib/candidateSteps';

export const useCandidateSteps = (candidate) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [candidateSteps, setCandidateSteps] = useState([]);
  const [closingSteps, setClosingSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const refreshSteps = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(authLoading);
      if (!authLoading && !isAuthenticated) {
        setCandidateSteps([]);
        setClosingSteps([]);
      }
      return;
    }

    let active = true;
    setLoading(true);

    const loadMasterSteps = masterStepAPI.getCandidateSteps()
      .then((steps) => (Array.isArray(steps) ? steps : []))
      .catch((error) => {
        console.error('Failed to load master candidate steps:', error);
        return [];
      });

    const loadClosingSteps = masterStepAPI.getClosingSteps()
      .then((steps) => (Array.isArray(steps) ? steps : []))
      .catch((error) => {
        console.error('Failed to load closing candidate steps:', error);
        return [];
      });

    if (!candidate?.id) {
      Promise.all([loadMasterSteps, loadClosingSteps])
        .then(([masterSteps, closing]) => {
          if (!active) return;
          setCandidateSteps(masterSteps);
          setClosingSteps(closing);
        })
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }

    Promise.all([
      loadMasterSteps,
      loadClosingSteps,
      candidatePipelineAPI.getCandidatePipeline(candidate.id).catch((error) => {
        console.error(`Failed to load pipeline for candidate ${candidate.id}:`, error);
        return [];
      }),
    ]).then(([masterSteps, closing, pipelineSteps]) => {
      if (!active) return;
      const steps = Array.isArray(pipelineSteps) && pipelineSteps.length > 0
        ? pipelineSteps
        : masterSteps;
      setCandidateSteps(steps);
      setClosingSteps(closing);
    }).finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [candidate?.id, authLoading, isAuthenticated, reloadToken]);

  return {
    candidateSteps: normalizeCandidateSteps(candidateSteps),
    closingSteps: normalizeCandidateSteps(closingSteps),
    loading,
    refreshSteps,
  };
};
