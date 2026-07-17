import React from 'react';
import { Check, X, Minus } from 'lucide-react';
import { normalizeCandidateSteps, applyCancelledInterviewOverrides, sortPipelineStepsByInterviewChronology } from '@/lib/candidateSteps';
import { PipelineStepStatus } from '@/lib/statusConstants';
import '@/styles/StepProgressIndicator.css';

const StepProgressIndicator = ({ currentStatus, steps, interviewRequests = [] }) => {
  const statusSteps = sortPipelineStepsByInterviewChronology(
    applyCancelledInterviewOverrides(
      normalizeCandidateSteps(steps),
      interviewRequests,
      currentStatus,
    ),
    interviewRequests,
  );
  const currentPipelineStep = statusSteps.find(
    (step) => step.stepStatus === PipelineStepStatus.CURRENT && !step.cancelledInterview,
  );
  const currentStatusObj = currentPipelineStep
    || statusSteps.find((s) => s.key === currentStatus);

  const displaySteps = statusSteps;

  const currentIndex = currentPipelineStep
    ? displaySteps.findIndex((s) => s.id === currentPipelineStep.id)
    : displaySteps.findIndex((s) => s.key === currentStatus);

  if (displaySteps.length === 0) {
    return null;
  }

  const getStepColor = (step, { isCurrent, isFailed } = {}) => {
    if (isFailed || step?.cancelledInterview || step?.stepStatus === PipelineStepStatus.FAILED) {
      return '#ef4444';
    }
    return step?.bgColor || '#6366f1';
  };

  const getStepState = (pipelineStep, index) => {
    const isFailed = pipelineStep.stepStatus === PipelineStepStatus.FAILED
      || Boolean(pipelineStep.cancelledInterview);
    const isCurrent = !isFailed && (
      pipelineStep.stepStatus === PipelineStepStatus.CURRENT
      || (!currentPipelineStep && pipelineStep.key === currentStatusObj?.key && index === currentIndex)
    );
    const isSkipped = pipelineStep.stepStatus === PipelineStepStatus.SKIPPED;
    const isCompleted = pipelineStep.stepStatus === PipelineStepStatus.COMPLETED
      || (currentIndex >= 0 && index < currentIndex && !isFailed && !isSkipped);
    const isPending = !isCurrent && !isCompleted && !isFailed && !isSkipped;
    const isActive = isCurrent || isCompleted || isFailed || isSkipped;

    return { isCurrent, isFailed, isSkipped, isCompleted, isPending, isActive };
  };

  const renderStepIcon = (index, { isCurrent, isCompleted, isFailed, isSkipped }) => {
    if (isFailed) return <X className="h-4 w-4" strokeWidth={2.5} />;
    if (isSkipped) return <Minus className="h-4 w-4" strokeWidth={2.5} />;
    if (isCompleted) return <Check className="h-4 w-4" strokeWidth={2.5} />;
    if (isCurrent) return <span className="step-progress-pulse-dot" />;
    return <span className="text-xs font-bold">{index + 1}</span>;
  };

  const renderConnector = (index) => {
    if (index <= 0) return null;

    const connectorFilled = index <= currentIndex;
    const prevState = getStepState(displaySteps[index - 1], index - 1);
    const prevColor = getStepColor(displaySteps[index - 1], prevState);
    const currentState = getStepState(displaySteps[index], index);
    const accentColor = getStepColor(displaySteps[index], currentState);

    return (
      <div
        className={`step-progress-connector ${connectorFilled ? 'is-filled' : ''}`}
        style={connectorFilled
          ? { background: `linear-gradient(90deg, ${prevColor}, ${accentColor})` }
          : undefined}
        aria-hidden="true"
      />
    );
  };

  return (
    <div className="step-progress-root w-full">
      <div className="step-progress-card">
        <div className="step-progress-track horizontal-scroll-friendly">
          {displaySteps.map((pipelineStep, index) => {
            const stepState = getStepState(pipelineStep, index);
            const { isCurrent, isFailed, isSkipped, isCompleted, isPending, isActive } = stepState;
            const accentColor = getStepColor(pipelineStep, stepState);

            return (
              <React.Fragment
                key={`track-${pipelineStep.id ?? `${pipelineStep.key}-${pipelineStep.step}-${index}`}`}
              >
                {renderConnector(index)}
                <div className="step-progress-node-slot">
                  <div
                    className={[
                      'step-progress-node',
                      isCurrent && 'is-current',
                      isCompleted && 'is-completed',
                      isFailed && 'is-failed',
                      isSkipped && 'is-skipped',
                      isPending && 'is-pending',
                    ].filter(Boolean).join(' ')}
                    style={{
                      '--step-color': accentColor,
                      backgroundColor: isActive ? accentColor : undefined,
                    }}
                  >
                    {renderStepIcon(index, { isCurrent, isCompleted, isFailed, isSkipped })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="step-progress-labels horizontal-scroll-friendly">
          {displaySteps.map((pipelineStep, index) => {
            const stepState = getStepState(pipelineStep, index);
            const { isCurrent, isFailed, isActive } = stepState;
            const accentColor = getStepColor(pipelineStep, stepState);

            return (
              <React.Fragment
                key={`label-${pipelineStep.id ?? `${pipelineStep.key}-${pipelineStep.step}-${index}`}`}
              >
                {index > 0 && <div className="step-progress-label-gap" aria-hidden="true" />}
                <div className="step-progress-label-slot">
                  <p
                    className={[
                      'step-progress-label',
                      isActive && 'is-active',
                      isCurrent && 'is-current',
                      isFailed && 'is-failed',
                    ].filter(Boolean).join(' ')}
                    style={{ color: isActive ? accentColor : undefined }}
                    title={pipelineStep.cancelledInterview
                      ? `${pipelineStep.label} · Cancelled`
                      : pipelineStep.label}
                  >
                    {pipelineStep.cancelledInterview
                      ? `${pipelineStep.label} · Cancelled`
                      : pipelineStep.label}
                  </p>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepProgressIndicator;
