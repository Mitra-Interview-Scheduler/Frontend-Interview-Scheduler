import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Star, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readCommentValue, readResponseValue } from '@/lib/feedbackResponseKeys';

const SUMMARY_QUESTION_LABELS = new Set(['overall rating', 'decision on hire']);

const getOptionLabel = (option) => {
  if (option == null) return '';
  if (typeof option === 'string') return option;
  return option.label ?? String(option.value ?? '');
};

const resolveAnswerLabel = (question, rawValue) => {
  if (rawValue == null || rawValue === '') return '—';
  const value = String(rawValue);
  const options = question?.options || [];
  const match = options.find((opt) => String(opt.value) === value || String(opt.label) === value);
  return match ? getOptionLabel(match) : value;
};

const findQuestionByLabel = (questions, label) => (
  questions.find((question) => question.label?.trim().toLowerCase() === label.toLowerCase())
);

const getRatingStyles = (answerLabel) => {
  const score = parseInt(answerLabel, 10);
  if (Number.isNaN(score)) {
    return 'border-slate-200 bg-slate-50 text-slate-800';
  }
  if (score <= 2) return 'border-red-200 bg-red-50 text-red-800';
  if (score === 3) return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
};

const getHireDecisionStyles = (answerLabel) => {
  const normalized = answerLabel.trim().toLowerCase();
  if (normalized === 'yes') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (normalized === 'no') return 'border-red-200 bg-red-50 text-red-800';
  if (normalized === 'differed' || normalized === 'deferred') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  return 'border-slate-200 bg-slate-50 text-slate-800';
};

const SummaryMetric = ({ icon: Icon, label, value, toneClassName }) => (
  <div className={cn('inline-flex w-fit flex-col rounded-lg border px-2.5 py-1.5', toneClassName)}>
    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
      <Icon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </div>
    <p className="text-sm font-semibold leading-tight">{value}</p>
  </div>
);

const FeedbackSummaryWidget = ({ overallRating, hireDecision }) => {
  if (!overallRating && !hireDecision) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {overallRating && (
        <SummaryMetric
          icon={Star}
          label="Overall Rating"
          value={overallRating}
          toneClassName={getRatingStyles(overallRating)}
        />
      )}
      {hireDecision && (
        <SummaryMetric
          icon={UserCheck}
          label="Decision on Hire"
          value={hireDecision}
          toneClassName={getHireDecisionStyles(hireDecision)}
        />
      )}
    </div>
  );
};

const FeedbackResponseDisplay = ({ form, responses = {}, submittedAt = null }) => {
  if (!form) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
        Feedback form details are not available.
      </div>
    );
  }

  const formQuestions = form.questions || [];
  const obligatoryQuestions = form.obligatoryQuestions || [];
  const lookupQuestions = [...formQuestions, ...obligatoryQuestions];

  const overallRatingQuestion = findQuestionByLabel(lookupQuestions, 'Overall Rating');
  const hireDecisionQuestion = findQuestionByLabel(lookupQuestions, 'Decision on Hire');

  const overallRating = overallRatingQuestion
    ? resolveAnswerLabel(overallRatingQuestion, readResponseValue(responses, overallRatingQuestion))
    : null;
  const hireDecision = hireDecisionQuestion
    ? resolveAnswerLabel(hireDecisionQuestion, readResponseValue(responses, hireDecisionQuestion))
    : null;

  const hasSummary = (overallRating && overallRating !== '—') || (hireDecision && hireDecision !== '—');

  const detailQuestions = [
    ...formQuestions,
    ...obligatoryQuestions.filter(
      (question) => !SUMMARY_QUESTION_LABELS.has(question.label?.trim().toLowerCase()),
    ),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">{form.name}</h3>
        {form.versionNumber && (
          <Badge variant="outline">v{form.versionNumber}</Badge>
        )}
        {submittedAt && (
          <span className="text-xs text-muted-foreground">
            Submitted {new Date(submittedAt).toLocaleString()}
          </span>
        )}
      </div>

      {form.description && (
        <p className="text-sm text-muted-foreground">{form.description}</p>
      )}

      {hasSummary && (
        <FeedbackSummaryWidget
          overallRating={overallRating !== '—' ? overallRating : null}
          hireDecision={hireDecision !== '—' ? hireDecision : null}
        />
      )}

      <div className="space-y-3">
        {detailQuestions.map((question, index) => {
          const answer = readResponseValue(responses, question);
          const comment = readCommentValue(responses, question);

          return (
            <div
              key={question.id || `${question.order}-${index}`}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <Label className="text-sm font-semibold text-gray-900">
                  {index + 1}. {question.label}
                </Label>
                {question.category && (
                  <Badge variant="secondary" className="text-xs">
                    {question.category}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {resolveAnswerLabel(question, answer)}
              </p>
              {question.commentsEnabled && comment && (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Comments</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeedbackResponseDisplay;
