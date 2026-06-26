import { resolveInterviewRequestStatus, resolveInterviewRoundStatus, collectInterviewRoundsForPipeline, getInterviewerDesignationLabel, compareInterviewCreationOrder, compareInterviewRoundCreationOrder } from '@/lib/candidateInterviews';
import {
  ActivityStepStatus,
  InterviewRequestStatus,
  InterviewScheduleStatus,
  InterviewType,
  MasterStatus,
  PipelineStepStatus,
  REPEATABLE_ROUND_KEYS,
  INTERVIEW_TYPE_BY_ROUND_KEY,
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
  const currentPipelineStep = normalized.find((step) => step.stepStatus === PipelineStepStatus.CURRENT);
  if (currentPipelineStep) {
    return currentPipelineStep;
  }
  return normalized.find((step) => step.key === status);
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
      if (REPEATABLE_ROUND_KEYS.has(step.key)) {
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

        if (step.stepStatus === PipelineStepStatus.CURRENT) {
          return;
        }

        if (
          linkedStatus === InterviewScheduleStatus.SCHEDULED
          || linkedStatus === InterviewScheduleStatus.COMPLETED
        ) {
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

const ROUND_STAGE_KEYS = REPEATABLE_ROUND_KEYS;

const INTERVIEW_GROUP_ORDER = {
  ROUND_STAGE: 0,
  PRELUDE: 1,
  DEFAULT: 50,
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
    bgColor: interviewType === InterviewType.HR ? '#ec4899' : '#3b82f6',
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
    bgColor: interviewType === InterviewType.HR ? '#ec4899' : '#0ea5e9',
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
    interviewRequest: prelude.interviewRequest,
    panel: prelude.panel,
    detail: prelude.detail,
    interviewType: prelude.interviewType,
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

  const preludeQueues = {
    [InterviewType.TECHNICAL]: sortInterviewPreludes(
      interviewEntries.filter(
        (entry) => entry.kind === 'INTERVIEW_PRELUDE'
          && normalizeInterviewType(entry.interviewType) === InterviewType.TECHNICAL,
      ),
    ),
    [InterviewType.HR]: sortInterviewPreludes(
      interviewEntries.filter(
        (entry) => entry.kind === 'INTERVIEW_PRELUDE'
          && normalizeInterviewType(entry.interviewType) === InterviewType.HR,
      ),
    ),
  };

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
      const interviewType = INTERVIEW_TYPE_BY_ROUND_KEY[entry.stepKey];
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
        entry,
        fallbackSort + PIPELINE_SORT_SCALE * 1_000,
        INTERVIEW_GROUP_ORDER.PRELUDE,
      ));
    });

  return timeline.sort(compareActivityEntries);
};

export const buildCandidateActivityHistory = (steps, candidate = null, interviews = [], panels = []) => {
  const interviewRequests = collectInterviewRoundsForPipeline(interviews, panels);
  const normalized = applyCancelledInterviewOverrides(
    normalizeCandidateSteps(steps),
    interviewRequests,
    candidate?.status ?? null,
  );
  const entries = normalized
    .filter((step) => step.stepStatus && step.stepStatus !== PipelineStepStatus.PENDING)
    .map(mapPipelineStepToActivityEntry);

  if (candidate?.createdAt) {
    const hasCreatedStep = entries.some((entry) => entry.stepKey === MasterStatus.NEW);
    if (!hasCreatedStep) {
      entries.unshift({
        id: 'candidate-created',
        kind: 'PIPELINE',
        stepLabel: 'New Application',
        stepKey: MasterStatus.NEW,
        stepStatus: ActivityStepStatus.CREATED,
        sequenceOrder: 0,
        timestamp: candidate.createdAt,
        bgColor: '#6366f1',
        actionLabel: ACTIVITY_STATUS_META[ActivityStepStatus.CREATED].action,
        statusBadgeClass: ACTIVITY_STATUS_META[ActivityStepStatus.CREATED].badgeClass,
      });
    }
  }

  const interviewEntries = buildInterviewActivityEntries(interviews, panels);
  return buildInterleavedActivityTimeline(entries, interviewEntries);
};
