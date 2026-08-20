import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  User,
  Briefcase,
  Clock,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  Hourglass,
  UserCheck,
  Upload,
  Download,
  CheckCircle2,
  Users,
  X,
} from 'lucide-react';
import { InlineLoading, LoadingState } from '@/components/ui/loading';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import FeedbackResponseDisplay from '@/components/FeedbackResponseDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { feedbackAPI } from '@/services/feedbackAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { assessmentAPI } from '@/services/assessmentAPI';
import { formatInterviewTypeLabel } from '@/lib/candidateSteps';
import { getInterviewStatusMeta, resolveInterviewRequestStatus, getInterviewerDesignationLabel } from '@/lib/candidateInterviews';
import { InterviewScheduleStatus } from '@/lib/statusConstants';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import AssignAssessmentReviewersDialog from '../AssignAssessmentReviewersDialog';

const DetailField = ({ icon: Icon, label, children, iconClassName }) => (
  <div className="flex items-start gap-3">
    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100', iconClassName)}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  </div>
);

const phaseBadge = (phase) => {
  const key = String(phase || '').toUpperCase();
  if (key === 'RECEIVED') return { label: 'Received', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (key === 'UNDER_REVIEW') return { label: 'Under review', className: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (key === 'COMPLETED') return { label: 'Completed', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return { label: 'Awaiting upload', className: 'bg-sky-50 text-sky-700 border-sky-200' };
};

const InterviewDetailTab = ({
  interview,
  candidate,
  isActive = true,
  embedded = false,
  onCandidateUpdated = () => {},
}) => {
  const { formatDateTime, formatDateTimeRange } = useFormattedDateTime();
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [feedbackResponse, setFeedbackResponse] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [markingReceived, setMarkingReceived] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removingReviewerId, setRemovingReviewerId] = useState(null);
  const [reviewerToRemove, setReviewerToRemove] = useState(null);
  const fileInputRef = useRef(null);

  const interviewStatus = resolveInterviewRequestStatus(interview);
  const statusMeta = getInterviewStatusMeta(interviewStatus);
  const isCompleted = interviewStatus === InterviewScheduleStatus.COMPLETED;
  const isCancelled = interviewStatus === InterviewScheduleStatus.CANCELLED;
  const isScheduled = interviewStatus === InterviewScheduleStatus.SCHEDULED;
  const scheduleId = interview?.interviewScheduleId;
  const maybeAssessment = Boolean(interview?.interviewScheduleId)
    && !interview?.assignedInterviewerId;
  const isAssessment = Boolean(interview?.assessmentPhase)
    || interview?.hasAssessmentFile === true
    || maybeAssessment;

  // Prefer explicit assessmentPhase from interview DTO; fall back after load
  const phase = assessment?.assessmentPhase || interview?.assessmentPhase;
  const hasFile = assessment?.hasAssessmentFile ?? interview?.hasAssessmentFile;
  const fileName = assessment?.assessmentFileName || interview?.assessmentFileName;

  const loadAssessment = useCallback(async () => {
    if (!scheduleId || !isAssessment) {
      setAssessment(null);
      return;
    }
    setAssessmentLoading(true);
    try {
      const data = await assessmentAPI.get(scheduleId);
      setAssessment(data);
    } catch {
      // Not an assessment schedule (or unauthorized) — hide assessment panel
      setAssessment(null);
    } finally {
      setAssessmentLoading(false);
    }
  }, [scheduleId, isAssessment]);

  const loadFeedback = useCallback(async () => {
    if (!scheduleId || (!isCompleted && String(phase || '').toUpperCase() !== 'UNDER_REVIEW')) {
      setFeedbackForm(null);
      setFeedbackResponse(null);
      return;
    }

    setFeedbackLoading(true);
    try {
      const response = await feedbackAPI.getFeedbackForInterview(scheduleId);
      setFeedbackResponse(response);
      if (response?.feedbackFormId) {
        const form = await feedbackQuestionsAPI.getById(response.feedbackFormId);
        setFeedbackForm(form);
      } else {
        setFeedbackForm(null);
      }
    } catch {
      setFeedbackForm(null);
      setFeedbackResponse(null);
    } finally {
      setFeedbackLoading(false);
    }
  }, [scheduleId, isCompleted, phase]);

  useEffect(() => {
    if (!isActive) return undefined;
    loadAssessment();
    loadFeedback();
    return undefined;
  }, [isActive, loadAssessment, loadFeedback]);

  const startTime = interview?.scheduledStartDateTime || interview?.preferredStartDateTime;
  const endTime = interview?.scheduledEndDateTime || interview?.preferredEndDateTime;
  const interviewerRole = getInterviewerDesignationLabel(interview);
  const interviewerName = interview?.assignedInterviewerName || '—';
  const coordinatorName = interview?.interviewCoordinatorName?.trim() || 'Not mentioned';
  const phaseMeta = phaseBadge(phase);
  const reviewers = assessment?.reviewers || [];

  const handleUpload = async (file) => {
    if (!file || !scheduleId) return;
    setUploading(true);
    try {
      const data = await assessmentAPI.upload(scheduleId, file);
      setAssessment(data);
      toast({ title: 'Assessment uploaded', description: data.assessmentFileName });
      onCandidateUpdated?.();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.response?.data?.message || 'Could not upload assessment file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!scheduleId) return;
    try {
      const response = await assessmentAPI.download(scheduleId);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'assessment';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.response?.data?.message || 'Could not download assessment file',
        variant: 'destructive',
      });
    }
  };

  const handleMarkReceived = async () => {
    if (!scheduleId) return;
    setMarkingReceived(true);
    try {
      const data = await assessmentAPI.markReceived(scheduleId);
      setAssessment(data);
      toast({
        title: 'Marked as received',
        description: `${formatInterviewTypeLabel(interview?.interviewType)} - Received`,
      });
      onCandidateUpdated?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Could not mark assessment as received',
        variant: 'destructive',
      });
    } finally {
      setMarkingReceived(false);
    }
  };

  const canMarkReceived = hasFile && String(phase || '').toUpperCase() === 'AWAITING';
  const canAssignReviewers = ['RECEIVED', 'UNDER_REVIEW'].includes(String(phase || '').toUpperCase());
  const canRemoveReviewers = canAssignReviewers && String(phase || '').toUpperCase() !== 'COMPLETED';

  const handleRemoveReviewer = async () => {
    if (!scheduleId || !reviewerToRemove?.reviewerUserId) return;
    const reviewerUserId = Number(reviewerToRemove.reviewerUserId);
    setRemovingReviewerId(reviewerUserId);
    try {
      const data = await assessmentAPI.removeReviewer(scheduleId, reviewerUserId);
      setAssessment(data);
      toast({
        title: 'Reviewer removed',
        description: `${reviewerToRemove.reviewerName || 'Reviewer'} is no longer assigned.`,
      });
      setReviewerToRemove(null);
      onCandidateUpdated?.();
    } catch (error) {
      toast({
        title: 'Could not remove reviewer',
        description: error.response?.data?.message || 'Failed to remove reviewer',
        variant: 'destructive',
      });
    } finally {
      setRemovingReviewerId(null);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6 pb-6'}>
      {!embedded && isCancelled && (
        <Alert className="border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Interview cancelled</AlertTitle>
          <AlertDescription className="text-red-800">
            This interview was cancelled and will not take place.
          </AlertDescription>
        </Alert>
      )}

      {!embedded && (
        <Card className={cn('overflow-hidden shadow-sm', isCancelled ? 'border-red-100 opacity-90' : 'border-indigo-100')}>
          <div className={cn('h-1 w-full', isCancelled ? 'bg-red-400' : 'bg-gradient-to-r from-indigo-500 to-sky-500')} />
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl text-gray-900">
                {formatInterviewTypeLabel(interview?.interviewType)}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {isAssessment && (
                  <Badge variant="outline" className={phaseMeta.className}>{phaseMeta.label}</Badge>
                )}
                <Badge variant="outline" className={statusMeta.className}>
                  {statusMeta.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {!isAssessment && (
              <DetailField icon={User} label="Interviewer" iconClassName="text-indigo-600">
                {interviewerName}
                {interviewerRole && (
                  <span className="text-muted-foreground"> · {interviewerRole}</span>
                )}
              </DetailField>
            )}
            <DetailField icon={Calendar} label={isAssessment ? 'Due' : 'Scheduled'} iconClassName="text-indigo-600">
              {startTime
                ? (endTime ? formatDateTimeRange(startTime, endTime) : formatDateTime(startTime))
                : '—'}
            </DetailField>
            <DetailField icon={UserCheck} label="Interview Coordinator" iconClassName="text-indigo-600">
              {coordinatorName}
            </DetailField>
            {candidate?.targetDesignationName && (
              <DetailField icon={Briefcase} label="Role" iconClassName="text-indigo-600">
                {candidate.targetDesignationName}
              </DetailField>
            )}
            {isCompleted && interview?.interviewCompletedAt && (
              <DetailField icon={Clock} label="Completed" iconClassName="text-emerald-600">
                {formatDateTime(interview.interviewCompletedAt)}
              </DetailField>
            )}
            {interview?.notes && (
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-800">{interview.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAssessment && !isCancelled && (
        <Card className="overflow-hidden border-emerald-100 shadow-sm">
          <CardHeader className="border-b border-emerald-50 bg-emerald-50/40 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg text-slate-900">Assessment submission</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload the completed assessment, mark it received, then assign reviewers.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {assessmentLoading && !assessment ? (
              <InlineLoading label="Loading assessment…" className="py-4" />
            ) : !assessment ? (
              <p className="text-sm text-muted-foreground py-2">Unable to load assessment details.</p>
            ) : (
              <>
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4">
                  {hasFile ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{fileName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {assessment?.assessmentFileSize
                            ? `${Math.round(assessment.assessmentFileSize / 1024)} KB`
                            : 'Uploaded'}
                          {assessment?.assessmentUploadedAt
                            ? ` · ${formatDateTime(assessment.assessmentUploadedAt)}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                          <Download className="w-4 h-4" /> Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-1.5"
                        >
                          {!uploading && <Upload className="w-4 h-4" />}
                          Replace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-4 gap-3">
                      <Upload className="w-8 h-8 text-emerald-600" />
                      <p className="text-sm text-slate-700">Upload the candidate&apos;s completed assessment file</p>
                      <Button
                        size="sm"
                        loading={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {!uploading && <Upload className="w-4 h-4" />}
                        Choose file
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleMarkReceived}
                    loading={markingReceived}
                    disabled={!canMarkReceived}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {!markingReceived && <CheckCircle2 className="w-4 h-4" />}
                    Mark as Received
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAssignOpen(true)}
                    disabled={!canAssignReviewers}
                    className="gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    Assign reviewers
                  </Button>
                </div>

                {reviewers.length > 0 && (
                  <div className="rounded-xl border p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reviewers ({reviewers.length})
                    </p>
                    {reviewers.map((r) => {
                      const canRemove = canRemoveReviewers && !r.feedbackSubmitted;
                      const isRemoving = removingReviewerId === Number(r.reviewerUserId);
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{r.reviewerName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[r.designationName, r.departmentName].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className={r.feedbackSubmitted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-600'}>
                              {r.feedbackSubmitted ? 'Completed' : 'Pending'}
                            </Badge>
                            {canRemove && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                title={`Remove ${r.reviewerName || 'reviewer'}`}
                                aria-label={`Remove ${r.reviewerName || 'reviewer'}`}
                                disabled={Boolean(removingReviewerId)}
                                loading={isRemoving}
                                onClick={() => setReviewerToRemove(r)}
                              >
                                {!isRemoving && <X className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">
                {isAssessment ? 'Reviewer feedback' : 'Interview feedback'}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAssessment
                  ? 'Feedback from assigned reviewers appears here after they submit.'
                  : isCompleted
                    ? 'Submitted responses from the interviewer after the session.'
                    : isCancelled
                      ? 'No feedback — this interview was cancelled.'
                      : 'Feedback will appear here once the interview is completed.'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {isCancelled && (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-5 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p>This round was cancelled, so no feedback was collected.</p>
            </div>
          )}

          {!isCompleted && !isCancelled && !isAssessment && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50/80 to-white px-6 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                {isScheduled ? <Hourglass className="h-6 w-6" /> : <ClipboardList className="h-6 w-6" />}
              </div>
              <p className="text-sm font-medium text-sky-900">Waiting for interview completion</p>
              <p className="mt-1 max-w-sm text-sm text-sky-700/80">
                The interviewer&apos;s feedback form and ratings will show up here after the session ends.
              </p>
            </div>
          )}

          {isAssessment && !isCancelled && reviewers.some((r) => r.feedbackSubmitted) && (
            feedbackLoading ? (
              <LoadingState label="Loading feedback…" size="lg" spinnerClassName="text-indigo-500" />
            ) : feedbackResponse ? (
              <FeedbackResponseDisplay
                form={feedbackForm}
                responses={feedbackResponse?.responses || {}}
                submittedAt={feedbackResponse?.submittedAt}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Open individual reviewer status above. Full multi-reviewer aggregation can be viewed as each submits.
              </p>
            )
          )}

          {isAssessment && !isCancelled && !reviewers.some((r) => r.feedbackSubmitted) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-muted-foreground">
              {canAssignReviewers
                ? 'No reviewer feedback submitted yet.'
                : 'Mark the assessment as received and assign reviewers to collect feedback.'}
            </div>
          )}

          {isCompleted && !isAssessment && (
            <>
              {feedbackLoading ? (
                <LoadingState label="Loading feedback…" size="lg" spinnerClassName="text-indigo-500" />
              ) : !feedbackResponse ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
                  <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">No feedback on record</p>
                    <p className="mt-1 text-amber-800/90">
                      The interview was marked complete but no feedback form was submitted.
                    </p>
                  </div>
                </div>
              ) : (
                <FeedbackResponseDisplay
                  form={feedbackForm}
                  responses={feedbackResponse?.responses || {}}
                  submittedAt={feedbackResponse?.submittedAt}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AssignAssessmentReviewersDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        scheduleId={scheduleId}
        alreadyAssignedIds={reviewers.map((r) => r.reviewerUserId)}
        onAssigned={() => {
          loadAssessment();
          onCandidateUpdated?.();
        }}
      />

      <ConfirmDialog
        open={Boolean(reviewerToRemove)}
        onOpenChange={(next) => {
          if (!next && !removingReviewerId) setReviewerToRemove(null);
        }}
        title="Remove reviewer?"
        description={
          reviewerToRemove
            ? `${reviewerToRemove.reviewerName || 'This reviewer'} will be unassigned from this assessment and will no longer be able to review it.`
            : undefined
        }
        confirmLabel="Remove"
        loading={Boolean(removingReviewerId)}
        onConfirm={handleRemoveReviewer}
      />
    </div>
  );
};

export default InterviewDetailTab;
