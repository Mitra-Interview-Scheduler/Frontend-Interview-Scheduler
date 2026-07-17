import { useEffect, useMemo, useState } from 'react';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { collectInterviewRoundsForPipeline } from '@/lib/candidateInterviews';

export const useCandidateInterviews = (candidateId, refreshKey = 0) => {
  const [interviews, setInterviews] = useState([]);
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!candidateId) {
      setInterviews([]);
      setPanels([]);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [interviewData, panelData] = await Promise.all([
          hrAvailabilityAPI.getInterviewsForCandidate(candidateId),
          hrAvailabilityAPI.getPanelsByCandidateId(candidateId),
        ]);
        if (!cancelled) {
          setInterviews(Array.isArray(interviewData) ? interviewData : []);
          setPanels(Array.isArray(panelData) ? panelData : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load interviews');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [candidateId, refreshKey]);

  const interviewRequests = useMemo(
    () => collectInterviewRoundsForPipeline(interviews, panels),
    [interviews, panels],
  );

  return { interviews, panels, interviewRequests, loading, error };
};

export default useCandidateInterviews;
