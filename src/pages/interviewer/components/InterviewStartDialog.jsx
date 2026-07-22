import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CandidateAvatar } from '@/components/CandidateAvatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase, Award, TrendingUp, MapPin, Hash, Calendar, Clock, Mail, Phone, User, CalendarClock, Video, ExternalLink, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import  candidateAPI from '@/services/candidateAPI';
import { feedbackAPI } from '@/services/feedbackAPI';

import { availabilityAPI } from '@/services/availabilityAPI';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { InterviewScheduleStatus } from '@/lib/statusConstants';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import ProposeTimeDialog from './ProposeTimeDialog';

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
    if (!pendingPostpone?.id) return;
    setWithdrawingPostpone(true);
    try {
      await availabilityAPI.withdrawPostponeRequest(pendingPostpone.id);
      setPendingPostpone(null);
      setDeclineConfirmOpen(false);
      setIsProposeDialogOpen(false);
      onOpenChange(false);
      toast({
        title: 'Proposal declined',
        description: 'Your time-change request was withdrawn. The original interview remains scheduled.',
      });
    } catch (err) {
      toast({
        title: 'Could not decline proposal',
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-2xl gap-0 p-0 m-4 overflow-hidden ${
          isProposeDialogOpen || declineConfirmOpen
            ? 'pointer-events-none select-none opacity-60 blur-[6px]'
            : ''
        }`}
      >
        <DialogHeader className="px-5 py-4 shrink-0">
          <DialogTitle className="text-2xl">{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeclineConfirmOpen(true)}
                      disabled={withdrawingPostpone}
                      className="border-amber-300 text-amber-900 hover:bg-amber-100"
                    >
                      {pendingPostpone.preferredStartDateTime ? 'Decline proposal' : 'Withdraw request'}
                    </Button>
                  )}
                </div>
              )}

              {/* Candidate Profile Section */}
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
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-600" />
                        <h3 className="text-sm font-semibold text-slate-800">People</h3>
                      </div>

                      {isPanelInterview && panelMembers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Panel members
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {panelMembers.map((member) => (
                              <Badge
                                key={member.interviewerId || member.interviewerName}
                                variant="outline"
                                className="bg-sky-50 border-sky-200 text-sky-900 font-medium"
                              >
                                {member.interviewerName}
                                {member.designationName ? ` · ${member.designationName}` : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {interviewCoordinatorName && (
                        <div className="text-sm text-slate-700">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                            Interview Coordinator
                          </span>
                          <span className="font-medium text-slate-900">{interviewCoordinatorName}</span>
                        </div>
                      )}

                      {candidateCoordinatorName && (
                        <div className="text-sm text-slate-700">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                            Candidate Coordinator
                          </span>
                          <span className="font-medium text-slate-900">{candidateCoordinatorName}</span>
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

      <ProposeTimeDialog
        open={isProposeDialogOpen}
        onOpenChange={setIsProposeDialogOpen}
        onSuccess={() => {
          onOpenChange(false);
        }}
        interviewScheduleId={interviewScheduleId}
        currentInterview={interviewDetails}
      />

      <AlertDialog
        open={declineConfirmOpen}
        onOpenChange={(nextOpen) => {
          if (withdrawingPostpone) return;
          setDeclineConfirmOpen(nextOpen);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline time proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This withdraws your proposed time. The original interview stays scheduled.
              HR will no longer see a pending time-change request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawingPostpone}>No</AlertDialogCancel>
            <AlertDialogAction
              disabled={withdrawingPostpone}
              onClick={(event) => {
                event.preventDefault();
                handleWithdrawPostpone();
              }}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {withdrawingPostpone ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Declining…</>
              ) : (
                'Yes, decline'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export default InterviewStartDialog;
