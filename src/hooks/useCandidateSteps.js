import { useEffect, useState } from 'react';
import { candidateStepAPI } from '@/services/candidateStepAPI';
import { FALLBACK_CANDIDATE_STEPS, normalizeCandidateSteps } from '@/lib/candidateSteps';

let cachedCandidateSteps = null;

export const useCandidateSteps = () => {
  const [candidateSteps, setCandidateSteps] = useState(() => cachedCandidateSteps || FALLBACK_CANDIDATE_STEPS);
  const [loading, setLoading] = useState(!cachedCandidateSteps);

  useEffect(() => {
    let active = true;

    if (cachedCandidateSteps) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    candidateStepAPI.getCandidateSteps()
      .then((steps) => {
        if (!active) return;
        cachedCandidateSteps = normalizeCandidateSteps(steps);
        setCandidateSteps(cachedCandidateSteps);
      })
      .catch(() => {
        if (!active) return;
        cachedCandidateSteps = FALLBACK_CANDIDATE_STEPS;
        setCandidateSteps(FALLBACK_CANDIDATE_STEPS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { candidateSteps: normalizeCandidateSteps(candidateSteps), loading };
};

export default useCandidateSteps;
