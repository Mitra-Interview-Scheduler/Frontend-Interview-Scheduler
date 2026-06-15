const isActiveInterviewRequest = (request) => {
  if (!request?.interviewScheduleId) return false;
  if (request.interviewStatus === 'CANCELLED' || request.status === 'CANCELLED') return false;
  return true;
};

export const collectCandidateInterviewRequests = (interviews = [], panels = []) => {
  const entries = [
    ...(interviews || []).filter(isActiveInterviewRequest),
    ...(panels || []).flatMap((panel) => (panel.panelRequests || []).filter(isActiveInterviewRequest)),
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
    CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  return map[status] || map.SCHEDULED;
};
