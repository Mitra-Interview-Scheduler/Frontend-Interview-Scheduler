const hasCandidateInterviewRecord = (request) => Boolean(request?.interviewScheduleId);

export const resolveInterviewRequestStatus = (request) => {
  if (!request) return 'SCHEDULED';
  if (request.interviewStatus) return request.interviewStatus;
  if (request.status === 'CANCELLED') return 'CANCELLED';
  return 'SCHEDULED';
};

export const collectCandidateInterviewRequests = (interviews = [], panels = []) => {
  const entries = [
    ...(interviews || []).filter(hasCandidateInterviewRecord),
    ...(panels || []).flatMap((panel) => (
      (panel.panelRequests || []).filter(hasCandidateInterviewRecord)
    )),
  ];

  return entries.sort((a, b) => {
    const aTime = new Date(a.scheduledStartDateTime || a.preferredStartDateTime || 0).getTime();
    const bTime = new Date(b.scheduledStartDateTime || b.preferredStartDateTime || 0).getTime();
    return aTime - bTime;
  });
};

export const getInterviewStatusMeta = (status) => {
  const map = {
    SCHEDULED: { label: 'Scheduled', className: 'bg-sky-50 text-sky-700 border-sky-200' },
    COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' },
  };
  return map[status] || map.SCHEDULED;
};
