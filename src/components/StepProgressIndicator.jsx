import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { FALLBACK_CANDIDATE_STEPS, normalizeCandidateSteps } from '@/lib/candidateSteps';

const StepProgressIndicator = ({ currentStatus, steps  }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const statusSteps = normalizeCandidateSteps(steps);
  const currentStatusObj = statusSteps.find((s) => s.key === currentStatus);
  const currentStep = currentStatusObj?.step || 0;

  const uniqueSteps = [...new Set(statusSteps.map((s) => s.step))].sort((a, b) => a - b);
  const totalSteps = uniqueSteps.length || 1;

  const statusesByStep = {};
  statusSteps.forEach((status) => {
    if (!statusesByStep[status.step]) {
      statusesByStep[status.step] = [];
    }
    statusesByStep[status.step].push(status);
  });

  const displaySteps = Object.keys(statusesByStep)
    .sort((a, b) => a - b)
    .map((step) => statusesByStep[step][0]);

  return (
    <div className="w-full space-y-4">
      <div className="relative w-full h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden shadow-sm">
        {currentStep > 0 && (
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        {displaySteps.map((representativeStep) => {
          const stepNumber = representativeStep.step;
          const statusesAtStep = statusesByStep[stepNumber];
          const isCompleted = currentStep >= stepNumber;
          const isCurrent = currentStep === stepNumber;
          const currentStatusAtStep = currentStatusObj?.step === stepNumber ? currentStatusObj : statusesAtStep[0];
          const hasMultiple = statusesAtStep.length > 1;

          return (
            <div key={`step-${stepNumber}`} className="flex flex-col items-center flex-1 relative">
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
                  {isCompleted ? <Check className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border border-dashed border-gray-400" />}
                </div>

                {hasMultiple && showDropdown && isCurrent && (
                  <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-max">
                    {statusesAtStep.map((status) => (
                      <div
                        key={status.key}
                        className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer text-gray-700 whitespace-nowrap border-b last:border-b-0"
                        style={{ borderLeft: `3px solid ${status.bgColor}` }}
                      >
                        {status.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 text-center">
                <p
                  className={`text-xs font-semibold transition-colors duration-300 ${
                    isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}
                  style={{ color: isCompleted ? currentStatusAtStep.bgColor : '#9ca3af' }}
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

export { FALLBACK_CANDIDATE_STEPS as STATUS_STEPS };
export default StepProgressIndicator;
