import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

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

const FeedbackResponseDisplay = ({ form, responses = {}, submittedAt = null }) => {
  if (!form) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
        Feedback form details are not available.
      </div>
    );
  }

  const allQuestions = [
    ...(form.questions || []),
    ...(form.obligatoryQuestions || []),
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

      <div className="space-y-3">
        {allQuestions.map((question, index) => {
          const answer = responses[question.order];
          const comment = responses[`${question.order}_comment`];

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
