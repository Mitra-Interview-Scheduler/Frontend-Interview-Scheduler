import React, { useState, useEffect } from 'react';
import { format, isSameDay, isBefore } from 'date-fns';
import { Plus, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import TimePicker from '@/components/TimePicker';
import { availabilityAPI } from '@/services/availabilityAPI';
import { toast } from '@/hooks/use-toast';

const AddSlotDialog = ({ 
  isOpen, 
  onOpenChange, 
  selectedDate, 
  defaultStartTime, 
  defaultEndTime, 
  onSuccess,
  getSlotStartError 
}) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync internal state when parent props change (from calendar selection)
  useEffect(() => {
    if (isOpen) {
      setStartTime(defaultStartTime || '');
      setEndTime(defaultEndTime || '');
      setDescription('');
    }
  }, [isOpen, defaultStartTime, defaultEndTime]);

  // Validation logic
  useEffect(() => {
    if (!selectedDate) { setError(null); return; }
    const [sh, sm] = startTime.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(sh, sm, 0, 0);
    
    setError(getSlotStartError(start));
  }, [selectedDate, startTime, getSlotStartError]);

  const handleCreate = async () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const now = new Date();
    
    const start = new Date(selectedDate);
    start.setHours(sh, sm, 0, 0);
    
    const end = new Date(selectedDate);
    end.setHours(eh, em, 0, 0);

    if (end <= start) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newSlot = await availabilityAPI.createAvailabilitySlot({
        startDateTime: start,
        endDateTime: end,
        currentTime: now,
        description: description || null,
      });
      toast({ title: '✓ Time slot added' });
      onSuccess(newSlot); // Pass data back to parent
      onOpenChange(false); // Close dialog
    } catch (err) {
      toast({
        title: 'Failed to add slot',
        description: err.response?.data?.message || 'Conflict with existing availability',
        variant: 'destructive',
      });
    } finally {
              console.log('Creating slot with:', { start, end, description ,currentTime: now})

      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Plus className="w-5 h-5" /> Add Availability Slot
          </DialogTitle>
          <DialogDescription>
            Set your available time range for interviews.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {selectedDate && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold text-sm">Description (Optional)</Label>
            <Input
              placeholder="e.g., Technical Interview"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                     label="Start Time"
                  />
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    label="End Time"
                  />
                </div>
              </div>
        

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleCreate} 
            disabled={!!error || !selectedDate || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
          >
            {isSubmitting ? "Creating..." : "Create Slot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSlotDialog;