export const getQuestionResponseKey = (question) => String(question.id);

export const getQuestionCommentKey = (question) => `${question.id}_comment`;

export const readResponseValue = (responses, question) => {
  if (!responses || question?.id == null) return '';
  const idKey = getQuestionResponseKey(question);
  if (responses[idKey] != null) return String(responses[idKey]);
  if (responses[question.order] != null) return String(responses[question.order]);
  return '';
};

export const readCommentValue = (responses, question) => {
  if (!responses || question?.id == null) return '';
  const idKey = getQuestionCommentKey(question);
  if (responses[idKey] != null) return String(responses[idKey]);
  if (responses[`${question.order}_comment`] != null) {
    return String(responses[`${question.order}_comment`]);
  }
  return '';
};

export const isObligatoryFormQuestion = (question) => (
  question?.categoryCode === 'OBLIGATORY'
  || String(question?.category || '').trim().toLowerCase() === 'obligatory'
);
