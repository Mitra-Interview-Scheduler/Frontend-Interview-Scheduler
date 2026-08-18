import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function SectionEditButton({ label, onClick, disabled = false, className = '' }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 w-8 p-0 shrink-0 text-slate-500 hover:text-blue-700 hover:bg-blue-50',
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

export function CandidateFieldEditDialog({
  open,
  title,
  description,
  label,
  initialValue = '',
  placeholder,
  rows = 6,
  saving = false,
  onClose,
  onSave,
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(initialValue || '');
  }, [open, initialValue]);

  const handleSubmit = () => {
    if (saving) return;
    onSave(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !saving && !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2 py-2">
          {label ? <Label htmlFor="candidate-field-editor">{label}</Label> : null}
          <Textarea
            id="candidate-field-editor"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={saving}
            className="min-h-[160px] resize-y"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} className="min-w-[90px]">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
