import {
  MasterStatus,
  PipelineStepStatus,
  isInterviewStageStatusKey,
  isFinalClosingStage,
} from '@/lib/statusConstants';

export { isFinalClosingStage };

const SCHEDULE_INTERVIEW = {
  label: 'Schedule Interview',
  actionType: 'SCHEDULE',
  variant: 'default',
  className: 'w-full',
};

const START_SCREENING = {
  label: 'Start Screening',
  actionType: MasterStatus.SCREENING,
  variant: 'outline',
  className: 'w-full bg-green-50 text-blue-700 hover:bg-blue-100 border-blue-200',
};

const MAKE_OFFER = {
  label: 'Make Offer',
  actionType: MasterStatus.OFFER_PENDING,
  variant: 'outline',
  className: 'w-full bg-violet-50 text-violet-800 hover:bg-violet-100 border-violet-200',
};

/**
 * Edit this object to add or change buttons per candidate status.
 * actionType: 'SCHEDULE' opens the schedule page; anything else updates candidate status.
 */
const NEXT_STEPS_BY_STATUS = {
  [MasterStatus.NEW]: {
    prompt: "Review the applicant's profile and documents. Start the screening process if they meet the minimum requirements.",
    actions: [START_SCREENING],
  },
  [MasterStatus.SCREENING]: {
    prompt: 'Screening is in progress. Schedule a technical interview or move the candidate to the next stage.',
    actions: [SCHEDULE_INTERVIEW],
  },
  [MasterStatus.TECHNICAL_ROUND]: {
    prompt: 'Technical interview in progress. Schedule another technical interview or make an offer.',
    actions: [SCHEDULE_INTERVIEW, MAKE_OFFER],
  },
  [MasterStatus.HR_ROUND]: {
    prompt: 'HR interview in progress. Schedule another HR interview, make an offer, or continue the process.',
    actions: [SCHEDULE_INTERVIEW, MAKE_OFFER],
  },
  [MasterStatus.OFFER_PENDING]: {
    prompt: 'Offer has been extended to the candidate. Awaiting their acceptance or decline. Use Close Application when you have a final decision.',
    actions: [],
  },
  [MasterStatus.SCHEDULED]: {
    prompt: 'An interview is scheduled. Schedule another interview or make an offer.',
    actions: [SCHEDULE_INTERVIEW, MAKE_OFFER],
  },
  [MasterStatus.INTERVIEW_SCHEDULES]: {
    prompt: 'Interview schedules are in progress. Schedule another interview or make an offer.',
    actions: [SCHEDULE_INTERVIEW, MAKE_OFFER],
  },
  DEFAULT: {
    prompt: 'Review the candidate and choose the next stage to move the process forward.',
    actions: [],
  },
};

const INTERVIEW_ROUND_DEFAULT = {
  prompt: 'Interview round in progress. Schedule another interview or make an offer.',
  actions: [SCHEDULE_INTERVIEW, MAKE_OFFER],
};

export const getNextStepsConfig = (status, steps = []) => {
  const normalizedSteps = Array.isArray(steps) ? steps : [];
  const currentPipelineStep = normalizedSteps.find((step) => step.stepStatus === PipelineStepStatus.CURRENT);
  const statusKey = String(currentPipelineStep?.key || status || '').trim().toUpperCase();
  const config = NEXT_STEPS_BY_STATUS[statusKey]
    ?? (isInterviewStageStatusKey(statusKey) ? INTERVIEW_ROUND_DEFAULT : NEXT_STEPS_BY_STATUS.DEFAULT);

  const currentStep = normalizedSteps.find((step) => step.key === statusKey)
    || currentPipelineStep;
  if (currentStep?.isClosingStep) {
    return { prompt: config.prompt, actions: [] };
  }

  if (statusKey === MasterStatus.NEW) {
    const hasScreeningStep = normalizedSteps.some((step) => step.key === MasterStatus.SCREENING);
    return {
      prompt: config.prompt,
      actions: hasScreeningStep ? config.actions : [],
    };
  }

  if (isInterviewStageStatusKey(statusKey)) {
    const actions = config.actions.length > 0
      ? config.actions
      : [SCHEDULE_INTERVIEW, MAKE_OFFER];
    return { prompt: config.prompt, actions };
  }

  return { prompt: config.prompt, actions: config.actions };
};
