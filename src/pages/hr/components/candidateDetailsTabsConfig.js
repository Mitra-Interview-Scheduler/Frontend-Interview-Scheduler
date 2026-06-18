import ProfileSummaryTab from './tabs/ProfileSummaryTab';
import InterviewSummaryTab from './tabs/InterviewSummaryTab';
import ScreeningTab from './tabs/ScreeningTab';
import ProfileActivityTab from './tabs/ProfileActivityTab';
import InterviewDetailTab from './tabs/InterviewDetailTab';
import { formatInterviewTypeLabel } from '@/lib/candidateSteps';

const ALL_STATUSES = [
  'NEW', 'SCREENING', 'TECHNICAL_ROUND', 'HR_ROUND', 'DISPOSITION',
  'SELECTED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD', 'INTERVIEW_SCHEDULES', 'OFFERED', 'OFFER_PENDING', 'HIRED',
];

const POST_SCREENING_STATUSES = ALL_STATUSES.filter((status) => status !== 'NEW');
const AFTER_SCREENING_STATUSES = ALL_STATUSES.filter((status) => status !== 'NEW' && status !== 'SCREENING');
const CLOSING_STATUSES = ['SELECTED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'];

export const TABS_CONFIG = [
  {
    value: 'profile',
    label: 'Profile Summary',
    component: ProfileSummaryTab,
    allowedStages: ALL_STATUSES,
    editableStages: [],
  },
  {
    value: 'screening',
    label: 'Screening',
    component: ScreeningTab,
    allowedStages: POST_SCREENING_STATUSES,
    editableStages: ['SCREENING'],
  },
  {
    value: 'interview-summary',
    label: 'Interview Summary',
    component: InterviewSummaryTab,
    allowedStages: CLOSING_STATUSES,
    editableStages: [],
  },
  {
    value: 'activity',
    label: 'Profile Activity',
    component: ProfileActivityTab,
    allowedStages: ALL_STATUSES,
    editableStages: [],
  },
];

const buildInterviewOrderMap = (interviewRequests = []) => {
  const countsByType = {};
  const orderMap = new Map();

  interviewRequests.forEach((interview) => {
    const type = interview?.interviewType || 'INTERVIEW';
    countsByType[type] = (countsByType[type] || 0) + 1;
    const key = interview?.interviewScheduleId ?? interview?.id;
    if (key != null) {
      orderMap.set(key, countsByType[type]);
    }
  });

  return orderMap;
};

const getInterviewTabLabel = (interview, orderNumber) => {
  const type = formatInterviewTypeLabel(interview?.interviewType);
  const orderLabel = orderNumber != null ? String(orderNumber) : '1';
  const status = interview?.interviewStatus || (interview?.status === 'CANCELLED' ? 'CANCELLED' : null);
  const cancelledSuffix = status === 'CANCELLED' ? ' · Cancelled' : '';
  return `${type} - ${orderLabel}${cancelledSuffix}`;
};

/** Profile + screening, then interview tabs, interview summary, profile activity last. */
export const getCandidateDetailTabs = (candidateStatus, interviewRequests = []) => {
  if (!candidateStatus) return [];

  const staticTabs = TABS_CONFIG.filter((tab) => tab.allowedStages.includes(candidateStatus));
  const activityTab = staticTabs.find((tab) => tab.value === 'activity');
  const interviewSummaryTab = staticTabs.find((tab) => tab.value === 'interview-summary');
  const leadingTabs = staticTabs.filter(
    (tab) => tab.value !== 'activity' && tab.value !== 'interview-summary',
  );

  const showInterviews = interviewRequests.length > 0
    && AFTER_SCREENING_STATUSES.includes(candidateStatus);

  const interviewOrderMap = buildInterviewOrderMap(interviewRequests);

  const interviewTabs = showInterviews
    ? interviewRequests.map((interview) => {
        const interviewKey = interview.interviewScheduleId ?? interview.id;
        return {
          value: `interview-${interview.interviewScheduleId}`,
          label: getInterviewTabLabel(interview, interviewOrderMap.get(interviewKey)),
          component: InterviewDetailTab,
          editableStages: [],
          interview,
        };
      })
    : [];

  return [
    ...leadingTabs,
    ...interviewTabs,
    ...(interviewSummaryTab ? [interviewSummaryTab] : []),
    ...(activityTab ? [activityTab] : []),
  ];
};
