import React from 'react';
import ProfileSummaryTab from './tabs/ProfileSummaryTab';
import ScreeningTab from './tabs/ScreeningTab';
import InterviewSummaryTab from './tabs/InterviewSummaryTab';

/**
 * Configuration for the tabs shown on the Candidate Details page.
 *
 * Each object in the array represents a tab and has the following properties:
 * - value: A unique identifier for the tab.
 * - label: The text displayed on the tab trigger.
 * - component: The React component to render for the tab's content.
 * - allowedStages: An array of candidate status keys. The tab will only be visible if the candidate's status is one of these.
 * - editableStages: An array of candidate status keys. The tab content will be editable if the candidate's status is one of these.
 */
export const TABS_CONFIG = [
  {
    value: 'profile',
    label: 'Profile Summary',
    component: ProfileSummaryTab,
    allowedStages: ['NEW', 'SCREENING', 'SCHEDULED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED', 'ON_HOLD'],
    editableStages: [], // Profile is edited via the main dialog, so this is read-only here.
  },
  {
    value: 'screening',
    label: 'Screening',
    component: ScreeningTab,
    allowedStages: ['SCREENING', 'SCHEDULED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED', 'ON_HOLD'],
    editableStages: ['SCREENING'],
  },
  {
    value: 'summary',
    label: 'Interview Summary',
    component: InterviewSummaryTab,
    allowedStages: ['INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED', 'ON_HOLD'],
    editableStages: [], // Summary is read-only for now.
  },
];

/**
 * Gets the visible tabs for a given candidate status.
 * @param {string} candidateStatus - The current status of the candidate.
 * @returns {Array} An array of tab configuration objects.
 */
export const getVisibleTabs = (candidateStatus) => {
  if (!candidateStatus) return [];
  return TABS_CONFIG.filter(tab => tab.allowedStages.includes(candidateStatus));
};