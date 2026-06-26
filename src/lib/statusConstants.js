/**
 * Frontend status constants aligned with backend enums in com.nemal.enums.*
 * Use these instead of hardcoded string literals for domain statuses.
 */

/** @enum {string} Mirrors RequestStatus */
export const InterviewRequestStatus = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

/** @enum {string} Mirrors InterviewStatus */
export const InterviewScheduleStatus = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/** @enum {string} Mirrors InterviewType */
export const InterviewType = Object.freeze({
  TECHNICAL: 'TECHNICAL',
  HR: 'HR',
});

/** @enum {string} Mirrors PipelineStepStatus */
export const PipelineStepStatus = Object.freeze({
  PENDING: 'PENDING',
  CURRENT: 'CURRENT',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
});

/** Synthetic frontend-only activity status (not a backend enum). */
export const ActivityStepStatus = Object.freeze({
  CREATED: 'CREATED',
});

/** @enum {string} Mirrors MasterStatus (+ legacy keys still seen in API/UI). */
export const MasterStatus = Object.freeze({
  NEW: 'NEW',
  SCREENING: 'SCREENING',
  INTERVIEW_SCHEDULES: 'INTERVIEW_SCHEDULES',
  TECHNICAL_ROUND: 'TECHNICAL_ROUND',
  DISPOSITION: 'DISPOSITION',
  HR_ROUND: 'HR_ROUND',
  OFFER_PENDING: 'OFFER_PENDING',
  SELECTED: 'SELECTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  ON_HOLD: 'ON_HOLD',
  /** Legacy alias kept for older records / UI config. */
  SCHEDULED: 'SCHEDULED',
  OFFERED: 'OFFERED',
  HIRED: 'HIRED',
});

/** Closing stages — subset of MasterStatus used by candidate closure. */
export const ClosingStatus = Object.freeze({
  SELECTED: MasterStatus.SELECTED,
  REJECTED: MasterStatus.REJECTED,
  WITHDRAWN: MasterStatus.WITHDRAWN,
  ON_HOLD: MasterStatus.ON_HOLD,
});

export const CLOSING_STATUS_LIST = Object.freeze([
  ClosingStatus.SELECTED,
  ClosingStatus.REJECTED,
  ClosingStatus.WITHDRAWN,
  ClosingStatus.ON_HOLD,
]);

/** @enum {string} Availability slot status (SlotStatus on backend). */
export const SlotStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
});

export const REPEATABLE_ROUND_KEYS = new Set([
  MasterStatus.TECHNICAL_ROUND,
  MasterStatus.HR_ROUND,
]);

/** Pipeline steps that can occur multiple times and receive numbered labels (Technical 2, On Hold 2, …). */
export const APPENDABLE_PIPELINE_STEP_KEYS = new Set([
  MasterStatus.TECHNICAL_ROUND,
  MasterStatus.HR_ROUND,
  MasterStatus.ON_HOLD,
  MasterStatus.OFFER_PENDING,
]);

export const INTERVIEW_STAGE_KEYS = new Set([
  MasterStatus.TECHNICAL_ROUND,
  MasterStatus.HR_ROUND,
  MasterStatus.INTERVIEW_SCHEDULES,
  MasterStatus.SCHEDULED,
]);

export const ROUND_KEY_BY_INTERVIEW_TYPE = Object.freeze({
  [InterviewType.TECHNICAL]: MasterStatus.TECHNICAL_ROUND,
  [InterviewType.HR]: MasterStatus.HR_ROUND,
});

export const INTERVIEW_TYPE_BY_ROUND_KEY = Object.freeze({
  [MasterStatus.TECHNICAL_ROUND]: InterviewType.TECHNICAL,
  [MasterStatus.HR_ROUND]: InterviewType.HR,
});

export const ACTIVE_PANEL_REQUEST_STATUSES = new Set([
  InterviewScheduleStatus.SCHEDULED,
  InterviewRequestStatus.ACCEPTED,
  'CONFIRMED',
  undefined,
  null,
]);

export const TERMINAL_REQUEST_STATUSES = new Set([
  InterviewRequestStatus.CANCELLED,
  InterviewScheduleStatus.COMPLETED,
  InterviewRequestStatus.REJECTED,
]);

export const ALL_MASTER_STATUS_KEYS = Object.freeze([
  MasterStatus.NEW,
  MasterStatus.SCREENING,
  MasterStatus.TECHNICAL_ROUND,
  MasterStatus.HR_ROUND,
  MasterStatus.DISPOSITION,
  MasterStatus.SELECTED,
  MasterStatus.REJECTED,
  MasterStatus.WITHDRAWN,
  MasterStatus.ON_HOLD,
  MasterStatus.INTERVIEW_SCHEDULES,
  MasterStatus.OFFERED,
  MasterStatus.OFFER_PENDING,
  MasterStatus.HIRED,
]);

export const INTERVIEW_STATUS_META = Object.freeze({
  [InterviewScheduleStatus.SCHEDULED]: {
    label: 'Scheduled',
    action: 'Scheduled',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  [InterviewScheduleStatus.COMPLETED]: {
    label: 'Completed',
    action: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [InterviewScheduleStatus.CANCELLED]: {
    label: 'Cancelled',
    action: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
});

export const ACTIVITY_STATUS_META = Object.freeze({
  [PipelineStepStatus.COMPLETED]: {
    action: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [PipelineStepStatus.CURRENT]: {
    action: 'Current stage',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [PipelineStepStatus.FAILED]: {
    action: 'Failed',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  [PipelineStepStatus.SKIPPED]: {
    action: 'Skipped',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  [ActivityStepStatus.CREATED]: {
    action: 'Application received',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
});

export const getInterviewStatusMeta = (status) => (
  INTERVIEW_STATUS_META[status] || INTERVIEW_STATUS_META[InterviewScheduleStatus.SCHEDULED]
);

export const normalizeInterviewType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === InterviewType.HR ? InterviewType.HR : InterviewType.TECHNICAL;
};

export const resolveRoundKeyForInterview = (request) => (
  ROUND_KEY_BY_INTERVIEW_TYPE[normalizeInterviewType(request?.interviewType)]
);

export const formatInterviewTypeLabel = (interviewType) => {
  if (normalizeInterviewType(interviewType) === InterviewType.HR) return 'HR Interview';
  if (normalizeInterviewType(interviewType) === InterviewType.TECHNICAL) return 'Technical Interview';
  return 'Interview';
};

export const FEEDBACK_INTERVIEW_TYPE_OPTIONS = [
  { value: InterviewType.TECHNICAL, label: formatInterviewTypeLabel(InterviewType.TECHNICAL) },
  { value: InterviewType.HR, label: formatInterviewTypeLabel(InterviewType.HR) },
];

export const isClosingStatus = (status) => (
  CLOSING_STATUS_LIST.includes(String(status || '').trim().toUpperCase())
);

export const isFinalClosingStage = (status) => {
  const statusKey = String(status || '').trim().toUpperCase();
  return statusKey === ClosingStatus.SELECTED || statusKey === ClosingStatus.REJECTED;
};

/** Candidates closed as Selected/Rejected must not appear in schedule interview pickers. */
export const isSchedulableCandidate = (status) => !isFinalClosingStage(status);

export const normalizeSlotStatusKey = (status) => String(status || '').trim().toUpperCase();
