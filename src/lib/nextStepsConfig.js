export const getNextStepsConfig = (status) => {
  const configs = {
    NEW: {
      prompt: "Review the applicant's profile and documents. Start the screening process if they meet the minimum requirements.",
      actions: [
        { label: "Start Screening", actionType: "MOVE_TO_SCREENING", variant: "default" },
        { label: "Reject Candidate", actionType: "REJECT", variant: "destructive" },
      ]
    },
    SCREENING: {
      prompt: "Screening is in progress. Once you've evaluated the screening results, determine the next step.",
      actions: [
        { label: "Schedule Interview", actionType: "SCHEDULE", variant: "default" },
        { label: "Put on Hold", actionType: "HOLD", variant: "outline" },
        { label: "Reject Candidate", actionType: "REJECT", variant: "destructive" }
      ]
    },
    SCHEDULED: {
      prompt: "Interview is scheduled. After the interview, provide your feedback and make a decision.",
      actions: [
        { label: "Make Offer", actionType: "OFFER", variant: "default" },
        { label: "Reschedule", actionType: "RESCHEDULE", variant: "secondary" },
        { label: "Reject Candidate", actionType: "REJECT", variant: "destructive" }
      ]
    },
    OFFERED: {
      prompt: "An offer has been extended. Wait for candidate response to finalize hiring.",
      actions: [
        { label: "Mark as Hired", actionType: "HIRE", variant: "default", className: "bg-green-600 hover:bg-green-700" },
        { label: "Offer Declined", actionType: "REJECT", variant: "destructive" }
      ]
    },
    ON_HOLD: {
      prompt: "Candidate is currently on hold. You can resume their process at any time.",
      actions: [
        { label: "Resume Process", actionType: "RESUME", variant: "default" },
        { label: "Reject Candidate", actionType: "REJECT", variant: "destructive" }
      ]
    },
    // Default fallback
    DEFAULT: {
      prompt: "Review the candidate and choose the next stage to move the process forward.",
      actions: []
    }
  };

  return configs[status] || configs.DEFAULT;
};