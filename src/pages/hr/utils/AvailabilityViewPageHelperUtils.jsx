import {format, parse, startOfWeek, getDay, addMinutes, startOfDay,} from 'date-fns';
import { dateFnsLocalizer } from 'react-big-calendar';
import { INTERVIEWER_PALETTES, BOOKED_OVERLAY, PANEL_PALETTE } from './AvailabilityViewPageUiUtils';
import enUS from 'date-fns/locale/en-US';
import {localizer} from '@/lib/ReactBigCalenderUtils';





// ── Helpers ──────────────────────────────────────────────────────────────────
export const pad = (n) => String(n).padStart(2, '0');

export const formatLocalDateTime = (date) => {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

export const formatInputDateTime = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};


export const formatInputDate = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const generateTimeOptions = (startDate, endDate) => {
  const options = [];
  let cur = new Date(startDate);
  while (cur <= endDate) {
    options.push({ label: format(cur, 'h:mm a'), value: format(cur, 'HH:mm'), date: new Date(cur) });
    cur = addMinutes(cur, 30);
  }
  return options;
};

export const parseTimeOnDate = (timeStr, referenceDate) => {
  const [h, m] = timeStr.split(':').map(Number);
  const r = new Date(referenceDate);
  r.setHours(h, m, 0, 0);
  return r;
};




// ── Privilege check ───────────────────────────────────────────────────────────
/**
 * Returns an error string if the interviewer is less senior than the candidate,
 * or null if the check passes (or data is missing).
 *
 * Logic:
 *  - First compare tierOrder: higher tier = more senior
 *  - If same tier, compare levelOrder: higher level = more senior
 *  - interviewer must be >= candidate on both dimensions
 *
 * Requires backend to expose interviewerTierOrder / interviewerLevelOrder on
 * the slot resource, and targetDesignationTierOrder / targetDesignationLevelOrder
 * on the candidate (see BACKEND_DTO_ADDITIONS.java).
 */
export const checkInterviewerPrivilege = (slotResource, candidate) => {
  if (!slotResource || !candidate) return null;

  const ivTier  = slotResource.interviewerTierOrder;
  const ivLevel = slotResource.interviewerLevelOrder;
  const cTier   = candidate.targetDesignationTierOrder;
  const cLevel  = candidate.targetDesignationLevelOrder;

  // If we don't have numeric data from the backend, skip the check gracefully
  if (ivTier == null || cTier == null) return null;

  if (ivTier < cTier) {
    return `The interviewer's tier (Tier ${ivTier}) is below the candidate's required tier (Tier ${cTier}). Please choose a more senior interviewer.`;
  }
  if (ivTier === cTier && ivLevel != null && cLevel != null && ivLevel < cLevel) {
    return `The interviewer is at the same tier but a lower level (Level ${ivLevel}) than the candidate requires (Level ${cLevel}). Please choose a more senior interviewer.`;
  }
  return null;
};



/**
 * For panel interviews: check ALL selected interviewers.
 * Returns a list of { name, reason } for any that fail.
 */
export const checkPanelPrivilege = (panelSlots, candidate) => {
  if (!candidate) return [];
  return panelSlots
    .map((ps) => {
      const err = checkInterviewerPrivilege(ps.slot.resource, candidate);
      return err ? { name: ps.slot.resource.interviewer, reason: err } : null;
    })
    .filter(Boolean);
};





    // ── Format slots → calendar events ───────────────────────────────────────
    export const formatSlots = (data, colorMap) => {
      return data.map((slot) => {
        const isBooked = slot.status === 'BOOKED';
        const paletteIdx = colorMap[slot.interviewerId] ?? 0;
        const palette = isBooked ? BOOKED_OVERLAY : INTERVIEWER_PALETTES[paletteIdx];
        const skills = slot.technologies || [];
        const skillLabel = skills.length
          ? ` · ${skills.slice(0, 2).join(', ')}${skills.length > 2 ? ' +' + (skills.length - 2) : ''}`
          : '';
  
        return {
          id: slot.slotId,
          interviewerId: slot.interviewerId,
          paletteIdx,
          title: isBooked
            ? `🔒 ${slot.interviewerName}${slot.candidateName ? ' → ' + slot.candidateName : ''}`
            : `${slot.interviewerName}${skillLabel}`,
          start: new Date(slot.startDateTime),
          end: new Date(slot.endDateTime),
          resource: {
            ...slot,
            interviewer: slot.interviewerName,
            department: slot.department,
            designation: slot.designation,
            skills,
            yearsOfExperience: slot.yearsOfExperience,
            status: slot.status,
            candidateName: slot.candidateName,
            requestId: slot.requestId ?? null,
            palette,
            interviewerTierOrder:  slot.interviewerTierOrder  ?? null,
            interviewerLevelOrder: slot.interviewerLevelOrder ?? null,
          },
        };
      });
    };

    