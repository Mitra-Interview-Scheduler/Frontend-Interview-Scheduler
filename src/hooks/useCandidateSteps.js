import { useEffect, useState } from 'react';
import { candidatePipelineAPI } from '@/services/candidatePipelineApi';
import {
  FALLBACK_CANDIDATE_STEPS,
  normalizeCandidateSteps,
} from '@/lib/candidateSteps';

export const useCandidateSteps = (candidate) => {
  const [candidateSteps, setCandidateSteps] = useState(FALLBACK_CANDIDATE_STEPS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidate?.id) {
      setCandidateSteps(FALLBACK_CANDIDATE_STEPS);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    candidatePipelineAPI.getCandidatePipeline(candidate.id)
      .then((steps) => active && setCandidateSteps(steps))
      .catch((error) => {
        console.error(`Failed to load pipeline for candidate ${candidate.id}:`, error);
        if (active) setCandidateSteps(FALLBACK_CANDIDATE_STEPS);
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [candidate?.id]);

  return {
    candidateSteps: normalizeCandidateSteps(candidateSteps),
    loading,
  };
};

// export const getCandidateClosingSteps = (candidate) => {

//   useEffect(() => {
//     if (!candidate?.id) return;
    
//     let active = true;
//     setLoading(true);

    
 
// }

// export default useCandidateSteps;