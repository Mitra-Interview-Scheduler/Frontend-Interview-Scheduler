import React, { useState } from 'react';

const STATUS_STEPS = [
  { key: 'APPLIED', label: 'Applied', step: 1, bgColor: '#3b82f6', bgColorTw: 'bg-blue-500', lightColor: 'bg-blue-100' },
  { key: 'SCREENING', label: 'Screening', step: 2, bgColor: '#eab308', bgColorTw: 'bg-yellow-500', lightColor: 'bg-yellow-100' },
  { key: 'SCHEDULED', label: 'Scheduled', step: 3, bgColor: '#a855f7', bgColorTw: 'bg-purple-500', lightColor: 'bg-purple-100' },
  { key: 'INTERVIEWED', label: 'Interviewed', step: 4, bgColor: '#6366f1', bgColorTw: 'bg-indigo-500', lightColor: 'bg-indigo-100' },
  { key: 'TECHNICAL_ROUND', label: 'Technical', step: 5, bgColor: '#06b6d4', bgColorTw: 'bg-cyan-500', lightColor: 'bg-cyan-100' },
  { key: 'HR_ROUND', label: 'HR Round', step: 6, bgColor: '#ec4899', bgColorTw: 'bg-pink-500', lightColor: 'bg-pink-100' },
  { key: 'SELECTED', label: 'Selected', step: 7, bgColor: '#22c55e', bgColorTw: 'bg-green-500', lightColor: 'bg-green-100' },
  { key: 'REJECTED', label: 'Rejected', step: 7, bgColor: '#ef4444', bgColorTw: 'bg-red-500', lightColor: 'bg-red-100' },
  { key: 'ON_HOLD', label: 'On Hold', step: 7, bgColor: '#f97316', bgColorTw: 'bg-orange-500', lightColor: 'bg-orange-100' },
  { key: 'WITHDRAWN', label: 'Withdrawn', step: 7, bgColor: '#6b7280', bgColorTw: 'bg-gray-500', lightColor: 'bg-gray-100' },
];

const StepProgressIndicator = ({ currentStatus, maxSteps }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const currentStatusObj = STATUS_STEPS.find(s => s.key === currentStatus);
  const currentStep = currentStatusObj?.step || 0;
  
  // Get unique steps for progress calculation (1-7 now)
  const uniqueSteps = [...new Set(STATUS_STEPS.map(s => s.step))].sort((a, b) => a - b);
  const totalSteps = uniqueSteps.length;
  
  // Group statuses by step
  const statusesByStep = {};
  STATUS_STEPS.forEach(status => {
    if (!statusesByStep[status.step]) {
      statusesByStep[status.step] = [];
    }
    statusesByStep[status.step].push(status);
  });
  
  // Get unique representative steps for display
  const displaySteps = Object.keys(statusesByStep)
    .sort((a, b) => a - b)
    .map(step => statusesByStep[step][0]); // Show only first status in each group

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar Background */}
      <div className="relative w-full h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden shadow-sm">
        {/* Completed Progress Fill */}
        {currentStep > 0 && (
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${(currentStep / totalSteps) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Steps Container */}
      <div className="flex items-start justify-between gap-2">
        {displaySteps.map((representativeStep) => {
          const stepNumber = representativeStep.step;
          const statusesAtStep = statusesByStep[stepNumber];
          const isCompleted = currentStep >= stepNumber;
          const isCurrent = currentStep === stepNumber;
          const currentStatusAtStep = currentStatusObj?.step === stepNumber ? currentStatusObj : statusesAtStep[0];
          const hasMultiple = statusesAtStep.length > 1;

          return (
            <div
              key={`step-${stepNumber}`}
              className="flex flex-col items-center flex-1 relative"
            >
              {/* Step Circle with Dropdown Trigger */}
              <div
                className="relative w-full flex justify-center"
                onMouseEnter={() => hasMultiple && setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                    transition-all duration-300 transform cursor-pointer relative z-10
                    ${isCurrent ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 shadow-lg' : 'shadow-md'}
                    ${hasMultiple && isCurrent ? 'cursor-pointer hover:scale-125' : ''}
                  `}
                  style={{
                    backgroundColor: isCompleted ? currentStatusAtStep.bgColor : '#e5e7eb',
                    color: isCompleted ? 'white' : '#9ca3af',
                  }}
                  onClick={() => hasMultiple && setShowDropdown(!showDropdown)}
                >
                  {isCompleted ? '✓' :  <div className="h-4 w-4 rounded-full border border-dashed border-gray-400" />} 
                </div>

                {/* Dropdown Menu for Multiple Statuses */}
                {hasMultiple && showDropdown && isCurrent && (
                  <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-max">
                    {statusesAtStep.map((status) => (
                      <div
                        key={status.key}
                        className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer text-gray-700 whitespace-nowrap border-b last:border-b-0"
                        style={{
                          borderLeft: `3px solid ${status.bgColor}`,
                        }}
                      >
                        {status.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={`text-xs font-semibold transition-colors duration-300 ${
                    isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}
                  style={{
                    color: isCompleted ? currentStatusAtStep.bgColor : '#9ca3af',
                  }}
                >
                  {currentStatusAtStep.label}
                </p>
                {hasMultiple && (
                  <p className="text-xs text-gray-400 mt-1">({statusesAtStep.length} options)</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      
    </div>
  );
};

export { STATUS_STEPS };
export default StepProgressIndicator;
