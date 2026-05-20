import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';

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

export const BOOKED_OVERLAY = {
  bg: 'linear-gradient(135deg, #e5e7eb, #9ca3af)',
  border: '#6b7280',
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

export const CalendarEventComponent = ({ event, panelSlots }) => {
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const isBooked = event.resource?.status === 'BOOKED';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      overflow: 'hidden',
      height: '100%',
      width: '100%',
    }}>
      {isInPanel && (
        <span style={{

          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(255,255,255,0.25)',
          borderRadius: 3,
          padding: '1px 4px',
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          <CheckCircle2 style={{ width: 9, height: 9 }} />
          Panel
        </span>
      )}
      {isBooked && !isInPanel ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          flex: 1,
          minWidth: 0,
          padding: '4px',
          height: '100%',
          borderRadius: 3,
          textAlign: 'center',
        }}>
          <Lock style={{ width: 30, height: 30, color: 'inherit' }} />
          <span style={{
            fontSize: 11,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textAlign: 'center',
            marginTop: 6,
            lineHeight: '1.1',
            maxWidth: '100%',
            fontWeight: 600,
            color: 'inherit',
          }}>
            {event.title.replace(/^Booked\s*/, '')}
          </span>
        </div>
      ) : (
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 11,
          flex: 1,
          minWidth: 0,
          
        }}>
          {event.resource?.interviewer || event.title}
        </span>
      )
      }
    </div>
  );
};

export const getEventStyle = (event, panelSlots) => {
  const isBooked = event.resource?.status === 'BOOKED';
  const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
  const deptPalette = getDepartmentPalette(event.resource?.department);
  const basePalette = deptPalette || event.resource?.palette || INTERVIEWER_PALETTES[0];

  // Mix gray booked overlay with department gradient for booked slots
  const background = isBooked
    ? `${BOOKED_OVERLAY.bg}, ${basePalette.bg}`
    : basePalette.bg;

  const textColor = isBooked ? '#000' : (basePalette.text || 'white');
  const leftBorder = isBooked
    ? `3px solid ${BOOKED_OVERLAY.border || basePalette.border || basePalette.solid}`
    : `3px solid ${basePalette.border || basePalette.solid}`;

  return {
    style: {
      background,
      borderRadius: '5px',
      opacity: isBooked ? 0.95 : 0.94,
      color: textColor,
      borderLeft: leftBorder,
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      padding: '3px 6px',
      fontSize: '11px',
      fontWeight: '500',
      boxShadow: isInPanel
        ? `0 2px 10px ${PANEL_PALETTE.solid}50, 0 0 0 2px #7dd3fc`
        : `0 1px 4px ${basePalette.solid}30`,
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

  if (r?.status === 'BOOKED') {
    return `BOOKED - ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${timeRange}\n\nClick to cancel & restore slot`;
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
