import { resolveInterviewRequestStatus, resolveInterviewRoundStatus, collectInterviewRoundsForPipeline, getInterviewerDesignationLabel, compareInterviewCreationOrder, compareInterviewRoundCreationOrder, getInterviewCreationOrderTimestamp } from '@/lib/candidateInterviews';
import {
  ActivityStepStatus,
  InterviewRequestStatus,
  InterviewScheduleStatus,
  InterviewType,
  MasterStatus,
  PipelineStepStatus,
  isInterviewRoundStatusKey,
  interviewTypeCodeFromRoundKey,
  isHrInterviewType,
  resolveRoundKeyForInterview,
  normalizeInterviewType,
  ACTIVITY_STATUS_META,
  INTERVIEW_STATUS_META,
  formatInterviewTypeLabel,
} from '@/lib/statusConstants';

export { formatInterviewTypeLabel };

const baseLabelForStatusKey = (statusKey, fallbackLabel) => {
  if (statusKey === MasterStatus.TECHNICAL_ROUND) return 'Technical';
  if (statusKey === MasterStatus.HR_ROUND) return 'HR';
  if (statusKey === MasterStatus.ON_HOLD) return 'On Hold';
  if (statusKey === MasterStatus.OFFER_PENDING) return 'Awaiting Offer';
  if (isInterviewRoundStatusKey(statusKey)) {
    return formatInterviewTypeLabel(interviewTypeCodeFromRoundKey(statusKey));
  }
  return fallbackLabel;
};

const buildPipelineStepLabel = (masterLabel, roundIndex, totalRoundsForKey) => {
  if (totalRoundsForKey <= 1 || roundIndex <= 1) {
    return masterLabel;
  }
  return `${masterLabel} ${roundIndex}`;
};

export const normalizeCandidateSteps = (steps) => {
  const source = Array.isArray(steps) ? steps : [];
  if (source.length === 0) return [];

  const mapped = source.map((item) => {
    const hasNestedStep = item.step && typeof item.step === 'object';
    const key = hasNestedStep ? item.step.statusKey : item.key;
    const masterLabel = hasNestedStep ? item.step.label : item.label;
    const stepNumber = Number(item.sequenceOrder ?? (hasNestedStep ? item.step.stepOrder : item.step) ?? 0);
    const displayOrder = Number((hasNestedStep ? item.step.displayOrder : item.displayOrder) ?? 0);
    const isClosingStep = hasNestedStep
      ? Boolean(item.step.isClosingStep ?? item.step.closingStep)
      : Boolean(item.isClosingStep ?? item.closingStep);
    const bgColor = (hasNestedStep ? item.step.bgColor : item.bgColor) || '#6b7280';
    const badgeClass = (hasNestedStep ? item.step.badgeClass : item.badgeClass) || 'bg-gray-100 text-gray-800';
    const lightClass = (hasNestedStep ? item.step.lightClass : item.lightClass) || 'bg-gray-100';
    const isVisible = hasNestedStep
      ? item.step.isVisible !== false
      : item.isVisible !== false;

    return {
      ...item,
      key,
      masterLabel,
      label: masterLabel,
      step: stepNumber,
      displayOrder,
      bgColor,
      badgeClass,
      lightClass,
      isClosingStep,
      isVisible,
    };
  }).filter((step) => step.isVisible !== false).sort((a, b) => (a.step - b.step) || (Number(a.id ?? 0) - Number(b.id ?? 0)));

  const roundCounts = mapped.reduce((counts, step) => {
    counts[step.key] = (counts[step.key] || 0) + 1;
    return counts;
  }, {});

  const roundIndexes = {};

  return mapped.map((step) => {
    roundIndexes[step.key] = (roundIndexes[step.key] || 0) + 1;
    const baseLabel = baseLabelForStatusKey(step.key, step.masterLabel);
    return {
      ...step,
      label: buildPipelineStepLabel(
        baseLabel,
        roundIndexes[step.key],
        roundCounts[step.key] || 1,
      ),
    };
  });
};

export const getCandidateStep = (steps, status) => {
  const normalized = normalizeCandidateSteps(steps);
  if (status) {
    const matchByKey = normalized.find((step) => step.key === status);
    if (matchByKey) {
      return matchByKey;
    }
  }
  return normalized.find((step) => step.stepStatus === PipelineStepStatus.CURRENT)
    ?? normalized.find((step) => step.key === status);
};

export const getCandidateStatusLabel = (steps, status) => {
  const candidateStep = getCandidateStep(steps, status);
  return candidateStep?.label || String(status || '-').replace(/_/g, ' ');
};

export const getCandidateStatusBadgeClass = (steps, status) => {
  const candidateStep = getCandidateStep(steps, status);
  return candidateStep?.badgeClass || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

export const getCandidateClosingSteps = (steps) => normalizeCandidateSteps(steps).filter(
  (step) => step.isClosingStep && step.isVisible !== false,
);

const dedupeInterviewRounds = (rounds) => {
  const seen = new Set();
  return rounds.filter((round) => {
    const id = round?.kind === 'panel'
      ? `panel-${round.panel?.id ?? round.id}`
      : (round?.interviewScheduleId ?? round?.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getInterviewRequestTimestamp = (request) => {
  const raw = request?.createdAt || request?.scheduledStartDateTime || request?.preferredStartDateTime;
  if (!raw) return Number(request?.id ?? 0);
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? Number(request?.id ?? 0) : time;
};

const enforceCancelledStepState = (steps) => steps.map((step) => (
  step.cancelledInterview
    ? { ...step, stepStatus: PipelineStepStatus.FAILED }
    : step
));

/**
 * Aligns pipeline CURRENT with the candidate's macro status when the backend
 * reset status (e.g. SCREENING after cancel) without updating pipeline rows.
 */
const syncPipelineWithMacroStatus = (steps, currentStatus) => {
  if (!currentStatus || !Array.isArray(steps) || steps.length === 0) return steps;

  const result = steps.map((step) => ({ ...step }));
  const hasMatchingCurrent = result.some(
    (step) => step.key === currentStatus
      && step.stepStatus === PipelineStepStatus.CURRENT
      && !step.cancelledInterview,
  );
  if (hasMatchingCurrent) {
    return enforceCancelledStepState(result);
  }

  let targetIndex = -1;
  for (let index = result.length - 1; index >= 0; index -= 1) {
    const step = result[index];
    if (step.key === currentStatus && !step.cancelledInterview) {
      targetIndex = index;
      break;
    }
  }
  if (targetIndex === -1) return enforceCancelledStepState(result);

  return enforceCancelledStepState(result.map((step, index) => {
    if (index === targetIndex) {
      return { ...step, stepStatus: PipelineStepStatus.CURRENT };
    }
    if (step.stepStatus === PipelineStepStatus.CURRENT) {
      return { ...step, stepStatus: PipelineStepStatus.COMPLETED };
    }
    return step;
  }));
};

/**
 * Marks pipeline round steps as FAILED when their chronologically matched interview
 * was cancelled, including the round that was CURRENT before status reset.
 * Later re-scheduled rounds on the same key are left alone.
 */
export const applyCancelledInterviewOverrides = (
  steps,
  interviewRequests = [],
  currentStatus = null,
) => {
  if (!Array.isArray(steps) || steps.length === 0) return steps;

  let overrides = [...steps];

  if (Array.isArray(interviewRequests) && interviewRequests.length > 0) {
    const uniqueRounds = dedupeInterviewRounds(interviewRequests);

    const requestsByRoundKey = {};
    uniqueRounds.forEach((round) => {
      const roundKey = resolveRoundKeyForInterview(round);
      if (!requestsByRoundKey[roundKey]) {
        requestsByRoundKey[roundKey] = [];
      }
      requestsByRoundKey[roundKey].push(round);
    });

    Object.values(requestsByRoundKey).forEach((rounds) => {
      rounds.sort(compareInterviewRoundCreationOrder);
    });

    const roundStepIndexes = {};
    overrides.forEach((step, index) => {
      if (isInterviewRoundStatusKey(step.key)) {
        if (!roundStepIndexes[step.key]) {
          roundStepIndexes[step.key] = [];
        }
        roundStepIndexes[step.key].push(index);
      }
    });

    Object.entries(roundStepIndexes).forEach(([roundKey, indexes]) => {
      const requests = requestsByRoundKey[roundKey] || [];

      indexes.forEach((stepIndex, roundIndex) => {
        const step = overrides[stepIndex];
        const linkedRound = requests[roundIndex];
        const linkedStatus = linkedRound ? resolveInterviewRoundStatus(linkedRound) : null;

        if (linkedStatus === InterviewScheduleStatus.CANCELLED) {
          overrides[stepIndex] = {
            ...step,
            stepStatus: PipelineStepStatus.FAILED,
            cancelledInterview: true,
          };
          return;
        }

        if (linkedStatus === InterviewScheduleStatus.COMPLETED) {
          overrides[stepIndex] = {
            ...step,
            stepStatus: PipelineStepStatus.COMPLETED,
            cancelledInterview: false,
          };
          return;
        }

        if (step.stepStatus === PipelineStepStatus.CURRENT) {
          return;
        }

        if (linkedStatus === InterviewScheduleStatus.SCHEDULED) {
          if (step.stepStatus === PipelineStepStatus.FAILED || step.cancelledInterview) {
            overrides[stepIndex] = {
              ...step,
              stepStatus: PipelineStepStatus.COMPLETED,
              cancelledInterview: false,
            };
          }
        }
      });
    });
  }

  if (currentStatus) {
    overrides = syncPipelineWithMacroStatus(overrides, currentStatus);
  }

  return enforceCancelledStepState(overrides);
};

/**
 * Keeps macro stages in pipeline order but sorts interview round steps by when
 * each interview was actually scheduled (global chronology), not by round type.
 */
export const sortPipelineStepsByInterviewChronology = (steps, interviewRequests = []) => {
  if (!Array.isArray(steps) || steps.length === 0) return steps;

  const sorted = [...steps].sort((a, b) => a.step - b.step || Number(a.id ?? 0) - Number(b.id ?? 0));
  const roundSteps = sorted
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => isInterviewRoundStatusKey(step.key));

  if (roundSteps.length <= 1) {
    return assignDisplayStepNumbers(sorted);
  }

  const stepsByKey = {};
  roundSteps.forEach(({ step, index }) => {
    if (!stepsByKey[step.key]) {
      stepsByKey[step.key] = [];
    }
    stepsByKey[step.key].push({ step, index });
  });

  const usedIndices = new Set();
  const matchedRounds = [];

  dedupeInterviewRounds(interviewRequests)
    .sort(compareInterviewRoundCreationOrder)
    .forEach((interview) => {
      const roundKey = resolveRoundKeyForInterview(interview);
      const pool = stepsByKey[roundKey] || [];
      const match = pool.find(({ index }) => !usedIndices.has(index));
      if (!match) return;

      usedIndices.add(match.index);
      matchedRounds.push({
        step: match.step,
        timestamp: getInterviewCreationOrderTimestamp(interview),
        sourceIndex: match.index,
      });
    });

  roundSteps.forEach(({ step, index }) => {
    if (usedIndices.has(index)) return;
    matchedRounds.push({
      step,
      timestamp: step.step * 1_000_000 + Number(step.id ?? 0),
      sourceIndex: index,
    });
  });

  matchedRounds.sort((a, b) => a.timestamp - b.timestamp || a.sourceIndex - b.sourceIndex);

  const firstRoundIndex = Math.min(...roundSteps.map(({ index }) => index));
  const lastRoundIndex = Math.max(...roundSteps.map(({ index }) => index));
  const nonRoundBefore = sorted.slice(0, firstRoundIndex);
  const macroBetweenRounds = sorted.filter(
    (step, index) => index > firstRoundIndex
      && index < lastRoundIndex
      && !isInterviewRoundStatusKey(step.key),
  );
  const nonRoundAfter = sorted.slice(lastRoundIndex + 1);

  return assignDisplayStepNumbers([
    ...nonRoundBefore,
    ...matchedRounds.map(({ step }) => step),
    ...macroBetweenRounds.sort((a, b) => a.step - b.step || Number(a.id ?? 0) - Number(b.id ?? 0)),
    ...nonRoundAfter,
  ]);
};

const assignDisplayStepNumbers = (steps) => steps.map((step, index) => ({
  ...step,
  step: index + 1,
}));

const ROUND_STAGE_KEYS = {
  has: (key) => isInterviewRoundStatusKey(key),
};

const INTERVIEW_GROUP_ORDER = {
  ROUND_STAGE: 0,
  STATUS_AUDIT: 15,
  PRELUDE: 1,
  DEFAULT: 50,
};

const PIPELINE_AUDIT_ACTION_LABELS = {
  APPLICATION_CREATED: 'Application created',
  STATUS_CHANGED: 'Status updated',
  SCREENING_SAVED: 'Screening saved',
  APPLICATION_CLOSED: 'Application closed',
  INTERVIEW_SCHEDULED: 'Interview scheduled',
  INTERVIEW_CANCELLED: 'Interview cancelled',
  FEEDBACK_SUBMITTED: 'Feedback submitted',
};

const formatActorDetail = (name, designation) => {
  if (!name) return null;
  if (designation) return `By ${name} (${designation})`;
  return `By ${name}`;
};

const formatStatusKeyLabel = (statusKey) => String(statusKey || '')
  .trim()
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const resolveAuditEntryStyle = (actionType) => {
  if (actionType === 'INTERVIEW_CANCELLED') {
    return {
      statusBadgeClass: 'bg-red-50 text-red-700 border-red-200',
      bgColor: '#ef4444',
    };
  }
  return {
    statusBadgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    bgColor: '#8b5cf6',
  };
};

export const mapPipelineStatusEventsToActivityEntries = (events = [], getStepLabel) => (
  events.map((event) => {
    const timestamp = event.createdAt;
    const sortTimestamp = timestamp ? new Date(timestamp).getTime() : Number(event.id ?? 0);
    const stepLabel = getStepLabel
      ? getStepLabel(event.statusKey)
      : formatStatusKeyLabel(event.statusKey);
    const auditStyle = resolveAuditEntryStyle(event.actionType);

    return withSortMeta({
      id: `status-audit-${event.id}`,
      kind: 'STATUS_AUDIT',
      stepLabel,
      stepKey: event.statusKey,
      masterStepId: event.masterStepId,
      previousStatusKey: event.previousStatusKey,
      previousMasterStepId: event.previousMasterStepId,
      actionType: event.actionType,
      stepStatus: ActivityStepStatus.CREATED,
      sequenceOrder: 5000 + Number(event.id ?? 0),
      timestamp,
      detail: formatActorDetail(event.changedByName, event.changedByDesignation),
      notes: event.notes,
      actionLabel: PIPELINE_AUDIT_ACTION_LABELS[event.actionType] || 'Updated',
      statusBadgeClass: auditStyle.statusBadgeClass,
      bgColor: auditStyle.bgColor,
    }, sortTimestamp, INTERVIEW_GROUP_ORDER.STATUS_AUDIT);
  })
);

const pickLatestAuditActorForStep = (step, statusEvents = []) => {
  const masterStepId = step.step?.id ?? step.masterStepId ?? null;
  const matches = statusEvents.filter((event) => {
    if (masterStepId != null && event.masterStepId != null) {
      return Number(event.masterStepId) === Number(masterStepId);
    }
    return event.statusKey === step.key;
  });
  if (matches.length === 0) return null;
  const event = matches[0];
  return formatActorDetail(event.changedByName, event.changedByDesignation);
};

const getActivityTimestamp = (entry) => {
  if (!entry?.timestamp) return Number(entry?.sequenceOrder ?? 0);
  const time = new Date(entry.timestamp).getTime();
  return Number.isNaN(time) ? Number(entry?.sequenceOrder ?? 0) : time;
};

const withSortMeta = (entry, sortTimestamp, groupOrder = INTERVIEW_GROUP_ORDER.DEFAULT) => ({
  ...entry,
  sortTimestamp,
  groupOrder,
});

const compareActivityEntries = (a, b) => {
  const timeA = a.sortTimestamp ?? getActivityTimestamp(a);
  const timeB = b.sortTimestamp ?? getActivityTimestamp(b);
  if (timeA !== timeB) return timeA - timeB;
  const orderA = a.groupOrder ?? INTERVIEW_GROUP_ORDER.DEFAULT;
  const orderB = b.groupOrder ?? INTERVIEW_GROUP_ORDER.DEFAULT;
  if (orderA !== orderB) return orderA - orderB;
  return Number(a.sequenceOrder ?? 0) - Number(b.sequenceOrder ?? 0);
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

const hasInterviewActivityRecord = (request) => {
  if (!request) return false;
  if (request.interviewScheduleId || request.interviewStatus || request.scheduledStartDateTime) {
    return true;
  }
  return request.status === InterviewRequestStatus.ACCEPTED && Boolean(request.preferredStartDateTime);
};

const formatInterviewerDetail = (request) => {
  const name = request?.assignedInterviewerName;
  if (!name) return null;
  const role = getInterviewerDesignationLabel(request);
  return role ? `${name} · ${role}` : name;
};

const buildPanelInterviewerDetail = (panelRequests = []) => (
  panelRequests.map(formatInterviewerDetail).filter(Boolean).join('; ')
);

const getInterviewStatus = (request) => resolveInterviewRequestStatus(request);

const createInterviewPreludeEntry = (request) => {
  const interviewType = normalizeInterviewType(request.interviewType);
  const typeLabel = formatInterviewTypeLabel(interviewType);
  const interviewStatus = getInterviewStatus(request);
  const meta = INTERVIEW_STATUS_META[interviewStatus] || INTERVIEW_STATUS_META[InterviewScheduleStatus.SCHEDULED];
  const sortTimestamp = getInterviewRequestTimestamp(request);
  const stepLabel = interviewStatus === InterviewScheduleStatus.CANCELLED
    ? `${typeLabel} cancelled`
    : interviewStatus === InterviewScheduleStatus.COMPLETED
      ? `${typeLabel} completed`
      : `${typeLabel} scheduled`;

  return withSortMeta({
    id: `interview-prelude-${request.interviewScheduleId || request.id}`,
    kind: 'INTERVIEW_PRELUDE',
    stepLabel,
    stepKey: interviewType,
    stepStatus: interviewStatus,
    sequenceOrder: 1000 + Number(request.id ?? 0),
    timestamp: request.scheduledStartDateTime || request.preferredStartDateTime || request.createdAt || null,
    endTimestamp: request.scheduledEndDateTime || request.preferredEndDateTime || null,
    bgColor: isHrInterviewType(interviewType) ? '#ec4899' : '#3b82f6',
    actionLabel: meta.action,
    statusBadgeClass: meta.badgeClass,
    interviewType,
    interviewRequest: request,
    detail: formatInterviewerDetail(request),
  }, sortTimestamp, INTERVIEW_GROUP_ORDER.PRELUDE);
};

const createInterviewActivityGroup = (request) => [createInterviewPreludeEntry(request)];

const mapPanelToActivityEntries = (panel) => {
  const panelRequests = panel.panelRequests || [];
  const activityRequests = panelRequests.filter(hasInterviewActivityRecord);
  if (activityRequests.length === 0) return [];

  const statuses = activityRequests.map((request) => getInterviewStatus(request));
  const aggregateStatus = deriveAggregateInterviewStatus(statuses);
  const meta = INTERVIEW_STATUS_META[aggregateStatus] || INTERVIEW_STATUS_META[InterviewScheduleStatus.SCHEDULED];
  const interviewType = normalizeInterviewType(activityRequests[0]?.interviewType);
  const sortTimestamp = getInterviewRequestTimestamp(activityRequests[0]) || getInterviewRequestTimestamp(panel);
  const typeLabel = formatInterviewTypeLabel(interviewType);
  const stepLabel = aggregateStatus === InterviewScheduleStatus.CANCELLED
    ? `${typeLabel} cancelled`
    : aggregateStatus === InterviewScheduleStatus.COMPLETED
      ? `${typeLabel} completed`
      : `${typeLabel} scheduled`;
  const timestamp = panel.startDateTime || activityRequests[0]?.scheduledStartDateTime || panel.createdAt || null;
  const endTimestamp = panel.endDateTime || activityRequests[0]?.scheduledEndDateTime || null;

  const shared = {
    stepKey: interviewType,
    stepStatus: aggregateStatus,
    sequenceOrder: 2000 + Number(panel.id ?? 0),
    timestamp,
    endTimestamp,
    bgColor: isHrInterviewType(interviewType) ? '#ec4899' : '#0ea5e9',
    actionLabel: meta.action,
    statusBadgeClass: meta.badgeClass,
    interviewType,
    panel,
  };

  return [
    withSortMeta({
      ...shared,
      id: `panel-prelude-${panel.id}`,
      kind: 'INTERVIEW_PRELUDE',
      stepLabel,
      detail: buildPanelInterviewerDetail(activityRequests),
    }, sortTimestamp, INTERVIEW_GROUP_ORDER.PRELUDE),
  ];
};

const buildInterviewActivityEntries = (interviews = [], panels = []) => {
  const entries = [];
  const panelScheduleIds = new Set();

  (panels || []).forEach((panel) => {
    (panel.panelRequests || []).forEach((request) => {
      if (request?.interviewScheduleId) {
        panelScheduleIds.add(request.interviewScheduleId);
      }
    });
  });

  (interviews || [])
    .filter(
      (request) => hasInterviewActivityRecord(request)
        && !request.panelId
        && !panelScheduleIds.has(request.interviewScheduleId),
    )
    .forEach((request) => {
      entries.push(...createInterviewActivityGroup(request));
    });

  (panels || []).forEach((panel) => {
    entries.push(...mapPanelToActivityEntries(panel));
  });

  return entries;
};

const PIPELINE_SORT_SCALE = 100_000;

const toPipelineSortKey = (sequenceOrder, subOrder = 0) => (
  Number(sequenceOrder ?? 0) * PIPELINE_SORT_SCALE + subOrder
);

const sortInterviewPreludes = (preludes = []) => [...preludes].sort((a, b) => {
  const delta = compareInterviewCreationOrder(a.interviewRequest, b.interviewRequest);
  if (delta !== 0) return delta;
  return Number(a.interviewRequest?.id ?? 0) - Number(b.interviewRequest?.id ?? 0);
});

const enrichPipelineWithPrelude = (pipelineEntry, prelude) => {
  if (!prelude) return pipelineEntry;

  const interviewStatus = prelude.stepStatus;
  const isCancelled = interviewStatus === InterviewScheduleStatus.CANCELLED
    || pipelineEntry.cancelledInterview;

  return {
    ...pipelineEntry,
    actorDetail: pipelineEntry.detail || null,
    interviewRequest: prelude.interviewRequest,
    panel: prelude.panel,
    detail: prelude.detail,
    interviewType: prelude.interviewType,
    interviewScheduleStatus: interviewStatus,
    timestamp: prelude.timestamp || pipelineEntry.timestamp,
    endTimestamp: prelude.endTimestamp || null,
    ...(isCancelled && {
      cancelledInterview: true,
      stepStatus: PipelineStepStatus.FAILED,
      actionLabel: 'Cancelled',
      statusBadgeClass: 'bg-red-50 text-red-700 border-red-200',
    }),
  };
};

const convertPreludeToPipelineEntry = (prelude) => {
  const interviewStatus = prelude.stepStatus;
  const isCancelled = interviewStatus === InterviewScheduleStatus.CANCELLED;
  const pipelineStatus = isCancelled
    ? PipelineStepStatus.FAILED
    : interviewStatus === InterviewScheduleStatus.COMPLETED
      ? PipelineStepStatus.COMPLETED
      : PipelineStepStatus.CURRENT;
  const pipelineMeta = ACTIVITY_STATUS_META[pipelineStatus] || ACTIVITY_STATUS_META[PipelineStepStatus.COMPLETED];
  const interviewMeta = INTERVIEW_STATUS_META[interviewStatus] || INTERVIEW_STATUS_META[InterviewScheduleStatus.SCHEDULED];

  return {
    ...prelude,
    kind: 'PIPELINE',
    id: `pipeline-${prelude.id}`,
    stepStatus: pipelineStatus,
    interviewScheduleStatus: interviewStatus,
    cancelledInterview: isCancelled,
    actionLabel: isCancelled ? 'Cancelled' : interviewMeta.action || pipelineMeta.action,
    statusBadgeClass: isCancelled
      ? 'bg-red-50 text-red-700 border-red-200'
      : interviewMeta.badgeClass || pipelineMeta.badgeClass,
  };
};

const mapPipelineStepToActivityEntry = (step) => {
  const isCancelledInterview = Boolean(step.cancelledInterview);
  const effectiveStatus = isCancelledInterview ? PipelineStepStatus.FAILED : step.stepStatus;
  const meta = ACTIVITY_STATUS_META[effectiveStatus] || ACTIVITY_STATUS_META[PipelineStepStatus.COMPLETED];

  return {
    id: step.id ?? `${step.key}-${step.step}`,
    kind: 'PIPELINE',
    stepLabel: step.label,
    stepKey: step.key,
    stepStatus: effectiveStatus,
    sequenceOrder: step.step,
    timestamp: step.updatedAt || step.createdAt || null,
    bgColor: step.bgColor,
    cancelledInterview: isCancelledInterview,
    actionLabel: isCancelledInterview ? 'Cancelled' : meta.action,
    statusBadgeClass: isCancelledInterview
      ? 'bg-red-50 text-red-700 border-red-200'
      : meta.badgeClass,
  };
};

const buildInterleavedActivityTimeline = (pipelineEntries, interviewEntries) => {
  const sortedPipeline = [...pipelineEntries].sort(
    (a, b) => Number(a.sequenceOrder ?? 0) - Number(b.sequenceOrder ?? 0),
  );

  const preludeQueues = {};
  interviewEntries
    .filter((entry) => entry.kind === 'INTERVIEW_PRELUDE')
    .forEach((entry) => {
      const type = normalizeInterviewType(entry.interviewType);
      if (!preludeQueues[type]) preludeQueues[type] = [];
      preludeQueues[type].push(entry);
    });
  Object.keys(preludeQueues).forEach((type) => {
    preludeQueues[type] = sortInterviewPreludes(preludeQueues[type]);
  });

  const consumedPreludeIds = new Set();
  const timeline = [];

  const takeNextPrelude = (interviewType) => {
    const queue = preludeQueues[interviewType] || [];
    const prelude = queue.find((entry) => !consumedPreludeIds.has(entry.id));
    if (!prelude) return null;
    consumedPreludeIds.add(prelude.id);
    return prelude;
  };

  sortedPipeline.forEach((entry) => {
    const sequenceOrder = Number(entry.sequenceOrder ?? 0);
    let timelineEntry = entry;

    if (ROUND_STAGE_KEYS.has(entry.stepKey)) {
      const interviewType = interviewTypeCodeFromRoundKey(entry.stepKey);
      const prelude = takeNextPrelude(interviewType);
      timelineEntry = enrichPipelineWithPrelude(entry, prelude);
    }

    timeline.push(withSortMeta(
      timelineEntry,
      toPipelineSortKey(sequenceOrder, 0),
      ROUND_STAGE_KEYS.has(entry.stepKey)
        ? INTERVIEW_GROUP_ORDER.ROUND_STAGE
        : INTERVIEW_GROUP_ORDER.DEFAULT,
    ));
  });

  interviewEntries
    .filter((entry) => !consumedPreludeIds.has(entry.id))
    .forEach((entry) => {
      const fallbackSort = getInterviewRequestTimestamp(entry.interviewRequest)
        || getActivityTimestamp(entry)
        || Date.now();
      timeline.push(withSortMeta(
        convertPreludeToPipelineEntry(entry),
        fallbackSort + PIPELINE_SORT_SCALE * 1_000,
        INTERVIEW_GROUP_ORDER.ROUND_STAGE,
      ));
    });

  return timeline.sort(compareActivityEntries);
};

export const buildCandidateActivityHistory = (
  _steps,
  _candidate = null,
  _interviews = [],
  _panels = [],
  statusEvents = [],
  getStepLabel = null,
) => (
  mapPipelineStatusEventsToActivityEntries(statusEvents, getStepLabel).sort(compareActivityEntries)
);
