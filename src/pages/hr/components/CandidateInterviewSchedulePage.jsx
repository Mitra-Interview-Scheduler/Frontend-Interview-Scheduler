import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarClock, User, Briefcase, Award, TrendingUp, Mail, AlertCircle, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import DepartmentAPI from '@/services/departmentAPI';

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
  const [interviewType, setInterviewType] = useState('TECHNICAL'); 
  const [hrDepartmentId, setHrDepartmentId] = useState(null);


  const getHrDepartmentId = () => {
    DepartmentAPI.getDepartmentByName('Human Resources')
      .then((data) => {
        setHrDepartmentId(data.id);
      })
      .catch((error) => {
        console.error('Error fetching HR department:', error);
      });
  };

  
  useEffect(() => {
    if (open) {
      getHrDepartmentId();
      setAvailabilityDate(getTodayDate());
      setInterviewType('TECHNICAL');
    }
  }, [open]);

  if (!candidate) return null;

  const handleGoToAvailability = () => {
    if (!availabilityDate || !interviewType) return;

    const filteredData = {
      startDateTime: availabilityDate,
      departmentId: interviewType === 'HR' ? hrDepartmentId : candidate.departmentId,
      minTierOrder: candidate.tierOrder,
      minLevelOrder: interviewType === 'HR' ? null : candidate.levelOrder,
      candidateId: candidate.id,
      candidateName: candidate.name,
      interviewType,
    };

    onOpenChange(false);
    navigate(
      `/hr/availability?candidateId=${candidate.id}&interviewType=${encodeURIComponent(interviewType)}`,
      { state: { filterData: filteredData } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">Schedule Interview</DialogTitle>
              <DialogDescription className="mt-1.5">
                Select a date and interview type to find matching interviewers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="px-6 py-4 space-y-6">
          {/* Candidate Identity Card - Refined UI */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
            <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-6">
              
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Candidate Name</Label>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{candidate.name || 'N/A'}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Email Address</Label>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{candidate.email || 'N/A'}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Department</Label>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{candidate.departmentName || 'N/A'}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Seniority Tier</Label>
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  {candidate.tierId?.toString() ? (
                    <span className="text-slate-900">Tier {candidate.tierOrder} - {candidate.tierName}</span>
                  ) : (
                    <span className="text-slate-400 italic">Not Assigned</span>
                  )}
                </p>
              </div>

              <div className="col-span-2 space-y-1.5 pt-4 border-t border-slate-200">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Target Designation</Label>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  {candidate.targetDesignationName} <span className="text-slate-400 font-normal ml-1">(Level {candidate.levelOrder})</span>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scheduling Form Controls */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="availability" className="text-sm font-semibold text-slate-800">
                  Availability Date
                </Label>
                <Input
                  id="availability"
                  type="date"
                  min={getTodayDate()}
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  className="h-11 text-sm border-slate-200 focus-visible:ring-blue-500 px-3"
                />
              </div>

              {/* Interview Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="interview-type" className="text-sm font-semibold text-slate-800">
                  Interview Type
                </Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger className="h-11 text-sm border-slate-200 focus:ring-blue-500 bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        HR Interview
                      </div>
                    </SelectItem>
                    <SelectItem value="TECHNICAL">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-500" />
                        Technical Interview
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Warning / Rule Banner */}
            <div className="flex items-start gap-3 text-sm text-blue-700 bg-blue-50/80 p-4 rounded-xl border border-blue-100">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" />
              <p className="leading-relaxed">
                {interviewType === 'HR' ? (
                  <>Matching interviewers will be from the <strong className="font-semibold">Human Resources</strong> department.</>
                ) : (
                  <>Matching interviewers must be from <strong className="font-semibold">{candidate.departmentName || 'the same department'}</strong> and hold a <strong className="font-semibold">Tier {candidate.tierOrder}</strong> seniority or higher.</>
                )}
              </p>
            </div>
          </div>
        </DialogBody>

        {/* Action Footer */}
        <DialogFooter className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-sm font-medium border-slate-200 hover:bg-slate-100 h-10 px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGoToAvailability}
            disabled={!availabilityDate || !interviewType}
            className="h-10 px-5 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
          >
            Find Matching Interviewers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CandidateInterviewSchedulePage;