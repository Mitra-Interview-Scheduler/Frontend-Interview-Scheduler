import {
  InterviewRequestStatus,
  InterviewScheduleStatus,
  getInterviewStatusMeta,
} from '@/lib/statusConstants';

const hasCandidateInterviewRecord = (request) => Boolean(request?.interviewScheduleId);

const getInterviewSortTime = (request) => {
  if (request?.createdAt) {
    const created = new Date(request.createdAt).getTime();
    if (!Number.isNaN(created)) return created;
  }
  return new Date(request?.scheduledStartDateTime || request?.preferredStartDateTime || 0).getTime();
};

export const resolveInterviewRequestStatus = (request) => {
  if (!request) return InterviewScheduleStatus.SCHEDULED;
  if (request.interviewStatus) return request.interviewStatus;
  if (request.status === InterviewRequestStatus.CANCELLED) {
    return InterviewScheduleStatus.CANCELLED;
  }
  return InterviewScheduleStatus.SCHEDULED;
};

/** Orders interviews by when they were created (1st scheduled = 1st pipeline round). */
export const getInterviewCreationOrderTimestamp = (request) => {
  if (request?.createdAt) {
    const time = new Date(request.createdAt).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return Number(request?.id ?? 0);
};

export const compareInterviewCreationOrder = (a, b) => {
  const delta = getInterviewCreationOrderTimestamp(a) - getInterviewCreationOrderTimestamp(b);
  if (delta !== 0) return delta;
  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
};

const deriveAggregateInterviewStatus = (statuses = []) => {
  if (statuses.includes(InterviewScheduleStatus.SCHEDULED)) {
    return InterviewScheduleStatus.SCHEDULED;
  }
  if (statuses.length > 0 && statuses.every((status) => status === InterviewScheduleStatus.CANCELLED)) {
    return InterviewScheduleStatus.CANCELLED;
  }
  if (statuses.length > 0 && statuses.every((status) => status === InterviewScheduleStatus.COMPLETED)) {
    return InterviewScheduleStatus.COMPLETED;
  }
  return statuses[0] || InterviewScheduleStatus.SCHEDULED;
};

export const resolveInterviewRoundStatus = (round) => {
  if (!round) return InterviewScheduleStatus.SCHEDULED;
  if (round.interviewStatus) return round.interviewStatus;
  if (round.kind === 'panel') {
    return deriveAggregateInterviewStatus(
      (round.panelRequests || []).map(resolveInterviewRequestStatus),
    );
  }
  return resolveInterviewRequestStatus(round);
};

const getInterviewRoundCreationOrderTimestamp = (round) => {
  if (round?.createdAt) {
    const time = new Date(round.createdAt).getTime();
    if (!Number.isNaN(time)) return time;
  }
  if (round?.kind === 'panel') {
    return getInterviewCreationOrderTimestamp(round.panelRequests?.[0]);
  }
  return getInterviewCreationOrderTimestamp(round);
};

export const compareInterviewRoundCreationOrder = (a, b) => {
  const delta = getInterviewRoundCreationOrderTimestamp(a) - getInterviewRoundCreationOrderTimestamp(b);
  if (delta !== 0) return delta;
  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
};

/**
 * One entry per interview round for pipeline matching.
 * A panel counts as a single round (not one entry per panel interviewer).
 */
export const collectInterviewRoundsForPipeline = (interviews = [], panels = []) => {
  const rounds = [];
  const panelScheduleIds = new Set();

  (panels || []).forEach((panel) => {
    const panelRequests = (panel.panelRequests || []).filter(hasCandidateInterviewRecord);
    if (panelRequests.length === 0) return;

    panelRequests.forEach((request) => panelScheduleIds.add(request.interviewScheduleId));
    const aggregateStatus = deriveAggregateInterviewStatus(
      panelRequests.map(resolveInterviewRequestStatus),
    );

    rounds.push({
      kind: 'panel',
      panel,
      panelRequests,
      interviewType: panelRequests[0]?.interviewType,
      createdAt: panel.createdAt || panelRequests[0]?.createdAt,
      id: panel.id,
      interviewScheduleId: `panel-${panel.id}`,
      interviewStatus: aggregateStatus,
    });
  });

  (interviews || []).forEach((interview) => {
    if (!hasCandidateInterviewRecord(interview)) return;
    if (interview.panelId || panelScheduleIds.has(interview.interviewScheduleId)) return;

    rounds.push({
      kind: 'single',
      ...interview,
    });
  });

  return rounds.sort(compareInterviewRoundCreationOrder);
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

  return [...singleEntries, ...panelEntries].sort(compareInterviewCreationOrder);
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

  return entries.sort((a, b) => {
    const left = a.kind === 'panel' ? a.panelRequests?.[0] : a.interview;
    const right = b.kind === 'panel' ? b.panelRequests?.[0] : b.interview;
    return compareInterviewCreationOrder(left, right);
  });
};

export { getInterviewStatusMeta };
