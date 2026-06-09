import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';

import { departmentAPI } from '@/services/departmentAPI';
import { tierAPI } from '@/services/tierAPI'; 
import { designationAPI } from '@/services/designationAPI'; 
import { candidateAPI } from '@/services/candidateAPI'; 

import COUNTRIES from '/src/data/countries.json';

const DEFAULT_STATE = {
  isProjectSpecific: 'no',
  projectName: '',
  region: '',
  engagementType: 'FULL_TIME',
  duration: '',
  targetStartDate: '',
  profileSource: 'Direct Applicant',
  referrerName: '',
  screenedBy: '', 
  feedback: '',
  natureOfRecruitment: '',
  roleStretch: '',
  specialNotes: '',
  departmentId: '',
  tierId: '',
  designationId: '', 
  modifiedAt: '',
};

const ScreeningTab = ({ candidate, readOnly = false, handleInputChange, formData, currentUser }) => {
  const loggedInUser = currentUser?.name || '';

  const [localFormData, setLocalFormData] = useState(() => ({
    ...DEFAULT_STATE,
    screenedBy: loggedInUser
  }));
  const [pristineData, setPristineData] = useState(() => ({
    ...DEFAULT_STATE,
    screenedBy: loggedInUser
  }));
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [desigs, setDesigs] = useState([]);

  // Normalize incoming backend data shapes to match localized UI format requirements
  const normalizeData = useCallback((rawData) => {
    if (!rawData) return { ...DEFAULT_STATE, screenedBy: loggedInUser };
    return {
      ...DEFAULT_STATE,
      ...rawData,
      isProjectSpecific: rawData.isProjectSpecific === true || rawData.isProjectSpecific === 'yes' ? 'yes' : 'no',
      engagementType: rawData.engagementType ? rawData.engagementType.toUpperCase() : 'FULL_TIME',
      departmentId: rawData.departmentId?.toString() || '',
      tierId: rawData.tierId?.toString() || '',
      designationId: rawData.designationId?.toString() || '',
      duration: rawData.duration?.toString() || '',
    };
  }, [loggedInUser]);

  // Derived tracking variables
  const isDirty = useMemo(() => JSON.stringify(localFormData) !== JSON.stringify(pristineData), [localFormData, pristineData]);
  const isProjectRequired = localFormData.isProjectSpecific === 'yes';
  const isDurationRequired = localFormData.engagementType && localFormData.engagementType !== 'FULL_TIME';

  // Dynamic Progress Bar Calculations
  const screeningProgress = useMemo(() => {
    // 1. Core mandatory fields added here based on your requirements
    const baseRequiredFields = [
      'isProjectSpecific', 
      'engagementType', 
      'region', 
      'profileSource', 
      'natureOfRecruitment', 
      'roleStretch'
    ];
    
    // 2. Conditionally append required fields based on layout triggers
    if (isProjectRequired) {
      baseRequiredFields.push('departmentId', 'tierId', 'designationId', 'projectName');
    }
    if (isDurationRequired) {
      baseRequiredFields.push('duration');
    }
    if (localFormData.profileSource === 'Referral') {
      baseRequiredFields.push('referrerName');
    }

    // 3. Count completed tracking points
    const completedFieldsCount = baseRequiredFields.filter(field => {
      const val = localFormData[field];
      return val !== undefined && val !== null && String(val).trim() !== '';
    }).length;

    const totalFieldsCount = baseRequiredFields.length;
    const percentage = totalFieldsCount > 0 ? Math.round((completedFieldsCount / totalFieldsCount) * 100) : 0;

    return {
      percentage,
      completed: completedFieldsCount,
      total: totalFieldsCount
    };
  }, [localFormData, isProjectRequired, isDurationRequired]);

  // Dynamic structural dependency triggers
  const loadTiersForDept = useCallback(async (deptId) => {
    if (!deptId) { setTiers([]); setDesigs([]); return; }
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId, 10));
      setTiers((data || []).sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { 
      console.error("Failed loading tiers:", e); 
      setTiers([]); 
    }
  }, []);

  const loadDesignsForTier = useCallback(async (tierId) => {
    if (!tierId) { setDesigs([]); return; }
    try {
      const data = await designationAPI.getDesignationsByTier(parseInt(tierId, 10));
      setDesigs((data || []).sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (e) { 
      console.error("Failed loading designations:", e); 
      setDesigs([]); 
    }
  }, []);

  // Sync structural updates when parents inject an exterior form schema downstream
  useEffect(() => {
    if (formData) {
      const normalizedForm = normalizeData(formData);
      setLocalFormData(normalizedForm);
      setPristineData(normalizedForm);
      if (normalizedForm.departmentId) loadTiersForDept(normalizedForm.departmentForm.departmentId);
      if (normalizedForm.tierId) loadDesignsForTier(normalizedForm.tierId);
    }
  }, [formData, normalizeData, loadTiersForDept, loadDesignsForTier]);

  // Initial lookup execution context
  useEffect(() => {
    const fetchScreeningAndMetadata = async () => {
      if (!candidate?.id || formData) return;
      setIsLoading(true);
      try {
        const deptData = await departmentAPI.getAllDepartments();
        setDepartments(deptData || []);

        const response = await candidateAPI.getCandidateScreeningFile(candidate.id);
        const loadedData = normalizeData(response);
        
        setLocalFormData(loadedData);
        setPristineData(loadedData);

        if (loadedData.departmentId) loadTiersForDept(loadedData.departmentId);
        if (loadedData.tierId) loadDesignsForTier(loadedData.tierId);
      } catch (e) {
        if (e.response?.status === 404) {
          const freshState = { ...DEFAULT_STATE, screenedBy: loggedInUser };
          setLocalFormData(freshState);
          setPristineData(freshState);
        } else {
          console.error("Failed to fetch candidate metadata registers:", e);
          toast({
            variant: "destructive",
            title: "Data Retrieval Error",
            description: "Could not load existing screening setups for this workflow assignment."
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchScreeningAndMetadata();
  }, [candidate?.id, formData, loggedInUser, normalizeData, loadTiersForDept, loadDesignsForTier]);

  // Sync session metrics
  useEffect(() => {
    if (loggedInUser && !localFormData.screenedBy) {
      setLocalFormData(prev => ({ ...prev, screenedBy: loggedInUser }));
    }
  }, [loggedInUser, localFormData.screenedBy]);

  const updateField = (field, value) => {
    if (readOnly || isSubmitting || isLoading) return;

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }

    setLocalFormData(prev => ({ ...prev, [field]: value }));
    if (handleInputChange) {
      handleInputChange(field, value);
    }
  };

  const handleEngagementTypeChange = (value) => {
    updateField('engagementType', value);
    if (value === 'FULL_TIME' || !value) {
      updateField('duration', '');
      setErrors(prev => ({ ...prev, duration: false }));
    }
  };

  const handleDepartmentChange = (deptId) => {
    updateField('departmentId', deptId);
    updateField('tierId', '');         
    updateField('designationId', '');  
    setTiers([]);
    setDesigs([]);
    loadTiersForDept(deptId);                
  };

  const handleTierChange = (tierId) => {
    updateField('tierId', tierId);
    updateField('designationId', '');  
    setDesigs([]);
    loadDesignsForTier(tierId);              
  };

  const handleSubmitData = async () => {
    const newErrors = {};

    // Validate global base required fields
    if (!localFormData.engagementType) newErrors.engagementType = true;
    if (!localFormData.region) newErrors.region = true;
    if (!localFormData.profileSource) newErrors.profileSource = true;
    if (!localFormData.natureOfRecruitment) newErrors.natureOfRecruitment = true;
    if (!localFormData.roleStretch) newErrors.roleStretch = true;

    // Validate project specific conditional logic
    if (isProjectRequired) {
      if (!localFormData.departmentId) newErrors.departmentId = true;
      if (!localFormData.tierId) newErrors.tierId = true;
      if (!localFormData.designationId) newErrors.designationId = true;
      if (!localFormData.projectName?.trim()) newErrors.projectName = true;
    }

    if (isDurationRequired && !localFormData.duration) {
      newErrors.duration = true;
    }

    if (localFormData.profileSource === 'Referral' && !localFormData.referrerName?.trim()) {
      newErrors.referrerName = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        variant: "destructive",
        title: "Validation Check Failed",
        description: "Please complete all mandatory highlighted fields before saving."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...localFormData,
        isProjectSpecific: localFormData.isProjectSpecific === 'yes',
        departmentId: localFormData.isProjectSpecific === 'yes' ? (parseInt(localFormData.departmentId, 10) || null) : null,
        tierId: localFormData.isProjectSpecific === 'yes' ? (parseInt(localFormData.tierId, 10) || null) : null,
        designationId: localFormData.isProjectSpecific === 'yes' ? (parseInt(localFormData.designationId, 10) || null) : null,
        duration: isDurationRequired ? (parseInt(localFormData.duration, 10) || null) : null,
        modifiedAt: new Date().toISOString(),
        screenedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).firstName + ' ' + JSON.parse(localStorage.getItem('user')).lastName : 'Unknown User',
      };

      const savedData = await candidateAPI.saveCandidateScreeningFile(candidate.id, payload);
      const updatedPristineState = normalizeData(savedData);
      
      setPristineData(updatedPristineState);
      setLocalFormData(updatedPristineState);

      toast({
        title: "Changes Captured Successfully",
        description: "Screening requirements have updated across target business registries.",
      });
    } catch (err) {
      console.error("Transmission breakdown during update syncing:", err);
      toast({
        variant: "destructive",
        title: "Transmission Breakdown",
        description: err.response?.data?.message || "An unexpected error occurred while saving configuration variables."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 pb-10 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-gray-500 font-medium">Loading Candidate Screening Profiles...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      {/* SCREENING PROGRESS BAR HEADER */}
      <Card className="border border-blue-100 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
                  Mandatory Screening Progress
                </span>
                {screeningProgress.percentage === 100 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                  </motion.div>
                )}
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {screeningProgress.percentage}% Complete
              </span>
            </div>
            
            {/* Track Background */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/40">
              {/* Dynamic Animated Status Gauge */}
              <motion.div 
                className={`h-full rounded-full ${
                  screeningProgress.percentage === 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${screeningProgress.percentage}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium pt-0.5">
              <span>Required structural data points complete</span>
              <span>{screeningProgress.completed} of {screeningProgress.total} fields filled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: Basic Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
          <h3 className="text-sm font-semibold text-blue-900">Basic Information</h3>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Is this project specific interview?</Label>
              <Select value={localFormData.isProjectSpecific} onValueChange={(value) => updateField('isProjectSpecific', value)} disabled={readOnly || isSubmitting}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isProjectRequired && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2 border-t border-dashed border-gray-100"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={`text-xs font-medium transition-colors ${errors.departmentId ? 'text-red-600' : 'text-gray-600'}`}>
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select value={localFormData.departmentId} onValueChange={handleDepartmentChange} disabled={readOnly || isSubmitting}>
                    <SelectTrigger className={`h-9 transition-colors ${errors.departmentId ? 'border-red-500 focus:ring-red-500' : ''}`}>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={`text-xs font-medium transition-colors ${errors.tierId ? 'text-red-600' : 'text-gray-600'}`}>
                    Tier <span className="text-red-500">*</span>
                  </Label>
                  <Select value={localFormData.tierId} onValueChange={handleTierChange} disabled={readOnly || !localFormData.departmentId || isSubmitting}>
                    <SelectTrigger className={`h-9 transition-colors ${errors.tierId ? 'border-red-500 focus:ring-red-500' : ''}`}>
                      <SelectValue placeholder="Select Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name || `Tier ${t.tierOrder}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={`text-xs font-medium transition-colors ${errors.designationId ? 'text-red-600' : 'text-gray-600'}`}>
                    Project Role <span className="text-red-500">*</span>
                  </Label>
                  <Select value={localFormData.designationId} onValueChange={(value) => updateField('designationId', value)} disabled={readOnly || !localFormData.tierId || isSubmitting}>
                    <SelectTrigger className={`h-9 transition-colors ${errors.designationId ? 'border-red-500 focus:ring-red-500' : ''}`}>
                      <SelectValue placeholder="Select Project Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {desigs.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={`text-xs font-medium transition-colors ${errors.projectName ? 'text-red-600' : 'text-gray-600'}`}>
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    placeholder="Enter project name" 
                    value={localFormData.projectName || ''} 
                    onChange={(e) => updateField('projectName', e.target.value)} 
                    className={`h-9 transition-colors ${errors.projectName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                    readOnly={readOnly || isSubmitting} 
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className={`text-xs font-medium transition-colors ${errors.engagementType ? 'text-red-600' : 'text-gray-600'}`}>
                Engagement Type <span className="text-red-500">*</span>
              </Label>
              <Select value={localFormData.engagementType} onValueChange={handleEngagementTypeChange} disabled={readOnly || isSubmitting}>
                <SelectTrigger className={`h-9 transition-colors ${errors.engagementType ? 'border-red-500 focus:ring-red-500' : ''}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={`text-xs font-medium transition-colors ${errors.region ? 'text-red-600' : 'text-gray-600'}`}>
                Region / Country <span className="text-red-500">*</span>
              </Label>
              <Select value={localFormData.region} onValueChange={(value) => updateField('region', value)} disabled={readOnly || isSubmitting}>
                <SelectTrigger className={`h-9 transition-colors ${errors.region ? 'border-red-500 focus:ring-red-500' : ''}`}><SelectValue placeholder="Select a country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {isDurationRequired && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <Label className={`text-xs font-medium transition-colors ${errors.duration ? 'text-red-600' : 'text-gray-600'}`}>
                    Duration (in months) <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    type="number" 
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                    }}
                    placeholder="Enter duration (Required)"
                    value={localFormData.duration || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || Number(val) >= 0) updateField('duration', val);
                    }} 
                    className={`h-9 transition-colors ${errors.duration ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'}`} 
                    readOnly={readOnly || isSubmitting} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Target Start Date</Label>
              <Input type="date" value={localFormData.targetStartDate || ''} onChange={(e) => updateField('targetStartDate', e.target.value)} className="h-9" readOnly={readOnly || isSubmitting} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Profile Source */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
          <h3 className="text-sm font-semibold text-blue-900">Profile Source</h3>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className={`text-xs font-medium transition-colors ${errors.profileSource ? 'text-red-600' : 'text-gray-600'}`}>
              How did Mitra get the candidate profile? <span className="text-red-500">*</span>
            </Label>
            <Select value={localFormData.profileSource} onValueChange={(value) => updateField('profileSource', value)} disabled={readOnly || isSubmitting}>
              <SelectTrigger className={`h-9 transition-colors ${errors.profileSource ? 'border-red-500 focus:ring-red-500' : ''}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct Applicant">Direct Applicant</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Job Portal">Job Portal</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Recruiter">Recruiter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {localFormData.profileSource === 'Referral' && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label className={`text-xs font-medium transition-colors ${errors.referrerName ? 'text-red-600' : 'text-gray-600'}`}>
                Referrer Name <span className="text-red-500">*</span>
              </Label>
              <Input 
                placeholder="Enter referrer name" 
                value={localFormData.referrerName || ''} 
                onChange={(e) => updateField('referrerName', e.target.value)} 
                className={`h-9 transition-colors ${errors.referrerName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                readOnly={readOnly || isSubmitting} 
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: Recruitment Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
          <h3 className="text-sm font-semibold text-blue-900">Recruitment Settings</h3>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className={`text-xs font-medium transition-colors ${errors.natureOfRecruitment ? 'text-red-600' : 'text-gray-600'}`}>
              Nature of Recruitment <span className="text-red-500">*</span>
            </Label>
            <Select value={localFormData.natureOfRecruitment} onValueChange={(value) => updateField('natureOfRecruitment', value)} disabled={readOnly || isSubmitting}>
              <SelectTrigger className={`h-9 transition-colors ${errors.natureOfRecruitment ? 'border-red-500 focus:ring-red-500' : ''}`}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New Position">New Position</SelectItem>
                <SelectItem value="Replacement">Replacement</SelectItem>
                <SelectItem value="Expansion">Expansion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={`text-xs font-medium transition-colors ${errors.roleStretch ? 'text-red-600' : 'text-gray-600'}`}>
              Role Stretch / De-stretch Acceptable? <span className="text-red-500">*</span>
            </Label>
            <Select value={localFormData.roleStretch} onValueChange={(value) => updateField('roleStretch', value)} disabled={readOnly || isSubmitting}>
              <SelectTrigger className={`h-9 transition-colors ${errors.roleStretch ? 'border-red-500 focus:ring-red-500' : ''}`}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Limited">Limited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">Special Notes by delivery/pre-sales team</Label>
            <Textarea placeholder="Enter special notes" value={localFormData.specialNotes || ''} onChange={(e) => updateField('specialNotes', e.target.value)} className="min-h-20 resize-none" readOnly={readOnly || isSubmitting} />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Profile Screening */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
          <h3 className="text-sm font-semibold text-blue-900">Profile Screening</h3>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Screened By</Label>
              <Input 
                value={localFormData.screenedBy} 
                className="h-9 bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200 select-none font-medium" 
                readOnly 
              />
            </div>

            <div className="text-xs text-gray-400 font-medium px-1 pb-2.5">
              <span>Last Saved State: {localFormData.modifiedAt ? new Date(localFormData.modifiedAt).toLocaleString() : "Not modified yet"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">Feedback / Remarks</Label>
            <Textarea placeholder="Enter feedback or remarks" value={localFormData.feedback || ''} onChange={(e) => updateField('feedback', e.target.value)} className="min-h-20 resize-none" readOnly={readOnly || isSubmitting} />
          </div>
        </CardContent>
      </Card>

      {/* Floating Save Controls */}
      <AnimatePresence>
        {isDirty && !readOnly && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
          >
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl p-3 shadow-xl flex items-center justify-between gap-6">
              <div className="flex flex-col pl-2">
                <span className="text-xs font-semibold text-gray-800">Unsaved Session Adjustments</span>
                <span className="text-[10px] text-gray-400 font-medium">You have edited field variables</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setLocalFormData(pristineData);
                    setErrors({});
                  }}
                  disabled={isSubmitting}
                  className="h-9 text-xs border-gray-200 text-gray-500 hover:bg-gray-50 font-medium"
                >
                  Discard
                </Button>
                
                <Button 
                  size="sm" 
                  onClick={handleSubmitData}
                  disabled={isSubmitting}
                  className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-sm shadow-blue-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ScreeningTab;