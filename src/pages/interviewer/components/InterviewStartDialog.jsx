import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CandidateAvatar } from '@/components/CandidateAvatar';
import { Briefcase, Award, TrendingUp, MapPin, Hash, Calendar, Clock, Phone, User, UserCheck, CalendarClock, Video, ExternalLink, Users } from 'lucide-react';
import { LoadingState, LoadingSwap } from '@/components/ui/loading';
import { motion } from 'framer-motion';
import  candidateAPI from '@/services/candidateAPI';
import { feedbackAPI } from '@/services/feedbackAPI';

import { availabilityAPI } from '@/services/availabilityAPI';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { InterviewScheduleStatus } from '@/lib/statusConstants';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import ProposeTimeDialog from './ProposeTimeDialog';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function InterviewStartDialog({ open, interviewScheduleId, onOpenChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatDate, formatTimeRange, formatFriendlyDateTimeRange } = useFormattedDateTime();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState(null);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [error, setError] = useState('');
  const [isProposeDialogOpen, setIsProposeDialogOpen] = useState(false);
  const [pendingPostpone, setPendingPostpone] = useState(null);
  const [withdrawingPostpone, setWithdrawingPostpone] = useState(false);
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false);
  const displayCandidateName = candidate?.name || interviewDetails?.candidateName || 'Candidate details unavailable';

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setCandidate(null);
      setInterviewDetails(null);
      setHasSubmittedFeedback(false);
      setError('');
      setPendingPostpone(null);
      setWithdrawingPostpone(false);
      setDeclineConfirmOpen(false);
      return;
    }

    if (!interviewScheduleId) {
      setLoading(false);
      setError('Missing interview schedule ID.');
      return;
    }

    loadInterviewData();
  }, [open, interviewScheduleId]);

  const isCompleted = interviewDetails?.interviewStatus === InterviewScheduleStatus.COMPLETED
    || hasSubmittedFeedback;
  const isPanelInterview = !!interviewDetails?.panelId;
  const panelMembers = interviewDetails?.panelMembers || [];
  const interviewCoordinatorName = interviewDetails?.interviewCoordinatorName || null;
  const candidateCoordinatorName = candidate?.coordinatedHrName
    || interviewDetails?.coordinatedHrName
    || null;
  const showPeopleSection = panelMembers.length > 0
    || interviewCoordinatorName
    || candidateCoordinatorName;
  const canWithdrawPostpone = !!pendingPostpone
    && (!pendingPostpone.requestedById || pendingPostpone.requestedById === user?.id);
  const hasProposedTime = !!(pendingPostpone?.preferredStartDateTime && pendingPostpone?.preferredEndDateTime);

  const loadInterviewData = async () => {
    try {
      setLoading(true);
      setError('');

      const interviewData = await availabilityAPI.getInterviewDetails(interviewScheduleId);
      const interview = Array.isArray(interviewData) ? interviewData[0] : interviewData;
      setInterviewDetails(interview);

      try {
        const feedback = await feedbackAPI.getFeedbackForInterview(interviewScheduleId);
        setHasSubmittedFeedback(!!feedback);
      } catch {
        setHasSubmittedFeedback(false);
      }

      try {
        const pendingPayload = await availabilityAPI.getPendingPostponeRequest(interviewScheduleId);
        setPendingPostpone(pendingPayload?.pending ? pendingPayload.request : null);
      } catch {
        setPendingPostpone(null);
      }

      if (interview?.candidateId) {
        const candidateData = await candidateAPI.getCandidateById(interview.candidateId);
        setCandidate(candidateData);
      }
    } catch (err) {
      console.error('Failed to load interview data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawPostpone = async () => {
    if (!pendingPostpone?.id) {
      toast({
        title: 'Could not withdraw request',
        description: 'Missing postpone request id. Refresh and try again.',
        variant: 'destructive',
      });
      return;
    }
    setWithdrawingPostpone(true);
    try {
      await availabilityAPI.withdrawPostponeRequest(pendingPostpone.id);
      setPendingPostpone(null);
      setDeclineConfirmOpen(false);
      setIsProposeDialogOpen(false);
      onOpenChange(false);
      toast({
        title: hasProposedTime ? 'Proposal declined' : 'Request withdrawn',
        description: 'Your postpone request was withdrawn. The original interview remains scheduled.',
      });
    } catch (err) {
      toast({
        title: hasProposedTime ? 'Could not decline proposal' : 'Could not withdraw request',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setWithdrawingPostpone(false);
    }
  };

  const handleStartInterview = () => {
    onOpenChange(false);
    navigate(`/interviewer/feedback/${interviewScheduleId}`);
  };

  const dialogTitle = isCompleted ? 'Completed Interview' : 'Interview Session';
  const dialogDescription = isCompleted
    ? 'This interview is finished. View the submitted feedback.'
    : 'Review candidate information before starting the interview';

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Keep session open while propose dialog is showing.
        if (!nextOpen && (isProposeDialogOpen || withdrawingPostpone)) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className={`max-w-5xl gap-0 p-0 m-4 overflow-hidden ${
          isProposeDialogOpen
            ? 'pointer-events-none select-none opacity-60 blur-[6px]'
            : ''
        }`}
        onPointerDownOutside={(event) => {
          if (isProposeDialogOpen) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isProposeDialogOpen) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (isProposeDialogOpen) event.preventDefault();
        }}
      >
        <DialogHeader className="px-5 py-4 shrink-0">
          <DialogTitle className="text-2xl">{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-5 py-4 min-h-0">
          <LoadingSwap loading={loading} fallback={<LoadingState minHeight="sm" />}>
          {error ? (
            <div className="space-y-4">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-semibold text-base mb-1">Failed to Load Interview Details</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {pendingPostpone && !isCompleted && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CalendarClock className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-amber-900">
                        {pendingPostpone.preferredStartDateTime && pendingPostpone.preferredEndDateTime
                          ? 'Time change proposal pending'
                          : 'Postpone request pending'}
                      </p>
                      <p className="text-xs text-amber-800">
                        Waiting for HR to review.
                        {pendingPostpone.requestedByName
                          && pendingPostpone.requestedById !== user?.id && (
                          <>
                            {' '}Requested by <strong>{pendingPostpone.requestedByName}</strong>.
                          </>
                        )}
                        {pendingPostpone.preferredStartDateTime && pendingPostpone.preferredEndDateTime ? (
                          <>
                            {' '}Proposed:{' '}
                            <strong>
                              {formatFriendlyDateTimeRange(
                                new Date(pendingPostpone.preferredStartDateTime),
                                new Date(pendingPostpone.preferredEndDateTime),
                              )}
                            </strong>
                          </>
                        ) : (
                          <> No alternative time was proposed.</>
                        )}
                      </p>
                      {pendingPostpone.reason && (
                        <p className="text-xs text-amber-800">Reason: {pendingPostpone.reason}</p>
                      )}
                    </div>
                  </div>
                  {canWithdrawPostpone && (
                    declineConfirmOpen ? (
                      <div className="rounded-lg border border-amber-300 bg-white/80 p-3 space-y-3">
                        <p className="text-sm font-medium text-amber-950">
                          {hasProposedTime
                            ? 'Decline this time proposal? The original interview stays scheduled.'
                            : 'Withdraw this postpone request? The original interview stays scheduled.'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeclineConfirmOpen(false)}
                            disabled={withdrawingPostpone}
                            className="border-amber-300 text-amber-900 hover:bg-amber-50"
                          >
                            No, keep it
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleWithdrawPostpone}
                            loading={withdrawingPostpone}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            {withdrawingPostpone
                              ? (hasProposedTime ? 'Declining…' : 'Withdrawing…')
                              : (hasProposedTime ? 'Yes, decline' : 'Yes, withdraw')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeclineConfirmOpen(true)}
                        disabled={withdrawingPostpone}
                        className="border-amber-300 text-amber-900 hover:bg-amber-100"
                      >
                        {hasProposedTime ? 'Decline proposal' : 'Withdraw request'}
                      </Button>
                    )
                  )}
                </div>
              )}

              {candidate || interviewDetails?.candidateName ? (
                <div className="space-y-4 p-4">
                  <div className="flex items-start gap-4 pb-4 border-b">
                    <CandidateAvatar
                      candidate={candidate}
                      name={displayCandidateName}
                      className="h-16 w-16 border-2 border-primary"
                      fallbackClassName="bg-gradient-to-br from-primary to-primary/70 text-white text-lg font-bold"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900">{displayCandidateName}</h3>
                      {candidate?.email ? (
                        <p className="text-sm text-gray-600 mb-2">{candidate.email}</p>
                      ) : interviewDetails?.candidateName ? (
                        <p className="text-sm text-gray-600 mb-2">Booked candidate</p>
                      ) : null}
                      {candidate?.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {showPeopleSection && (
                    <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-slate-50 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-sky-100 p-2 rounded-lg">
                          <Users className="w-4 h-4 text-sky-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-sky-900">
                            {isPanelInterview ? 'Panel interview' : 'People'}
                          </h3>
                          {isPanelInterview && panelMembers.length > 0 && (
                            <p className="text-xs text-sky-700/80">
                              {panelMembers.length} interviewer{panelMembers.length === 1 ? '' : 's'}
                            </p>
                          )}
                        </div>
                      </div>

                      {isPanelInterview && panelMembers.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700/70 mb-3">
                            Panel members
                          </p>
                          <ul className="space-y-2">
                            {panelMembers.map((member) => (
                              <li
                                key={member.interviewerId || member.interviewerName}
                                className="flex items-center gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2.5"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#0369a1,#0c4a6e)] text-[11px] font-semibold text-white">
                                  {getInitials(member.interviewerName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {member.interviewerName}
                                  </p>
                                  {member.designationName && (
                                    <p className="text-xs text-slate-500 truncate">
                                      {member.designationName}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(interviewCoordinatorName || candidateCoordinatorName) && (
                        <div className={`grid gap-3 ${interviewCoordinatorName && candidateCoordinatorName ? 'sm:grid-cols-2' : ''}`}>
                          {interviewCoordinatorName && (
                            <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2.5">
                              <div className="bg-sky-100 p-2 rounded-lg shrink-0">
                                <UserCheck className="w-4 h-4 text-sky-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-sky-700">Interview Coordinator</p>
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {interviewCoordinatorName}
                                </p>
                              </div>
                            </div>
                          )}
                          {candidateCoordinatorName && (
                            <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2.5">
                              <div className="bg-sky-100 p-2 rounded-lg shrink-0">
                                <User className="w-4 h-4 text-sky-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-sky-700">Candidate Coordinator</p>
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {candidateCoordinatorName}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {interviewDetails && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-blue-900">Interview Schedule</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {interviewDetails.preferredStartDateTime && (
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-blue-600 font-medium">Date</p>
                              <p className="font-semibold text-sm">{formatDate(interviewDetails.preferredStartDateTime)}</p>
                            </div>
                          </div>
                        )}
                        {interviewDetails.preferredStartDateTime && (
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-blue-600 font-medium">Time</p>
                              <p className="font-semibold text-sm">
                                {formatTimeRange(
                                  new Date(interviewDetails.preferredStartDateTime),
                                  new Date(interviewDetails.preferredEndDateTime)
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {interviewDetails.meetingLink && !isCompleted && (
                        <div className="rounded-lg border border-blue-200 bg-white p-3">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                              <Video className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-blue-600 font-medium">Google Meet</p>
                              <a
                                href={interviewDetails.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 break-all"
                              >
                                Join meeting
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                              <p className="mt-1 text-xs text-slate-500 break-all">{interviewDetails.meetingLink}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {candidate?.targetDesignationName && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <Award className="w-4 h-4  text-blue-600 mt-1 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-600">Target Position</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{candidate.targetDesignationName}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {candidate?.departmentName && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-600">Department</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{candidate.departmentName}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {candidate?.tierName && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-600">Experience Level</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{candidate.tierName}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {candidate?.yearsOfExperience !== undefined && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <Hash className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-600">Experience</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{candidate.yearsOfExperience} years</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {candidate?.location && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-600">Location</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{candidate.location}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Candidate details are unavailable, but the interview schedule is still loaded.
                </div>
              )}
            </motion.div>
          )}
          </LoadingSwap>
        </DialogBody>

        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>

          {!loading && !error && !isCompleted && interviewScheduleId && !pendingPostpone && (
            <Button
              variant="secondary"
              onClick={() => setIsProposeDialogOpen(true)}
              className="gap-2"
            >
              <CalendarClock className="w-4 h-4" />
              {isPanelInterview ? 'Propose / Postpone' : 'Propose a time'}
            </Button>
          )}
          <Button onClick={handleStartInterview} disabled={loading || !interviewScheduleId} className="gap-2">
            <User className="w-4 h-4" />
            {isCompleted ? 'View Feedback' : 'Start Interview'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <ProposeTimeDialog
        open={isProposeDialogOpen}
        onOpenChange={setIsProposeDialogOpen}
        onSuccess={() => {
          onOpenChange(false);
        }}
        interviewScheduleId={interviewScheduleId}
        currentInterview={interviewDetails}
      />
    </>
  );
}

export default InterviewStartDialog;
