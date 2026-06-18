const SCHEDULE_INTERVIEW = {
  label: 'Schedule Interview',
  actionType: 'SCHEDULE',
  variant: 'default',
  className: 'w-full',
};

const START_SCREENING = {
  label: 'Start Screening',
  actionType: 'SCREENING',
  variant: 'outline',
  className: 'w-full bg-green-50 text-blue-700 hover:bg-blue-100 border-blue-200',
};

/**
 * Edit this object to add or change buttons per candidate status.
 * actionType: 'SCHEDULE' opens the schedule page; anything else updates candidate status.
 */
const NEXT_STEPS_BY_STATUS = {
  NEW: {
    prompt: "Review the applicant's profile and documents. Start the screening process if they meet the minimum requirements.",
    actions: [START_SCREENING],
  },
  SCREENING: {
    prompt: 'Screening is in progress. Schedule a technical interview or move the candidate to the next stage.',
    actions: [SCHEDULE_INTERVIEW],
  },
  TECHNICAL_ROUND: {
    prompt: 'Technical interview in progress. Schedule another technical interview or continue the process.',
    actions: [SCHEDULE_INTERVIEW],
  },
  HR_ROUND: {
    prompt: 'HR interview in progress. Schedule another HR interview or continue the process.',
    actions: [SCHEDULE_INTERVIEW],
  },
  SCHEDULED: {
    prompt: 'An interview is scheduled. Schedule another interview or continue the process.',
    actions: [SCHEDULE_INTERVIEW],
  },
  INTERVIEW_SCHEDULES: {
    prompt: 'Interview schedules are in progress. Schedule another interview or continue the process.',
    actions: [SCHEDULE_INTERVIEW],
  },
  DEFAULT: {
    prompt: 'Review the candidate and choose the next stage to move the process forward.',
    actions: [],
  },
};

export const getNextStepsConfig = (status, steps = []) => {
  const statusKey = String(status || '').trim().toUpperCase();
  const config = NEXT_STEPS_BY_STATUS[statusKey] ?? NEXT_STEPS_BY_STATUS.DEFAULT;

  const currentStep = steps.find((step) => step.key === statusKey);
  if (currentStep?.isClosingStep) {
    return { prompt: config.prompt, actions: [] };
  }

  if (statusKey === 'NEW') {
    const hasScreeningStep = steps.some((step) => step.key === 'SCREENING');
    return {
      prompt: config.prompt,
      actions: hasScreeningStep ? config.actions : [],
    };
  }

  return { prompt: config.prompt, actions: config.actions };
};

export const isFinalClosingStage = (status) => {
  const statusKey = String(status || '').trim().toUpperCase();
  return statusKey === 'SELECTED' || statusKey === 'REJECTED';
};
