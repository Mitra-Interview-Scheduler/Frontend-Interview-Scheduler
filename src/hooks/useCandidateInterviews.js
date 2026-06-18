import { useEffect, useMemo, useState } from 'react';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { collectCandidateInterviewRequests } from '@/lib/candidateInterviews';

export const useCandidateInterviews = (candidateId, refreshKey = 0) => {
  const [interviews, setInterviews] = useState([]);
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) {
      setInterviews([]);
      setPanels([]);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [interviewData, panelData] = await Promise.all([
          hrAvailabilityAPI.getInterviewsForCandidate(candidateId),
          hrAvailabilityAPI.getPanelsByCandidateId(candidateId),
        ]);
        if (!cancelled) {
          setInterviews(Array.isArray(interviewData) ? interviewData : []);
          setPanels(Array.isArray(panelData) ? panelData : []);
        }
      } catch {
        if (!cancelled) {
          setInterviews([]);
          setPanels([]);
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
    () => collectCandidateInterviewRequests(interviews, panels),
    [interviews, panels],
  );

  return { interviews, panels, interviewRequests, loading };
};

export default useCandidateInterviews;
