const REPEATABLE_ROUND_KEYS = new Set(['TECHNICAL_ROUND', 'HR_ROUND']);

const baseLabelForStatusKey = (statusKey, fallbackLabel) => {
  if (statusKey === 'TECHNICAL_ROUND') return 'Technical';
  if (statusKey === 'HR_ROUND') return 'HR';
  return fallbackLabel;
};

const buildPipelineStepLabel = (key, masterLabel, roundIndex, totalRoundsForKey) => {
  const baseLabel = baseLabelForStatusKey(key, masterLabel);
  if (!REPEATABLE_ROUND_KEYS.has(key) || totalRoundsForKey <= 1 || roundIndex <= 1) {
    return baseLabel;
  }
  return `${baseLabel} ${roundIndex}`;
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
    };
  }).sort((a, b) => (a.step - b.step) || (Number(a.id ?? 0) - Number(b.id ?? 0)));

  const roundCounts = mapped.reduce((counts, step) => {
    if (REPEATABLE_ROUND_KEYS.has(step.key)) {
      counts[step.key] = (counts[step.key] || 0) + 1;
    }
    return counts;
  }, {});

  const roundIndexes = {};

  return mapped.map((step) => {
    if (!REPEATABLE_ROUND_KEYS.has(step.key)) {
      return step;
    }

    roundIndexes[step.key] = (roundIndexes[step.key] || 0) + 1;
    return {
      ...step,
      label: buildPipelineStepLabel(
        step.key,
        step.masterLabel,
        roundIndexes[step.key],
        roundCounts[step.key] || 1,
      ),
    };
  });
};

// --- Downstream Actions (Remain Unchanged & Now Functional) ---

export const getCandidateStep = (steps, status) => {
  const normalized = normalizeCandidateSteps(steps);
  const currentPipelineStep = normalized.find((step) => step.stepStatus === 'CURRENT');
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



export const getCandidateClosingSteps = (steps) => normalizeCandidateSteps(steps).filter((step) => step.isClosingStep);

const ACTIVITY_STATUS_META = {
  COMPLETED: {
    action: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CURRENT: {
    action: 'Current stage',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  FAILED: {
    action: 'Failed',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  SKIPPED: {
    action: 'Skipped',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  CREATED: {
    action: 'Application received',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};

const INTERVIEW_STATUS_META = {
  SCHEDULED: {
    action: 'Scheduled',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  COMPLETED: {
    action: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CANCELLED: {
    action: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const formatInterviewTypeLabel = (interviewType) => {
  if (interviewType === 'HR') return 'HR Interview';
  if (interviewType === 'TECHNICAL') return 'Technical Interview';
  return 'Interview';
};

const ROUND_STAGE_KEYS = new Set(['TECHNICAL_ROUND', 'HR_ROUND']);

const ROUND_STAGE_TO_INTERVIEW_TYPE = {
  TECHNICAL_ROUND: 'TECHNICAL',
  HR_ROUND: 'HR',
};

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

const getInterviewRequestTimestamp = (request) => {
  const raw = request?.scheduledStartDateTime || request?.preferredStartDateTime || request?.createdAt;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
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
  if (statuses.includes('SCHEDULED')) return 'SCHEDULED';
  if (statuses.length > 0 && statuses.every((status) => status === 'CANCELLED')) return 'CANCELLED';
  if (statuses.length > 0 && statuses.every((status) => status === 'COMPLETED')) return 'COMPLETED';
  return statuses[0] || 'SCHEDULED';
};

const isScheduledInterviewRequest = (request) => {
  if (!request || request.panelId) return false;
  if (request.interviewScheduleId || request.interviewStatus || request.scheduledStartDateTime) {
    return true;
  }
  return request.status === 'ACCEPTED' && Boolean(request.preferredStartDateTime);
};

const getInterviewStatus = (request) => request.interviewStatus
  || (request.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED');

const createInterviewPreludeEntry = (request) => {
  const typeLabel = formatInterviewTypeLabel(request.interviewType);
  const interviewStatus = getInterviewStatus(request);
  const meta = INTERVIEW_STATUS_META[interviewStatus] || INTERVIEW_STATUS_META.SCHEDULED;
  const sortTimestamp = getInterviewRequestTimestamp(request);

  return withSortMeta({
    id: `interview-prelude-${request.interviewScheduleId || request.id}`,
    kind: 'INTERVIEW_PRELUDE',
    stepLabel: `${typeLabel} scheduled`,
    stepKey: request.interviewType,
    stepStatus: interviewStatus,
    sequenceOrder: 1000 + Number(request.id ?? 0),
    timestamp: request.scheduledStartDateTime || request.preferredStartDateTime || request.createdAt || null,
    endTimestamp: request.scheduledEndDateTime || request.preferredEndDateTime || null,
    bgColor: request.interviewType === 'HR' ? '#ec4899' : '#3b82f6',
    actionLabel: meta.action,
    statusBadgeClass: meta.badgeClass,
    interviewType: request.interviewType,
    interviewRequest: request,
  }, sortTimestamp, INTERVIEW_GROUP_ORDER.PRELUDE);
};

const createInterviewActivityGroup = (request) => [createInterviewPreludeEntry(request)];

const mapPanelToActivityEntries = (panel) => {
  const panelRequests = panel.panelRequests || [];
  const scheduledRequests = panelRequests.filter(isScheduledInterviewRequest);
  if (scheduledRequests.length === 0) return [];

  const statuses = scheduledRequests.map((request) => request.interviewStatus).filter(Boolean);
  const aggregateStatus = deriveAggregateInterviewStatus(statuses);
  const meta = INTERVIEW_STATUS_META[aggregateStatus] || INTERVIEW_STATUS_META.SCHEDULED;
  const interviewType = scheduledRequests[0]?.interviewType;
  const interviewers = [...new Set(panelRequests.map((request) => request.assignedInterviewerName).filter(Boolean))];
  const sortTimestamp = getInterviewRequestTimestamp(scheduledRequests[0]) || getInterviewRequestTimestamp(panel);
  const typeLabel = formatInterviewTypeLabel(interviewType);
  const timestamp = panel.startDateTime || scheduledRequests[0]?.scheduledStartDateTime || panel.createdAt || null;
  const endTimestamp = panel.endDateTime || scheduledRequests[0]?.scheduledEndDateTime || null;

  const shared = {
    stepKey: interviewType,
    stepStatus: aggregateStatus,
    sequenceOrder: 2000 + Number(panel.id ?? 0),
    timestamp,
    endTimestamp,
    bgColor: interviewType === 'HR' ? '#ec4899' : '#0ea5e9',
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
      stepLabel: `${typeLabel} scheduled`,
      detail: interviewers.join(', '),
    }, sortTimestamp, INTERVIEW_GROUP_ORDER.PRELUDE),
  ];
};

const buildInterviewActivityEntries = (interviews = [], panels = []) => {
  const entries = [];

  (interviews || [])
    .filter(isScheduledInterviewRequest)
    .forEach((request) => {
      entries.push(...createInterviewActivityGroup(request));
    });

  (panels || []).forEach((panel) => {
    entries.push(...mapPanelToActivityEntries(panel));
  });

  return entries;
};

const attachRoundStagesToInterviews = (pipelineEntries, interviewEntries) => {
  const deferredRoundStages = pipelineEntries.filter((entry) => ROUND_STAGE_KEYS.has(entry.stepKey));
  const regularPipelineEntries = pipelineEntries.filter((entry) => !ROUND_STAGE_KEYS.has(entry.stepKey));
  const positionedRoundStages = [];

  deferredRoundStages.forEach((stage) => {
    const interviewType = ROUND_STAGE_TO_INTERVIEW_TYPE[stage.stepKey];
    const firstInterview = interviewEntries.find((entry) => (
      entry.interviewType === interviewType && entry.kind === 'INTERVIEW_PRELUDE'
    ));

    if (!firstInterview) {
      positionedRoundStages.push(withSortMeta(stage, getActivityTimestamp(stage)));
      return;
    }

    positionedRoundStages.push(withSortMeta(
      stage,
      firstInterview.sortTimestamp ?? getActivityTimestamp(firstInterview),
      INTERVIEW_GROUP_ORDER.ROUND_STAGE,
    ));
  });

  return [...regularPipelineEntries, ...positionedRoundStages];
};

export const buildCandidateActivityHistory = (steps, candidate = null, interviews = [], panels = []) => {
  const normalized = normalizeCandidateSteps(steps);
  const entries = normalized
    .filter((step) => step.stepStatus && step.stepStatus !== 'PENDING')
    .map((step) => {
      const meta = ACTIVITY_STATUS_META[step.stepStatus] || ACTIVITY_STATUS_META.COMPLETED;
      return {
        id: step.id ?? `${step.key}-${step.step}`,
        kind: 'PIPELINE',
        stepLabel: step.label,
        stepKey: step.key,
        stepStatus: step.stepStatus,
        sequenceOrder: step.step,
        timestamp: step.updatedAt || step.createdAt || null,
        bgColor: step.bgColor,
        actionLabel: meta.action,
        statusBadgeClass: meta.badgeClass,
      };
    });

  if (candidate?.createdAt) {
    const hasCreatedStep = entries.some((entry) => entry.stepKey === 'NEW');
    if (!hasCreatedStep) {
      entries.unshift({
        id: 'candidate-created',
        kind: 'PIPELINE',
        stepLabel: 'New Application',
        stepKey: 'NEW',
        stepStatus: 'CREATED',
        sequenceOrder: 0,
        timestamp: candidate.createdAt,
        bgColor: '#6366f1',
        actionLabel: ACTIVITY_STATUS_META.CREATED.action,
        statusBadgeClass: ACTIVITY_STATUS_META.CREATED.badgeClass,
      });
    }
  }

  const interviewEntries = buildInterviewActivityEntries(interviews, panels);
  const pipelineWithRoundStages = attachRoundStagesToInterviews(entries, interviewEntries);

  return [...pipelineWithRoundStages, ...interviewEntries].sort(compareActivityEntries);
};
