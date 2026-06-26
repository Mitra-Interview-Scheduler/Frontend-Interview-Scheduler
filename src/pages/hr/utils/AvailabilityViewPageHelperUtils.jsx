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

  if (interviewerTier < candidateTier) {
    return `The interviewer's tier (Tier ${interviewerTier}) is below the candidate's required tier (Tier ${candidateTier}). Please choose a more senior interviewer.`;
  }

  if (
    interviewerTier === candidateTier &&
    interviewerLevel != null &&
    candidateLevel != null &&
    interviewerLevel < candidateLevel
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
        yearsOfExperience: slot.yearsOfExperience,
        status: slot.status,
        candidateName: slot.candidateName,
        requestId: slot.requestId ?? null,
        interviewType: slot.interviewType ?? null,
        interviewScheduleId: slot.interviewScheduleId ?? null,
        interviewStatus: slot.interviewStatus ?? null,
        interviewCoordinatorName: slot.interviewCoordinatorName ?? null,
        coordinatedHrName: slot.coordinatedHrName ?? null,
        palette,
        interviewerTierOrder: slot.interviewerTierOrder ?? null,
        interviewerLevelOrder: slot.interviewerLevelOrder ?? null,
      },
    };
  });
