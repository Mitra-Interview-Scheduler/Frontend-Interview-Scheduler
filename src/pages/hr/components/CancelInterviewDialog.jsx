// src/pages/hr/components/CancelInterviewDialog.jsx
import React from 'react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

const CancelInterviewDialog = ({
  open,
  onOpenChange,
  cancelTarget,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" /> Cancel Interview
          </DialogTitle>
          <DialogDescription>
            The slot will be immediately restored to <strong>Available</strong> and the interviewer will be notified.
          </DialogDescription>
        </DialogHeader>

        {cancelTarget && (
          <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4 space-y-2">
            <p className="font-semibold text-sm">🔒 Booked Interview</p>
            <p className="text-sm">Interviewer: <strong>{cancelTarget.resource.interviewer}</strong></p>
            {cancelTarget.resource.candidateName && (
              <p className="text-sm">Candidate: <strong>{cancelTarget.resource.candidateName}</strong></p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(cancelTarget.start, 'PPP')} · {format(cancelTarget.start, 'h:mm a')} – {format(cancelTarget.end, 'h:mm a')}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Interview
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cancelling…</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Cancel & Restore Slot</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelInterviewDialog;
