import {
  InterviewRequestStatus,
  InterviewScheduleStatus,
  getInterviewStatusMeta,
} from '@/lib/statusConstants';

const hasCandidateInterviewRecord = (request) => Boolean(request?.interviewScheduleId);

const getInterviewSortTime = (request) => (
  new Date(request?.scheduledStartDateTime || request?.preferredStartDateTime || 0).getTime()
);

export const resolveInterviewRequestStatus = (request) => {
  if (!request) return InterviewScheduleStatus.SCHEDULED;
  if (request.interviewStatus) return request.interviewStatus;
  if (request.status === InterviewRequestStatus.CANCELLED) {
    return InterviewScheduleStatus.CANCELLED;
  }
  return InterviewScheduleStatus.SCHEDULED;
};

export const getInterviewerDesignationLabel = (request) => (
  request?.assignedInterviewerDesignationName?.trim() || null
);

export const collectCandidateInterviewRequests = (interviews = [], panels = []) => {
  const panelScheduleIds = new Set();
  const panelEntries = (panels || []).flatMap((panel) => {
    const requests = (panel.panelRequests || []).filter(hasCandidateInterviewRecord);
    requests.forEach((request) => panelScheduleIds.add(request.interviewScheduleId));
    return requests;
  });

  const singleEntries = (interviews || []).filter(
    (request) => hasCandidateInterviewRecord(request)
      && !request.panelId
      && !panelScheduleIds.has(request.interviewScheduleId),
  );

  return [...singleEntries, ...panelEntries].sort(
    (a, b) => getInterviewSortTime(a) - getInterviewSortTime(b),
  );
};

/**
 * Builds one tab entry per single interview and one tab entry per panel (not per interviewer).
 */
export const buildInterviewTabEntries = (interviews = [], panels = []) => {
  const entries = [];
  const panelScheduleIds = new Set();

  (panels || []).forEach((panel) => {
    const panelRequests = (panel.panelRequests || []).filter(hasCandidateInterviewRecord);
    if (panelRequests.length === 0) return;

    panelRequests.forEach((request) => panelScheduleIds.add(request.interviewScheduleId));
    entries.push({
      kind: 'panel',
      panel,
      panelRequests,
      sortTime: new Date(panel.startDateTime || getInterviewSortTime(panelRequests[0])).getTime(),
    });
  });

  (interviews || []).forEach((interview) => {
    if (!hasCandidateInterviewRecord(interview)) return;
    if (interview.panelId || panelScheduleIds.has(interview.interviewScheduleId)) return;

    entries.push({
      kind: 'single',
      interview,
      sortTime: getInterviewSortTime(interview),
    });
  });

  return entries.sort((a, b) => a.sortTime - b.sortTime);
};

export { getInterviewStatusMeta };
