import ProfileSummaryTab from './tabs/ProfileSummaryTab';
import ScreeningTab from './tabs/ScreeningTab';
import ProfileActivityTab from './tabs/ProfileActivityTab';
import InterviewDetailTab from './tabs/InterviewDetailTab';
import { formatInterviewTypeLabel } from '@/lib/candidateSteps';

const ALL_STATUSES = [
  'NEW', 'SCREENING', 'TECHNICAL_ROUND', 'HR_ROUND', 'DISPOSITION',
  'SELECTED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD', 'SCHEDULED', 'OFFERED', 'HIRED',
];

const POST_SCREENING_STATUSES = ALL_STATUSES.filter((status) => status !== 'NEW');
const INTERVIEW_STAGES = ['TECHNICAL_ROUND', 'HR_ROUND'];

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
    value: 'activity',
    label: 'Profile Activity',
    component: ProfileActivityTab,
    allowedStages: ALL_STATUSES,
    editableStages: [],
  },
];

const getInterviewTabLabel = (interview) => {
  const type = formatInterviewTypeLabel(interview?.interviewType);
  const name = interview?.assignedInterviewerName || 'Interviewer';
  return `${type} - ${name}`;
};

/** Static tabs + interview tabs (middle) + Profile Activity last. */
export const getCandidateDetailTabs = (candidateStatus, interviewRequests = []) => {
  if (!candidateStatus) return [];

  const staticTabs = TABS_CONFIG.filter((tab) => tab.allowedStages.includes(candidateStatus));
  const activityTab = staticTabs.find((tab) => tab.value === 'activity');
  const leadingTabs = staticTabs.filter((tab) => tab.value !== 'activity');

  const showInterviews = interviewRequests.length > 0 && (
    INTERVIEW_STAGES.includes(candidateStatus)
    || interviewRequests.some((request) => request.interviewStatus === 'COMPLETED')
  );

  const interviewTabs = showInterviews
    ? interviewRequests.map((interview) => ({
        value: `interview-${interview.interviewScheduleId}`,
        label: getInterviewTabLabel(interview),
        component: InterviewDetailTab,
        editableStages: [],
        interview,
      }))
    : [];

  return [...leadingTabs, ...interviewTabs, ...(activityTab ? [activityTab] : [])];
};
