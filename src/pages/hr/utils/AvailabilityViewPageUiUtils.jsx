import React from 'react';
import { CalendarClock, CheckCircle2, Lock } from 'lucide-react';
import { InterviewScheduleStatus, SlotStatus } from '@/lib/statusConstants';

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

export const CALENDAR_STATUS_PALETTES = {
  available: {
    bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    solid: '#2563EB',
    border: '#1E40AF',
    text: '#fff',
    label: 'Available',
  },
  booked: {
    bg: 'linear-gradient(135deg, #10b981, #059669)',
    solid: '#059669',
    border: '#065F46',
    text: '#fff',
    label: 'Booked',
  },
  panel_booked: {
    bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    solid: '#7C3AED',
    border: '#5B21B6',
    text: '#fff',
    label: 'Panel',
  },
  postpone_request: {
    bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    solid: '#D97706',
    border: '#92400E',
    text: '#fff',
    label: 'Postpone proposal',
  },
  completed: {
    bg: 'linear-gradient(135deg, #14b8a6, #0f766e)',
    solid: '#0F766E',
    border: '#115E59',
    text: '#fff',
    label: 'Completed',
  },
  overdue: {
    bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
    solid: '#DC2626',
    border: '#991B1B',
    text: '#fff',
    label: 'Overdue',
  },
  blocked: {
    bg: 'linear-gradient(135deg, #64748b, #475569)',
    solid: '#64748b',
    border: '#334155',
    text: '#fff',
    label: 'Blocked',
  },
  google_external: {
    bg: '#4b5563',
    solid: '#4b5563',
    border: '#1f2937',
    text: '#fff',
    label: 'Google Calendar',
  },
};

/**
 * HR calendar status colors — cooler / corporate set, distinct from interviewer calendar.
 * Available free slots still use per-interviewer department palettes; these apply to booked states.
 */
export const HR_CALENDAR_STATUS_PALETTES = {
  available: {
    bg: 'linear-gradient(135deg, #38bdf8, #0284c7)',
    solid: '#0284C7',
    border: '#075985',
    text: '#fff',
    label: 'Available',
  },
  booked: {
    bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    solid: '#4F46E5',
    border: '#312E81',
    text: '#fff',
    label: 'Booked',
  },
  panel_booked: {
    bg: 'linear-gradient(135deg, #f472b6, #db2777)',
    solid: '#DB2777',
    border: '#9D174D',
    text: '#fff',
    label: 'Panel',
  },
  postpone_request: {
    bg: 'linear-gradient(135deg, #fb923c, #ea580c)',
    solid: '#EA580C',
    border: '#9A3412',
    text: '#fff',
    label: 'Postpone proposal',
  },
  completed: {
    bg: 'linear-gradient(135deg, #94a3b8, #64748b)',
    solid: '#64748B',
    border: '#334155',
    text: '#fff',
    label: 'Completed',
  },
  overdue: {
    bg: 'linear-gradient(135deg, #f87171, #dc2626)',
    solid: '#DC2626',
    border: '#991B1B',
    text: '#fff',
    label: 'Overdue',
  },
};

export const PANEL_PALETTE = CALENDAR_STATUS_PALETTES.panel_booked;
export const COMPLETED_EVENT_PALETTE = CALENDAR_STATUS_PALETTES.completed;
export const OVERDUE_EVENT_PALETTE = CALENDAR_STATUS_PALETTES.overdue;
export const POSTPONE_REQUEST_PALETTE = CALENDAR_STATUS_PALETTES.postpone_request;

export const HR_PANEL_PALETTE = HR_CALENDAR_STATUS_PALETTES.panel_booked;
export const HR_COMPLETED_EVENT_PALETTE = HR_CALENDAR_STATUS_PALETTES.completed;
export const HR_OVERDUE_EVENT_PALETTE = HR_CALENDAR_STATUS_PALETTES.overdue;
export const HR_POSTPONE_REQUEST_PALETTE = HR_CALENDAR_STATUS_PALETTES.postpone_request;
export const HR_BOOKED_PALETTE = HR_CALENDAR_STATUS_PALETTES.booked;

/** Proposed alternative interview time (pending HR approval) */
export const PROPOSED_TIME_PALETTE = {
  bg: 'linear-gradient(135deg, #f97316, #ea580c)',
  solid: '#EA580C',
  border: '#9A3412',
  text: '#fff',
};

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
  const isCancelled = event.resource?.interviewStatus === InterviewScheduleStatus.CANCELLED;
  const isOverdue = isBooked
    && !isCompleted
    && !isCancelled
    && event.end instanceof Date
    && !Number.isNaN(event.end.getTime())
    && event.end.getTime() < Date.now();
  const hasPostponeRequest = Boolean(event.resource?.hasPendingPostponeRequest) && !isCompleted && !isOverdue;
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
          ) : hasPostponeRequest ? (
            <CalendarClock className="booked-event-lock postpone-event-icon" aria-hidden="true" />
          ) : (
            <Lock className="booked-event-lock" aria-hidden="true" />
          )}
          <span className="booked-event-candidate">
            {candidateName || interviewerName || (isCompleted ? 'Completed' : (isOverdue ? 'Overdue' : 'Booked'))}
          </span>
        </div>
        {isCompleted && (
          <span className="booked-event-completed-badge">Completed</span>
        )}
        {isOverdue && (
          <span className="booked-event-overdue-badge">Overdue</span>
        )}
        {hasPostponeRequest && (
          <span className="booked-event-postpone-badge">
            {resource.pendingPostponePreferredStart && resource.pendingPostponePreferredEnd
              ? 'Time change requested'
              : 'Postpone requested'}
            {resource.panelId && resource.pendingPostponeRequestedByName
              ? ` by ${resource.pendingPostponeRequestedByName}`
              : ''}
          </span>
        )}
        {showInterviewer && (
          <span className="booked-event-interviewer">{interviewerName}</span>
        )}
        {timeLabel && (
          <span className="booked-event-time">{timeLabel}</span>
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

export const isEventBeforeDateFilter = (event, lockStart) =>
  Boolean(lockStart && event?.start && event.start < lockStart);

export const getEventStyle = (event, panelSlots, lockStart = null) => {
  const isBooked = event.resource?.status === SlotStatus.BOOKED;
  const isCompleted = event.resource?.interviewStatus === InterviewScheduleStatus.COMPLETED;
  const isCancelled = event.resource?.interviewStatus === InterviewScheduleStatus.CANCELLED;
  const isOverdue = isBooked
    && !isCompleted
    && !isCancelled
    && event.end instanceof Date
    && !Number.isNaN(event.end.getTime())
    && event.end.getTime() < Date.now();
  const hasPostponeRequest = Boolean(event.resource?.hasPendingPostponeRequest)
    && isBooked
    && !isCompleted
    && !isOverdue;
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const isBeforeFilter = isEventBeforeDateFilter(event, lockStart);
  const deptPalette = getDepartmentPalette(event.resource?.department);
  const basePalette = deptPalette || event.resource?.palette || INTERVIEWER_PALETTES[0];
  const bookedPalette = isBooked && !isCompleted && !hasPostponeRequest && !isOverdue
    ? HR_BOOKED_PALETTE
    : null;
  const completedPalette = isCompleted ? HR_COMPLETED_EVENT_PALETTE : null;
  const overduePalette = isOverdue ? HR_OVERDUE_EVENT_PALETTE : null;
  const postponePalette = hasPostponeRequest ? HR_POSTPONE_REQUEST_PALETTE : null;
  const leftBorderColor = isBeforeFilter
    ? '#94a3b8'
    : (isCompleted
      ? completedPalette.border
      : (isOverdue
        ? overduePalette.border
        : (hasPostponeRequest
          ? postponePalette.border
          : (isBooked && bookedPalette ? bookedPalette.border || bookedPalette.solid : basePalette.border || basePalette.solid))));

  if (isBeforeFilter) {
    return {
      className: 'available-event outside-date-filter-event',
      style: {
        background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
        borderRadius: '5px',
        opacity: 0.42,
        color: '#f8fafc',
        borderLeft: '3px solid #94a3b8',
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        padding: '3px 6px',
        fontSize: '11px',
        fontWeight: '500',
        boxShadow: 'none',
        cursor: 'not-allowed',
        overflow: 'hidden',
        maxWidth: '100%',
        outline: 'none',
        filter: 'grayscale(1)',
      },
    };
  }

  const activePalette = isCompleted
    ? completedPalette
    : (isOverdue
      ? overduePalette
      : (hasPostponeRequest
        ? postponePalette
        : (bookedPalette || basePalette)));

  return {
    className: isCompleted
      ? 'booked-event completed-event'
      : (isOverdue
        ? 'booked-event overdue-event'
        : (hasPostponeRequest
          ? 'booked-event postpone-request-event'
          : (isBooked ? 'booked-event' : 'available-event'))),
    style: {
      background: activePalette.bg,
      borderRadius: '5px',
      opacity: isCompleted ? 0.92 : (isBooked ? 0.97 : 0.94),
      color: activePalette.text || 'white',
      borderLeft: `${isBooked || isCompleted || hasPostponeRequest || isOverdue ? 4 : 3}px solid ${leftBorderColor}`,
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      padding: isBooked ? '4px 6px' : '3px 6px',
      fontSize: '11px',
      fontWeight: isBooked ? '600' : '500',
      boxShadow: isInPanel
        ? `0 2px 10px ${HR_PANEL_PALETTE.solid}50, 0 0 0 2px #f9a8d4`
        : isOverdue
          ? `0 2px 10px ${HR_OVERDUE_EVENT_PALETTE.solid}55, 0 0 0 1px ${HR_OVERDUE_EVENT_PALETTE.border}66`
          : hasPostponeRequest
            ? `0 2px 10px ${HR_POSTPONE_REQUEST_PALETTE.solid}55, 0 0 0 1px ${HR_POSTPONE_REQUEST_PALETTE.border}66`
            : `0 1px 4px ${activePalette.solid}40`,
      cursor: 'pointer',
      overflow: 'hidden',
      maxWidth: '100%',
      outline: 'none',
    },
  };
};

export const getTooltipText = (event, panelSlots, formatTimeRange = (start, end) => `${start} - ${end}`, lockStart = null) => {
  const r = event.resource;
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const timeRange = formatTimeRange(event.start, event.end);

  if (isEventBeforeDateFilter(event, lockStart)) {
    return [
      `Interviewer: ${r?.interviewer || event.title}`,
      `Time: ${timeRange}`,
      '',
      'Outside selected From date, not bookable',
    ].join('\n');
  }

  if (r?.status === SlotStatus.BOOKED) {
    const meetLine = r.meetingLink ? `\nGoogle Meet: ${r.meetingLink}` : '';
    if (r.interviewStatus === InterviewScheduleStatus.COMPLETED) {
      return `COMPLETED: ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${timeRange}${meetLine}\n\nInterview finished. Feedback locked`;
    }
    const isOverdue = event.end instanceof Date
      && !Number.isNaN(event.end.getTime())
      && event.end.getTime() < Date.now()
      && r.interviewStatus !== InterviewScheduleStatus.CANCELLED;
    if (isOverdue) {
      return `OVERDUE: ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${timeRange}${meetLine}\n\nPast interview not completed`;
    }
    if (r.hasPendingPostponeRequest) {
      const reasonLine = r.pendingPostponeReason
        ? `\nReason: ${r.pendingPostponeReason}`
        : '';
      const proposedLine = (r.pendingPostponePreferredStart && r.pendingPostponePreferredEnd)
        ? `\nProposed: ${formatTimeRange(
          new Date(r.pendingPostponePreferredStart),
          new Date(r.pendingPostponePreferredEnd),
        )}`
        : '';
      return `TIME CHANGE REQUESTED: ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\nCurrent: ${timeRange}${proposedLine}${reasonLine}${meetLine}\n\nInterviewer proposed a new time. Click to review`;
    }
    return `BOOKED: ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${timeRange}${meetLine}\n\nClick to cancel and restore slot`;
  }

  if (isInPanel) {
    return `PANEL SELECTED: ${r.interviewer}\n${timeRange}\n\nClick again to remove from panel`;
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
