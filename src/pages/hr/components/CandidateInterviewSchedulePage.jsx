import React, { useState, useEffect, useMemo } from 'react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CalendarClock, User, Briefcase, Award, TrendingUp, Mail, AlertCircle, Code, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import DepartmentAPI from '@/services/departmentAPI';
import { departmentUsersAPI } from '@/services/departmentUsersAPI';
import { InterviewType, isHrInterviewType } from '@/lib/statusConstants';
import { useInterviewTypes } from '@/hooks/useInterviewTypes';
import { getSkillIsCore, normalizeSkillAssignment } from '@/lib/technologyHelpers';
import { TechnologyProficiencyBadge } from '@/components/technologyProficiencyUi';
import { interviewTypeAPI } from '@/services/interviewTypeAPI';
import { toast } from '@/hooks/use-toast';

function CandidateInterviewSchedulePage({ open, candidate, onOpenChange }) {
  const navigate = useNavigate();
  const { interviewTypes: availableInterviewTypes } = useInterviewTypes(true);
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [availabilityDate, setAvailabilityDate] = useState(getTodayDate());
  const [interviewType, setInterviewType] = useState(InterviewType.TECHNICAL);
  const [hrDepartmentId, setHrDepartmentId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [coordinatorDepartmentId, setCoordinatorDepartmentId] = useState('');
  const [coordinatorUserId, setCoordinatorUserId] = useState('');
  const [coordinatorUsers, setCoordinatorUsers] = useState([]);
  const [coordinatorUsersLoading, setCoordinatorUsersLoading] = useState(false);
  const [candidateTechnologies, setCandidateTechnologies] = useState([]);


  const loadDepartments = async () => {
    try {
      const data = await DepartmentAPI.getAllDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const getHrDepartmentId = () => {
    DepartmentAPI.getDepartmentByName('Human Resources')
      .then((data) => {
        setHrDepartmentId(data.id);
      })
      .catch((error) => {
        console.error('Error fetching HR department:', error);
      });
  };

  const loadCoordinatorUsers = async (departmentId) => {
    if (!departmentId) {
      setCoordinatorUsers([]);
      return;
    }
    setCoordinatorUsersLoading(true);
    try {
      const data = await departmentUsersAPI.getUsersByDepartment(departmentId);
      setCoordinatorUsers(data || []);
    } catch (error) {
      console.error('Error fetching coordinator users:', error);
      setCoordinatorUsers([]);
    } finally {
      setCoordinatorUsersLoading(false);
    }
  };

  const handleCoordinatorDepartmentChange = (value) => {
    const deptId = value === 'NONE' ? '' : value;
    setCoordinatorDepartmentId(deptId);
    setCoordinatorUserId('');
    loadCoordinatorUsers(deptId);
  };

  useEffect(() => {
    if (!open) return;

    loadDepartments();
    getHrDepartmentId();
    setAvailabilityDate(getTodayDate());
    setInterviewType(InterviewType.TECHNICAL);
    setCoordinatorDepartmentId('');
    setCoordinatorUserId('');
    setCoordinatorUsers([]);
    setCandidateTechnologies(Array.isArray(candidate?.technologies) ? candidate.technologies : []);
  }, [open, candidate?.id, candidate?.technologies]);

  const displayedTechnologies = useMemo(() => {
    const normalized = (candidateTechnologies || [])
      .map(normalizeSkillAssignment)
      .filter((item) => item?.technology?.name);
    return [
      ...normalized.filter((item) => getSkillIsCore(item)),
      ...normalized.filter((item) => !getSkillIsCore(item)),
    ];
  }, [candidateTechnologies]);

  const hasCoreTechnologies = displayedTechnologies.some(getSkillIsCore);

  if (!candidate) return null;

  const handleGoToAvailability = async () => {
    if (!availabilityDate || !interviewType || !candidate?.id) return;

    try {
      const resolved = await interviewTypeAPI.resolveFilters(interviewType, candidate.id);
      const filteredData = {
        startDateTime: availabilityDate,
        departmentId: resolved.departmentIds?.[0] ?? null,
        departmentIds: resolved.departmentIds ?? null,
        minTierOrder: resolved.minTierId ?? null,
        minLevelOrder: resolved.minDesignationLevelInDepartment ?? null,
        minYearsOfExperience: resolved.minYearsOfExperience ?? null,
        technologyIds: resolved.technologyIds?.length ? resolved.technologyIds : null,
        domainIds: resolved.domainIds?.length ? resolved.domainIds : null,
        candidateId: candidate.id,
        candidateName: candidate.name,
        interviewType,
        interviewCoordinatorId: coordinatorUserId ? parseInt(coordinatorUserId, 10) : null,
        interviewCoordinatorDepartmentId: coordinatorDepartmentId
          ? parseInt(coordinatorDepartmentId, 10)
          : null,
      };

      onOpenChange(false);
      navigate(
        `/hr/availability?candidateId=${candidate.id}&interviewType=${encodeURIComponent(interviewType)}`,
        { state: { filterData: filteredData } },
      );
    } catch (error) {
      console.error('Failed to resolve interviewer filters:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resolve interviewer filters for this interview type',
        variant: 'destructive',
      });
    }
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

              <div className="col-span-2 space-y-2 pt-4 border-t border-slate-200">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Technologies</Label>
                {displayedTechnologies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {displayedTechnologies.map((item) => (
                      <TechnologyProficiencyBadge
                        key={item.id ?? item.technology?.id}
                        item={item}
                        isEditing={false}
                        onOpenCorePrompt={() => {}}
                        onRemove={() => {}}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    No technologies listed
                  </p>
                )}
                
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
                    {availableInterviewTypes.length > 0 ? (
                      availableInterviewTypes.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="HR">HR Interview</SelectItem>
                        <SelectItem value="TECHNICAL">Technical Interview</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-800">
                  Coordinator Department <span className="font-normal text-slate-500">(optional)</span>
                </Label>
                <Select
                  value={coordinatorDepartmentId || 'NONE'}
                  onValueChange={handleCoordinatorDepartmentChange}
                >
                  <SelectTrigger className="h-11 text-sm border-slate-200 focus:ring-blue-500 bg-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-800">
                  Interview Coordinator <span className="font-normal text-slate-500">(optional)</span>
                </Label>
                <SearchableSelect
                  value={coordinatorUserId || 'NONE'}
                  onValueChange={(value) => setCoordinatorUserId(value === 'NONE' ? '' : value)}
                  disabled={!coordinatorDepartmentId || coordinatorUsersLoading}
                  className="h-11 text-sm border-slate-200 focus-visible:ring-blue-500 bg-white"
                  label="Coordinator"
                  placeholder={
                    !coordinatorDepartmentId
                      ? 'Select department first'
                      : coordinatorUsersLoading
                        ? 'Loading users...'
                        : 'Select Coordinator'
                  }
                  searchPlaceholder="Search coordinators..."
                  emptyMessage={
                    coordinatorUsers.length === 0
                      ? 'No user found for selected department'
                      : 'No matching users found'
                  }
                  emptyOption={{
                    value: 'NONE',
                    label: !coordinatorDepartmentId
                      ? 'Select department first'
                      : coordinatorUsersLoading
                        ? 'Loading users...'
                        : 'Select Coordinator',
                  }}
                  options={coordinatorUsers.map((user) => ({
                    value: user.id.toString(),
                    label: `${user.fullName} (${user.email})`,
                    keywords: `${user.fullName} ${user.email}`,
                  }))}
                />
                <p className="text-xs text-slate-500">
                  Can be anyone from the selected department who will join and coordinate the interview.
                </p>
              </div>
            </div>

            {/* Warning / Rule Banner */}
            <div className="flex items-start gap-3 text-sm text-blue-700 bg-blue-50/80 p-4 rounded-xl border border-blue-100">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" />
              <p className="leading-relaxed">
                {isHrInterviewType(interviewType) ? (
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