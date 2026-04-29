import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { CalendarClock, User, Briefcase, Award, TrendingUp, Mail, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function CandidateInterviewSchedulePage({ open, candidate, onOpenChange }) {
  const navigate = useNavigate();

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [availabilityDate, setAvailabilityDate] = useState(getTodayDate());

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setAvailabilityDate(getTodayDate()); // Reset to current date-time
    }
  }, [open]);

  if (!candidate) return null;

  // Lock past dates
  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    // const hours = String(now.getHours()).padStart(2, '0');
    // const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };



  

  const handleGoToAvailability = () => {
    if (!availabilityDate) return;

    navigate('/hr/availability', {
      state: {
        filterData: {
          startDateTime: availabilityDate,
          departmentId: candidate.departmentId,
          minTierOrder: candidate.tierId,
          minLevelOrder: candidate.targetDesignationId,
          candidateId: candidate.id,
          candidateName: candidate.name
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CHANGED: 'sm:max-w-[600px]' (increased width) 
        and added 'min-h-[400px]' for better vertical presence 
      */}
      <DialogContent className="sm:max-w-[600px] min-h-[500px] p-0 overflow-hidden border-t-8 border-t-primary">
        <div className="p-8 flex flex-col h-full">
          <DialogHeader className="mb-8">
            <DialogTitle className="flex items-center gap-4 text-3xl font-extrabold tracking-tight">
              <CalendarClock className="w-10 h-10 text-primary" />
              Schedule Interview
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground pt-2">
              Please verify the candidate's professional profile and set their interview availability window to find matching interviewers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 flex-grow">
            {/* Candidate Identity Card - Enhanced Spacing */}
            <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          

              <div className="p-6 grid grid-cols-2 gap-6 bg-white">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Name</Label>
                  <p className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    {candidate.name || 'N/A'}
                  </p>
                </div>



              <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Email</Label>
                  <p className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    {candidate.email || 'N/A'}
                  </p>
                </div>

                
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Department</Label>
                  <p className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    {candidate.departmentName || 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                    Seniority Tier
                  </Label>
                  <p className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    {/* Try both potential property names from your DTO */}
                    {candidate.tierId?.toString()  ? (
                      `Tier ${candidate.tierOrder} - ${ candidate.tierName }`
                    ) : (
                      <span className="text-slate-400 font-normal italic">Not Assigned</span>
                    )}
                  </p>
                </div>
                <div className="col-span-2 space-y-2 pt-4 border-t border-slate-50">
                  <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Target Designation</Label>
                  <p className="text-base font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    {candidate.targetDesignationName} <span className="text-slate-400 font-normal">(Level {candidate.levelOrder})</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="availability" className="text-lg font-bold text-slate-800">
                  Candidate Availability Window
                </Label>
              </div>
              
              <Input
                id="availability"
                type="date"
                min={getTodayDate()}
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="h-14 text-lg border-2 border-slate-200 focus:border-primary focus:ring-primary shadow-sm px-4"
              />
              
              <div className="flex items-start gap-3 text-sm text-blue-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <p>
                  Matching interviewers must be from <strong>{candidate.departmentName || 'the same department'}</strong> and hold a <strong>Tier {candidate.tierOrder}</strong> seniority or higher.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer - Larger Buttons */}
        <DialogFooter className="bg-slate-50 p-8 flex items-center sm:justify-between gap-6 border-t mt-auto">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-base font-medium text-slate-500 hover:text-slate-800 h-12 px-6"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGoToAvailability} 
            disabled={!availabilityDate}
            className="h-12 px-10 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            Find Matching Interviewers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CandidateInterviewSchedulePage;