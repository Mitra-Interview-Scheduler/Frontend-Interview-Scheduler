import ProfileSummaryTab from './tabs/ProfileSummaryTab';
import InterviewSummaryTab from './tabs/InterviewSummaryTab';
import ScreeningTab from './tabs/ScreeningTab';
import ProfileActivityTab from './tabs/ProfileActivityTab';
import InterviewDetailTab from './tabs/InterviewDetailTab';
import PanelInterviewDetailTab from './tabs/PanelInterviewDetailTab';
import { formatInterviewTypeLabel } from '@/lib/candidateSteps';
import { buildInterviewTabEntries, resolveInterviewRequestStatus } from '@/lib/candidateInterviews';
import {
  ALL_MASTER_STATUS_KEYS,
  CLOSING_STATUS_LIST,
  ClosingStatus,
  InterviewRequestStatus,
  InterviewScheduleStatus,
  MasterStatus,
  normalizeInterviewType,
} from '@/lib/statusConstants';

const ALL_STATUSES = ALL_MASTER_STATUS_KEYS;

const POST_SCREENING_STATUSES = ALL_STATUSES.filter((status) => status !== MasterStatus.NEW);
const CLOSING_STATUSES = CLOSING_STATUS_LIST;

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
    editableStages: [MasterStatus.SCREENING],
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

const buildInterviewOrderMap = (tabEntries = []) => {
  const countsByType = {};
  const orderMap = new Map();

  tabEntries.forEach((entry) => {
    const rawType = entry.kind === 'panel'
      ? entry.panelRequests?.[0]?.interviewType
      : entry.interview?.interviewType;
    const type = `${normalizeInterviewType(rawType)}${entry.kind === 'panel' ? '_PANEL' : ''}`;
    countsByType[type] = (countsByType[type] || 0) + 1;
    const key = entry.kind === 'panel'
      ? `panel-${entry.panel?.id}`
      : (entry.interview?.interviewScheduleId ?? entry.interview?.id);
    if (key != null) {
      orderMap.set(key, countsByType[type]);
    }
  });

  return orderMap;
};

const getInterviewTabLabel = (interview, orderNumber) => {
  const type = formatInterviewTypeLabel(interview?.interviewType);
  const orderLabel = orderNumber != null ? String(orderNumber) : '1';
  const status = interview?.interviewStatus
    || (interview?.status === InterviewRequestStatus.CANCELLED ? InterviewScheduleStatus.CANCELLED : null);
  const cancelledSuffix = status === InterviewScheduleStatus.CANCELLED ? ' · Cancelled' : '';
  return `${type} - ${orderLabel}${cancelledSuffix}`;
};

const getPanelTabLabel = (panelRequests, orderNumber) => {
  const type = formatInterviewTypeLabel(panelRequests?.[0]?.interviewType);
  const orderLabel = orderNumber != null ? String(orderNumber) : '1';
  const allCancelled = panelRequests.every(
    (request) => resolveInterviewRequestStatus(request) === InterviewScheduleStatus.CANCELLED,
  );
  const cancelledSuffix = allCancelled ? ' · Cancelled' : '';
  return `${type} Panel - ${orderLabel}${cancelledSuffix}`;
};

/** Profile + screening, then interview tabs, interview summary, profile activity last. */
export const getCandidateDetailTabs = (candidateStatus, interviews = [], panels = []) => {
  if (!candidateStatus) return [];

  const staticTabs = TABS_CONFIG.filter((tab) => tab.allowedStages.includes(candidateStatus));
  const activityTab = staticTabs.find((tab) => tab.value === 'activity');
  const interviewSummaryTab = staticTabs.find((tab) => tab.value === 'interview-summary');
  const leadingTabs = staticTabs.filter(
    (tab) => tab.value !== 'activity' && tab.value !== 'interview-summary',
  );

  const tabEntries = buildInterviewTabEntries(interviews, panels);
  // Include post-screening stages so cancelled interviews remain visible after cancel resets status.
  const showInterviews = tabEntries.length > 0
    && POST_SCREENING_STATUSES.includes(candidateStatus);

  const interviewOrderMap = buildInterviewOrderMap(tabEntries);

  const interviewTabs = showInterviews
    ? tabEntries.map((entry) => {
        if (entry.kind === 'panel') {
          const panelKey = `panel-${entry.panel?.id}`;
          return {
            value: panelKey,
            label: getPanelTabLabel(entry.panelRequests, interviewOrderMap.get(panelKey)),
            component: PanelInterviewDetailTab,
            editableStages: [],
            panel: entry.panel,
            panelRequests: entry.panelRequests,
            isPanelTab: true,
          };
        }

        const interviewKey = entry.interview.interviewScheduleId ?? entry.interview.id;
        return {
          value: `interview-${entry.interview.interviewScheduleId}`,
          label: getInterviewTabLabel(entry.interview, interviewOrderMap.get(interviewKey)),
          component: InterviewDetailTab,
          editableStages: [],
          interview: entry.interview,
          isPanelTab: false,
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

export { CLOSING_STATUSES, ClosingStatus };
