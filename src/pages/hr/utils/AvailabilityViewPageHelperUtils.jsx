import { INTERVIEWER_PALETTES } from './AvailabilityViewPageUiUtils';
import { SlotStatus, formatInterviewTypeLabel as formatInterviewTypeLabelFromConstants } from '@/lib/statusConstants';

export {
  calendarLocalizer as localizer,
  formatInputDate,
  formatInputDateTime,
  formatLocalDateTime,
  generateTimeOptions,
  padDatePart as pad,
  parseTimeOnDate,
} from '@/lib/calendarUtils';

export const checkInterviewerPrivilege = (slotResource, candidate) => {
  if (!slotResource || !candidate) return null;

  const interviewerTier = slotResource.interviewerTierOrder;
  const interviewerLevel = slotResource.interviewerLevelOrder;
  const candidateTier = candidate.targetDesignationTierOrder;
  const candidateLevel = candidate.targetDesignationLevelOrder;

  if (interviewerTier == null || candidateTier == null) return null;

  // Lower tierOrder / levelOrder = more senior (same as calendar + match filters).
  if (interviewerTier > candidateTier) {
    return `The interviewer's tier (Tier ${interviewerTier}) is below the candidate's required tier (Tier ${candidateTier}). Please choose a more senior interviewer.`;
  }

  if (
    interviewerTier === candidateTier &&
    interviewerLevel != null &&
    candidateLevel != null &&
    interviewerLevel > candidateLevel
  ) {
    return `The interviewer is at the same tier but a lower level (Level ${interviewerLevel}) than the candidate requires (Level ${candidateLevel}). Please choose a more senior interviewer.`;
  }

  return null;
};

export const checkPanelPrivilege = (panelSlots, candidate) => {
  if (!candidate) return [];

  return panelSlots
    .map((panelSlot) => {
      const reason = checkInterviewerPrivilege(panelSlot.slot.resource, candidate);
      return reason ? { name: panelSlot.slot.resource.interviewer, reason } : null;
    })
    .filter(Boolean);
};

export const formatInterviewTypeLabel = (interviewType) => (
  formatInterviewTypeLabelFromConstants(interviewType) || null
);

export const formatSlots = (data, colorMap) =>
  data.map((slot) => {
    const isBooked = slot.status === SlotStatus.BOOKED;
    const paletteIdx = colorMap[slot.interviewerId] ?? 0;
    const palette = INTERVIEWER_PALETTES[paletteIdx];
    const skills = slot.technologies || [];
    const coreTechnologies = slot.coreTechnologies || [];
    const domains = slot.domains || [];
    const skillLabel = skills.length
      ? ` - ${skills.slice(0, 2).join(', ')}${skills.length > 2 ? ' +' + (skills.length - 2) : ''}`
      : '';

    return {
      id: slot.slotId,
      interviewerId: slot.interviewerId,
      paletteIdx,
      title: isBooked
        ? (slot.candidateName || slot.interviewerName)
        : `${slot.interviewerName}${skillLabel}`,
      start: new Date(slot.startDateTime),
      end: new Date(slot.endDateTime),
      resource: {
        ...slot,
        interviewer: slot.interviewerName,
        department: slot.department,
        designation: slot.designation,
        skills,
        coreTechnologies,
        domains,
        yearsOfExperience: slot.yearsOfExperience,
        status: slot.status,
        candidateName: slot.candidateName,
        requestId: slot.requestId ?? null,
        panelId: slot.panelId ?? null,
        interviewType: slot.interviewType ?? null,
        interviewScheduleId: slot.interviewScheduleId ?? null,
        interviewStatus: slot.interviewStatus ?? null,
        interviewCoordinatorName: slot.interviewCoordinatorName ?? null,
        coordinatedHrName: slot.coordinatedHrName ?? null,
        meetingLink: slot.meetingLink ?? null,
        hasPendingPostponeRequest: Boolean(slot.hasPendingPostponeRequest),
        pendingPostponeRequestId: slot.pendingPostponeRequestId ?? null,
        pendingPostponeReason: slot.pendingPostponeReason ?? null,
        pendingPostponeRequestedAt: slot.pendingPostponeRequestedAt ?? null,
        pendingPostponePreferredStart: slot.pendingPostponePreferredStart ?? null,
        pendingPostponePreferredEnd: slot.pendingPostponePreferredEnd ?? null,
        palette,
        interviewerTierOrder: slot.interviewerTierOrder ?? null,
        interviewerLevelOrder: slot.interviewerLevelOrder ?? null,
      },
    };
  });

/**
 * Find overlapping free windows across multiple interviewers' AVAILABLE slots.
 * @param {Array<Array<{ start: Date, end: Date, event: object }>>} interviewerIntervals
 * @param {number} [minDurationMs=30 * 60 * 1000]
 * @returns {Array<{ start: Date, end: Date, panelSlots: Array }>}
 */
export const findCommonFreeWindows = (interviewerIntervals, minDurationMs = 30 * 60 * 1000) => {
  if (!Array.isArray(interviewerIntervals) || interviewerIntervals.length === 0) {
    return [];
  }

  let current = interviewerIntervals[0]
    .filter((item) => item?.start && item?.end && item.end > item.start)
    .map((item) => ({
      start: item.start,
      end: item.end,
      panelSlots: [{ slot: item.event, bookStart: item.start, bookEnd: item.end }],
    }));

  for (let i = 1; i < interviewerIntervals.length; i += 1) {
    const nextList = interviewerIntervals[i] || [];
    const next = [];
    for (const window of current) {
      for (const item of nextList) {
        if (!item?.start || !item?.end) continue;
        const start = new Date(Math.max(window.start.getTime(), item.start.getTime()));
        const end = new Date(Math.min(window.end.getTime(), item.end.getTime()));
        if (end.getTime() - start.getTime() >= minDurationMs) {
          next.push({
            start,
            end,
            panelSlots: [
              ...window.panelSlots,
              { slot: item.event, bookStart: item.start, bookEnd: item.end },
            ],
          });
        }
      }
    }
    current = next;
    if (current.length === 0) break;
  }

  return current.sort((a, b) => a.start.getTime() - b.start.getTime());
};
