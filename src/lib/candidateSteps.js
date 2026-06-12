export const FALLBACK_CANDIDATE_STEPS = [
  { key: 'NEW', label: 'New', step: 1, displayOrder: 10, bgColor: '#3b82f6', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', lightClass: 'bg-blue-100', isClosingStep: false },
  { key: 'SCREENING', label: 'Screening', step: 2, displayOrder: 20, bgColor: '#eab308', badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', lightClass: 'bg-yellow-100', isClosingStep: false },
  { key: 'INTERVIEWED', label: 'Interviewed', step: 4, displayOrder: 40, bgColor: '#6366f1', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', lightClass: 'bg-indigo-100', isClosingStep: false },
  { key: 'TECHNICAL_ROUND', label: 'Technical', step: 5, displayOrder: 50, bgColor: '#06b6d4', badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', lightClass: 'bg-cyan-100', isClosingStep: false },
  { key: 'HR_ROUND', label: 'HR Round', step: 6, displayOrder: 60, bgColor: '#ec4899', badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', lightClass: 'bg-pink-100', isClosingStep: false },
  { key: 'SELECTED', label: 'Selected', step: 7, displayOrder: 70, bgColor: '#22c55e', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', lightClass: 'bg-green-100', isClosingStep: true },
  { key: 'REJECTED', label: 'Rejected', step: 7, displayOrder: 80, bgColor: '#ef4444', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', lightClass: 'bg-red-100', isClosingStep: true },
  { key: 'ON_HOLD', label: 'On Hold', step: 7, displayOrder: 90, bgColor: '#f97316', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', lightClass: 'bg-orange-100', isClosingStep: true },
  { key: 'WITHDRAWN', label: 'Withdrawn', step: 7, displayOrder: 100, bgColor: '#6b7280', badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', lightClass: 'bg-gray-100', isClosingStep: true },
];

export const normalizeCandidateSteps = (steps) => {
  const source = Array.isArray(steps) && steps.length > 0 ? steps : FALLBACK_CANDIDATE_STEPS;
  return source
    .map((step) => ({
      ...step,
      step: Number(step.step ?? step.stepOrder ?? 0),
      displayOrder: Number(step.displayOrder ?? 0),
      bgColor: step.bgColor || '#6b7280',
      badgeClass: step.badgeClass || 'bg-gray-100 text-gray-800',
      lightClass: step.lightClass || 'bg-gray-100',
      isClosingStep: Boolean(step.isClosingStep),
    }))
    .sort((a, b) => (a.step - b.step) || (a.displayOrder - b.displayOrder));
};

export const getCandidateStep = (steps, status) => normalizeCandidateSteps(steps).find((step) => step.key === status);

export const getCandidateStatusLabel = (steps, status) => {
  const candidateStep = getCandidateStep(steps, status);
  return candidateStep?.label || String(status || '-').replace(/_/g, ' ');
};

export const getCandidateStatusBadgeClass = (steps, status) => {
  const candidateStep = getCandidateStep(steps, status);
  return candidateStep?.badgeClass || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

export const getCandidateNextActions = (steps, currentStatus) => {
  const normalized = normalizeCandidateSteps(steps);
  const current = getCandidateStep(normalized, currentStatus);
  const currentStep = current?.step ?? 0;

  return normalized
    .filter((step) => !step.isClosingStep && step.step > currentStep)
    .slice(0, 3)
    .map((step) => ({ label: step.label, status: step.key }));
};

export const getCandidateClosingSteps = (steps) => normalizeCandidateSteps(steps).filter((step) => step.isClosingStep);
