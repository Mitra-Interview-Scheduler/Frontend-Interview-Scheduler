import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquareText, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import  candidateAPI from '@/services/candidateAPI';

import { closingReasonAPI } from '@/services/closingReasonAPI';
import { getCandidateClosingSteps, getCandidateStatusLabel } from '@/lib/candidateSteps';
import { getNextStepsConfig } from '@/lib/nextStepsConfig';
import { ClosingStatus } from '@/lib/statusConstants';
import CandidateInterviewSchedulePage from './CandidateInterviewSchedulePage';
import { cn } from '@/lib/utils';


function CandidateNextStepsCard({
  candidate,
  steps = [],
  closingSteps = [],
  onUpdated,
  initiallyOpen = true,
}) {
  const { prompt, actions } = getNextStepsConfig(candidate?.status, steps);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [closeStatus, setCloseStatus] = useState(ClosingStatus.REJECTED);
  const [closeReasonId, setCloseReasonId] = useState('');
  const [closeComment, setCloseComment] = useState('');
  const [closingReasons, setClosingReasons] = useState([]);
  const [reasonsLoading, setReasonsLoading] = useState(false);
  const [isInterviewSchedulePageOpen, setIsInterviewSchedulePageOpen] = useState(false);

  useEffect(() => {
    if (!showRejectDialog) return undefined;

    let active = true;
    setReasonsLoading(true);
    setCloseReasonId('');
    setCloseComment('');

    closingReasonAPI.getActiveReasons()
      .then((reasons) => {
        if (!active) return;
        const list = Array.isArray(reasons) ? reasons : [];
        setClosingReasons(list);
        if (list.length > 0) {
          setCloseReasonId(String(list[0].id));
        }
      })
      .catch(() => {
        if (active) setClosingReasons([]);
      })
      .finally(() => {
        if (active) setReasonsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showRejectDialog]);

  const handleSetStatus = async (status, addPipelineRound = false) => {
    if (!candidate?.id) return;

    setSaving(true);
    try {
      await candidateAPI.updateCandidate(candidate.id, {
        status,
        addPipelineRound,
      });
      toast({ title: 'Status updated', description: `Candidate moved to ${getCandidateStatusLabel(steps, status)}.` });
      onUpdated?.();
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err.response?.data?.message || err.message || 'Could not update candidate status.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActionClick = (action) => {
    if (action.actionType === 'SCHEDULE') {
      setIsInterviewSchedulePageOpen(true);
      return;
    }
    handleSetStatus(action.actionType, Boolean(action.addPipelineRound));
  };

  const handleReject = () => {
    if (!candidate?.id || saving) return;
    setShowRejectDialog(true);
  };

  const CLOSE_STATUS_OPTIONS = closingSteps.length > 0
    ? closingSteps
    : getCandidateClosingSteps(steps);

  const isSelectedClose = closeStatus === ClosingStatus.SELECTED;
  const canConfirmClose = isSelectedClose
    ? true
    : Boolean(closeReasonId) && closeComment.trim().length > 0;

  const confirmReject = async () => {
    if (!candidate?.id || !canConfirmClose) return;
    setSaving(true);
    try {
      const payload = {
        status: closeStatus,
        comment: closeComment.trim() || undefined,
      };
      if (!isSelectedClose && closeReasonId) {
        payload.closingReasonId = Number(closeReasonId);
      }
      await candidateAPI.closeCandidate(candidate.id, payload);
      toast({
        title: 'Application updated',
        description: `Candidate moved to ${getCandidateStatusLabel(steps, closeStatus)}.`,
      });
      onUpdated?.();
      setShowRejectDialog(false);
      setCloseComment('');
      setCloseReasonId('');
      setCloseStatus(ClosingStatus.REJECTED);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err.response?.data?.message || err.message || 'Could not close the application.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquareText className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Steps</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="ml-2 p-1 rounded hover:bg-slate-100"
                title={open ? 'Collapse' : 'Expand'}
              >
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {open && (
            <div className="mt-2 space-y-2">
              {prompt ? (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 border border-slate-200 line-clamp-3">
                  {prompt}
                </p>
              ) : (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500 border border-dashed border-slate-200">
                  No prompt provided.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant={action.variant || 'default'}
                    size="sm"
                    className={cn('h-8', action.className)}
                    onClick={() => handleActionClick(action)}
                    disabled={saving || !candidate?.id}
                    title={action.label}
                  >
                    <span className="truncate">{action.label}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                  onClick={handleReject}
                  disabled={saving || !candidate?.id}
                  title="Close This Application"
                >
                  Close This Application
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-xl w-full">
          <DialogHeader>
            <DialogTitle>Close Application</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Select the final status for this application</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CLOSE_STATUS_OPTIONS.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-500 rounded-md border border-dashed border-slate-200 px-3 py-4">
                      No visible closing stages are configured.
                    </p>
                  ) : CLOSE_STATUS_OPTIONS.map((statusOption) => {
                    const active = closeStatus === statusOption.key;
                    return (
                      <button
                        key={statusOption.key}
                        type="button"
                        onClick={() => {
                          setCloseStatus(statusOption.key);
                          if (statusOption.key === ClosingStatus.SELECTED) {
                            setCloseReasonId('');
                          }
                        }}
                        className={`rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? `ring-2 ring-blue-500 ${statusOption.badgeClass}`
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-sm font-semibold">{statusOption.label}</div>
                        <div className="text-xs text-slate-500">{statusOption.key.replace(/_/g, ' ')}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isSelectedClose && (
                <div>
                  <Label className="text-sm">Closing reason *</Label>
                  <Select
                    value={closeReasonId}
                    onValueChange={setCloseReasonId}
                    disabled={reasonsLoading || closingReasons.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={reasonsLoading ? 'Loading reasons...' : 'Select a reason'} />
                    </SelectTrigger>
                    <SelectContent>
                      {closingReasons.map((reason) => (
                        <SelectItem key={reason.id} value={String(reason.id)}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-sm">{isSelectedClose ? 'Comment' : 'Reason / Comment *'}</Label>
                <Textarea
                  value={closeComment}
                  onChange={(e) => setCloseComment(e.target.value)}
                  rows={4}
                  placeholder={isSelectedClose
                    ? 'Add an optional note about this selection'
                    : 'Provide details for this closing decision'}
                  className="mt-1"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={saving || !candidate?.id || !canConfirmClose}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Apply Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CandidateInterviewSchedulePage
        open={isInterviewSchedulePageOpen}
        candidate={candidate}
        onOpenChange={setIsInterviewSchedulePageOpen}
        onScheduled={onUpdated}
      />
    </>
  );
}

export default CandidateNextStepsCard;
