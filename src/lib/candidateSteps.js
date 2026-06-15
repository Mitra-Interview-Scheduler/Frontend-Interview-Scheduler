export const normalizeCandidateSteps = (steps) => {
  const source = Array.isArray(steps) ? steps : [];
  if (source.length === 0) return [];
  
  return source
    .map((item) => {
      // 1. Detect if this is the new backend structure with a nested step object
      const hasNestedStep = item.step && typeof item.step === 'object';

      // 2. Map fields dynamically based on the payload structure
      const key = hasNestedStep ? item.step.statusKey : item.key;
      
      // Smart label: Use custom label if it's uniquely modified, otherwise fall back to master name
      const label = hasNestedStep 
        ? (item.customLabel && item.customLabel !== 'defaultLabels' ? item.customLabel : item.step.label) 
        : item.label;

      const stepNumber = Number(item.sequenceOrder ?? (hasNestedStep ? item.step.stepOrder : item.step) ?? 0);
      const displayOrder = Number((hasNestedStep ? item.step.displayOrder : item.displayOrder) ?? 0);
      const isClosingStep = hasNestedStep
        ? Boolean(item.step.isClosingStep ?? item.step.closingStep)
        : Boolean(item.isClosingStep ?? item.closingStep);
      
      const bgColor = (hasNestedStep ? item.step.bgColor : item.bgColor) || '#6b7280';
      const badgeClass = (hasNestedStep ? item.step.badgeClass : item.badgeClass) || 'bg-gray-100 text-gray-800';
      const lightClass = (hasNestedStep ? item.step.lightClass : item.lightClass) || 'bg-gray-100';

      return {
        ...item, // Retains original root variables (createdAt, stepStatus, etc.)
        key,
        label,
        step: stepNumber, 
        displayOrder,
        bgColor,
        badgeClass,
        lightClass,
        isClosingStep,
      };
    })
    .sort((a, b) => (a.step - b.step) || (a.displayOrder - b.displayOrder));
};

// --- Downstream Actions (Remain Unchanged & Now Functional) ---

export const getCandidateStep = (steps, status) => normalizeCandidateSteps(steps).find((step) => step.key === status);

export const getCandidateStatusLabel = (steps, status) => {
  const candidateStep = getCandidateStep(steps, status);
  return candidateStep?.label || String(status || '-').replace(/_/g, ' ');
};

export const getCandidateStatusBadgeClass = (steps, status) => {
  const candidateStep = getCandidateStep(steps, status);
  return candidateStep?.badgeClass || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};



export const getCandidateClosingSteps = (steps) => normalizeCandidateSteps(steps).filter((step) => step.isClosingStep);