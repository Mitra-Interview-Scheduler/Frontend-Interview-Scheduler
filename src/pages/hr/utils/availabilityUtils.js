import { format } from 'date-fns';

const CALENDAR_MIN_HOUR = parseInt(import.meta.env.VITE_CALENDAR_MIN_HOUR || '7');
const CALENDAR_MAX_HOUR = parseInt(import.meta.env.VITE_CALENDAR_MAX_HOUR || '19');

const INTERVIEWER_PALETTES = [
  { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', solid: '#6366f1', border: '#312e81', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', solid: '#f59e0b', border: '#78350f', text: '#fff' },
  { bg: 'linear-gradient(135deg,#ec4899,#db2777)', solid: '#ec4899', border: '#831843', text: '#fff' },
  { bg: 'linear-gradient(135deg,#14b8a6,#0d9488)', solid: '#14b8a6', border: '#134e4a', text: '#fff' },
  { bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', solid: '#8b5cf6', border: '#3b0764', text: '#fff' },
  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', solid: '#ef4444', border: '#7f1d1d', text: '#fff' },
  { bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', solid: '#06b6d4', border: '#164e63', text: '#fff' },
  { bg: 'linear-gradient(135deg,#84cc16,#65a30d)', solid: '#84cc16', border: '#365314', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f97316,#ea580c)', solid: '#f97316', border: '#7c2d12', text: '#fff' },
  { bg: 'linear-gradient(135deg,#a855f7,#9333ea)', solid: '#a855f7', border: '#4a044e', text: '#fff' },
  { bg: 'linear-gradient(135deg,#10b981,#059669)', solid: '#10b981', border: '#064e3b', text: '#fff' },
  { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', solid: '#3b82f6', border: '#1e3a8a', text: '#fff' },
  { bg: 'linear-gradient(135deg,#d946ef,#c026d3)', solid: '#d946ef', border: '#581c87', text: '#fff' },
  { bg: 'linear-gradient(135deg,#64748b,#475569)', solid: '#64748b', border: '#1e293b', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f43f5e,#e11d48)', solid: '#f43f5e', border: '#881337', text: '#fff' },
  { bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)', solid: '#0ea5e9', border: '#0c4a6e', text: '#fff' },
];

const PANEL_PALETTE = {
  bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
  solid: '#0ea5e9',
  border: '#0c4a6e',
  text: '#fff',
};

const BOOKED_OVERLAY = {
  bg: 'linear-gradient(135deg,#10b981,#059669)',
  solid: '#10b981',
  border: '#064e3b',
};

const pad = (n) => String(n).padStart(2, '0');

const formatLocalDateTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

const formatInputDateTime = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const generateTimeOptions = (startDate, endDate) => {
  const options = [];
  let cur = new Date(startDate);
  while (cur < endDate) {
    options.push({ label: format(cur, 'h:mm a'), value: format(cur, 'HH:mm'), date: new Date(cur) });
    cur = new Date(cur.getTime() + 60 * 60000);
  }
  return options;
};

const parseTimeOnDate = (timeStr, referenceDate) => {
  const [h, m] = timeStr.split(':').map(Number);
  const r = new Date(referenceDate);
  r.setHours(h, m, 0, 0);
  return r;
};

const checkInterviewerPrivilege = (slotResource, candidate) => {
  if (!slotResource || !candidate) return null;

  const ivTier  = slotResource.interviewerTierOrder;
  const ivLevel = slotResource.interviewerLevelOrder;
  const cTier   = candidate.targetDesignationTierOrder;
  const cLevel  = candidate.targetDesignationLevelOrder;

  if (ivTier == null || cTier == null) return null;

  if (ivTier < cTier) {
    return `The interviewer's tier (Tier ${ivTier}) is below the candidate's required tier (Tier ${cTier}). Please choose a more senior interviewer.`;
  }
  if (ivTier === cTier && ivLevel != null && cLevel != null && ivLevel < cLevel) {
    return `The interviewer is at the same tier but a lower level (Level ${ivLevel}) than the candidate requires (Level ${cLevel}). Please choose a more senior interviewer.`;
  }
  return null;
};

const checkPanelPrivilege = (panelSlots, candidate) => {
  if (!candidate) return [];
  return panelSlots
    .map((ps) => {
      const err = checkInterviewerPrivilege(ps.slot.resource, candidate);
      return err ? { name: ps.slot.resource.interviewer, reason: err } : null;
    })
    .filter(Boolean);
};

export {
  CALENDAR_MIN_HOUR,
  CALENDAR_MAX_HOUR,
  INTERVIEWER_PALETTES,
  PANEL_PALETTE,
  BOOKED_OVERLAY,
  pad,
  formatLocalDateTime,
  formatInputDateTime,
  generateTimeOptions,
  parseTimeOnDate,
  checkInterviewerPrivilege,
  checkPanelPrivilege,
};
