import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { InterviewScheduleStatus, InterviewType, SlotStatus } from '@/lib/statusConstants';

export const INTERVIEWER_PALETTES = [
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

export const PANEL_PALETTE = {
  bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
  solid: '#0ea5e9',
  border: '#0c4a6e',
  text: '#fff',
};

export const BOOKED_TYPE_PALETTES = {
  [InterviewType.TECHNICAL]: {
    bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    solid: '#3b82f6',
    border: '#1e40af',
    text: '#fff',
  },
  [InterviewType.HR]: {
    bg: 'linear-gradient(135deg, #ec4899, #db2777)',
    solid: '#ec4899',
    border: '#9d174d',
    text: '#fff',
  },
  DEFAULT: {
    bg: 'linear-gradient(135deg, #64748b, #475569)',
    solid: '#64748b',
    border: '#334155',
    text: '#fff',
  },
};

export const COMPLETED_EVENT_PALETTE = {
  bg: 'linear-gradient(135deg, #059669, #047857)',
  solid: '#059669',
  border: '#064e3b',
  text: '#fff',
};

export const getBookedTypePalette = (interviewType) =>
  BOOKED_TYPE_PALETTES[interviewType] || BOOKED_TYPE_PALETTES.DEFAULT;

// Explicit, stable mapping of departments to palettes
export const DEPARTMENT_PALETTES = {
  Engineering: INTERVIEWER_PALETTES[0],
  HR: INTERVIEWER_PALETTES[2],
  Design: INTERVIEWER_PALETTES[3],
  Product: INTERVIEWER_PALETTES[4],
  QA: INTERVIEWER_PALETTES[5],
  DevOps: INTERVIEWER_PALETTES[6],
  Marketing: INTERVIEWER_PALETTES[7],
  Sales: INTERVIEWER_PALETTES[8],
  Finance: INTERVIEWER_PALETTES[9],
  Legal: INTERVIEWER_PALETTES[14],
};

export const getDepartmentPalette = (department) => {
  if (!department) return null;
  const key = String(department).trim();
  if (DEPARTMENT_PALETTES[key]) return DEPARTMENT_PALETTES[key];
  // fallback: hash into available palettes
  const sum = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return INTERVIEWER_PALETTES[sum % INTERVIEWER_PALETTES.length];
};

export const CalendarEventComponent = ({ event, panelSlots, formatTimeRange }) => {
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const isBooked = event.resource?.status === SlotStatus.BOOKED;
  const isCompleted = event.resource?.interviewStatus === InterviewScheduleStatus.COMPLETED;
  const resource = event.resource || {};
  const candidateName = resource.candidateName?.trim();
  const interviewerName = resource.interviewer?.trim();
  const showInterviewer = interviewerName
    && candidateName
    && interviewerName.toLowerCase() !== candidateName.toLowerCase();
  const timeLabel = formatTimeRange
    ? formatTimeRange(event.start, event.end)
    : null;

  if (isBooked && !isInPanel) {
    return (
      <div className="booked-event-content">
        <div className="booked-event-header">
          {isCompleted ? (
            <CheckCircle2 className="booked-event-lock completed-event-icon" aria-hidden="true" />
          ) : (
            <Lock className="booked-event-lock" aria-hidden="true" />
          )}
          <span className="booked-event-candidate">
            {candidateName || interviewerName || (isCompleted ? 'Completed' : 'Booked')}
          </span>
        </div>
        {isCompleted && (
          <span className="booked-event-completed-badge">Completed</span>
        )}
        {showInterviewer && (
          <span className="booked-event-interviewer">{interviewerName}</span>
        )}
        {timeLabel && (
          <span className="booked-event-time">{timeLabel}</span>
        )}
        {resource.meetingLink && (
          <a
            href={resource.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="booked-event-meet-link"
            onClick={(e) => e.stopPropagation()}
          >
            Join Meet
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="calendar-event-inner">
      {isInPanel && (
        <span className="calendar-event-panel-badge">
          <CheckCircle2 style={{ width: 9, height: 9 }} />
          Panel
        </span>
      )}
      <span className="calendar-event-title">
        {resource.interviewer || event.title}
      </span>
    </div>
  );
};

export const getEventStyle = (event, panelSlots) => {
  const isBooked = event.resource?.status === SlotStatus.BOOKED;
  const isCompleted = event.resource?.interviewStatus === InterviewScheduleStatus.COMPLETED;
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const deptPalette = getDepartmentPalette(event.resource?.department);
  const basePalette = deptPalette || event.resource?.palette || INTERVIEWER_PALETTES[0];
  const typePalette = isBooked && !isCompleted ? getBookedTypePalette(event.resource?.interviewType) : null;
  const completedPalette = isCompleted ? COMPLETED_EVENT_PALETTE : null;
  const leftBorderColor = isCompleted
    ? completedPalette.border
    : (isBooked && typePalette ? typePalette.border || typePalette.solid : basePalette.border || basePalette.solid);

  return {
    className: isCompleted ? 'booked-event completed-event' : (isBooked ? 'booked-event' : 'available-event'),
    style: {
      background: isCompleted ? completedPalette.bg : basePalette.bg,
      borderRadius: '5px',
      opacity: isCompleted ? 0.92 : (isBooked ? 0.97 : 0.94),
      color: isCompleted ? completedPalette.text : (basePalette.text || 'white'),
      borderLeft: `${isBooked || isCompleted ? 4 : 3}px solid ${leftBorderColor}`,
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      padding: isBooked ? '4px 6px' : '3px 6px',
      fontSize: '11px',
      fontWeight: isBooked ? '600' : '500',
      boxShadow: isInPanel
        ? `0 2px 10px ${PANEL_PALETTE.solid}50, 0 0 0 2px #7dd3fc`
        : `0 1px 4px ${basePalette.solid}40`,
      cursor: 'pointer',
      overflow: 'hidden',
      maxWidth: '100%',
      outline: 'none',
    },
  };
};

export const getTooltipText = (event, panelSlots, formatTimeRange = (start, end) => `${start} - ${end}`) => {
  const r = event.resource;
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const timeRange = formatTimeRange(event.start, event.end);

  if (r?.status === SlotStatus.BOOKED) {
    const meetLine = r.meetingLink ? `\nGoogle Meet: ${r.meetingLink}` : '';
    if (r.interviewStatus === InterviewScheduleStatus.COMPLETED) {
      return `COMPLETED - ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${timeRange}${meetLine}\n\nInterview finished — feedback locked`;
    }
    return `BOOKED - ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${timeRange}${meetLine}\n\nClick to cancel & restore slot`;
  }

  if (isInPanel) {
    return `PANEL SELECTED - ${r.interviewer}\n${timeRange}\n\nClick again to remove from panel`;
  }

  return [
    `Interviewer: ${r.interviewer}`,
    r.designation ? `Designation: ${r.designation}` : null,
    r.department ? `Department: ${r.department}` : null,
    r.yearsOfExperience ? `Experience: ${r.yearsOfExperience} yrs` : null,
    r.skills?.length ? `Skills: ${r.skills.join(', ')}` : null,
    `Time: ${timeRange}`,
  ].filter(Boolean).join('\n');
};
