import React, { useEffect, useState } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InlineLoading } from '@/components/ui/loading';
import { interviewTypeAPI } from '@/services/interviewTypeAPI';
import { toast } from '@/hooks/use-toast';

const DeleteInterviewTypeDialog = ({
  type,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open || !type?.id) {
      setPreview(null);
      setPreviewError('');
      return undefined;
    }

    let active = true;
    setLoadingPreview(true);
    setPreviewError('');

    interviewTypeAPI.getDeletePreview(type.id)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((error) => {
        if (active) {
          setPreview(null);
          setPreviewError(error.response?.data?.message || 'Failed to load delete details');
        }
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });

    return () => { active = false; };
  }, [open, type?.id]);

  const handleDelete = async () => {
    if (!type?.id) return;

    setIsDeleting(true);
    try {
      const result = await interviewTypeAPI.delete(type.id);
      if (result?.action === 'DEACTIVATED') {
        toast({
          title: 'Interview type deactivated',
          description: `${result.label || type.label} is hidden from new scheduling. Existing schedules are unchanged.`,
        });
      } else {
        toast({
          title: 'Interview type deleted',
          description: `${result?.label || type.label} was permanently removed.`,
        });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete interview type',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const inUse = preview?.inUse === true;
  const scheduleCount = Number(preview?.scheduleCount) || 0;
  const busy = loadingPreview || isDeleting;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            {inUse ? (
              <Archive className="w-5 h-5" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            {inUse ? 'Deactivate interview type?' : 'Delete interview type?'}
          </DialogTitle>
          <DialogDescription>
            {loadingPreview
              ? 'Checking whether this type is used in schedules…'
              : previewError
                ? previewError
                : inUse
                  ? 'This type is linked to existing schedules and cannot be permanently removed.'
                  : 'This type is not used anywhere and will be permanently removed.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {type && (
            <div className="space-y-3">
              <div className={`rounded-xl border-2 p-4 ${
                inUse ? 'border-amber-100 bg-amber-50' : 'border-red-100 bg-red-50'
              }`}>
                <p className="font-semibold text-sm text-slate-900">{type.label}</p>
                {type.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{type.description}</p>
                )}
              </div>

              {loadingPreview && (
                <div className="flex items-center justify-center py-4">
                  <InlineLoading label="Loading…" />
                </div>
              )}

              {!loadingPreview && !previewError && preview && (
                <div className={`rounded-xl border p-3 text-sm leading-relaxed ${
                  inUse
                    ? 'border-amber-200 bg-amber-50/80 text-amber-950'
                    : 'border-red-200 bg-red-50/80 text-red-950'
                }`}>
                  {inUse ? (
                    <>
                      Used in <strong>{scheduleCount}</strong> schedule{scheduleCount === 1 ? '' : 's'}.
                      {' '}It will be <strong>deactivated</strong> — hidden from new scheduling, but past and current schedules stay intact.
                    </>
                  ) : (
                    <>
                      Not used in any schedules. It will be <strong>permanently deleted</strong> along with its pipeline mapping. This cannot be undone.
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
            disabled={busy || !!previewError || !preview}
            className="gap-2 min-w-[140px]"
          >
            {inUse ? <Archive className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            {inUse ? 'Deactivate type' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteInterviewTypeDialog;
