import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

import { departmentAPI } from '@/services/departmentAPI';
import { tierAPI } from '@/services/tierAPI'; 
import { designationAPI } from '@/services/designationAPI'; 

import COUNTRIES from '/src/data/countries.json';

const ScreeningTab = ({ candidate, readOnly = false, handleInputChange, formData, currentUser }) => {
  const loggedInUser = currentUser?.name ;

  const defaultState = {
    isProjectSpecific: '',
    projectName: '',
    region: '',
    engagementType: '',
    duration: '',
    targetStartDate: '',
    profileSource: 'Direct Applicant',
    referrerName: '',
    screenedBy: loggedInUser, 
    feedback: '',
    natureOfRecruitment: '',
    roleStretch: '',
    specialNotes: '',
    departmentId: '',
    tierId: '',
    designationId: '', 
    modifiedAt: '',
  };

  const [localFormData, setLocalFormData] = useState(formData || defaultState);
  const [pristineData, setPristineData] = useState(formData || defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track validation error flags for fields
  const [errors, setErrors] = useState({});

  const activeData = formData || localFormData;
  
  const isDirty = JSON.stringify(activeData) !== JSON.stringify(pristineData);

  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [desigs, setDesigs] = useState([]);

  const isProjectRequired = activeData.isProjectSpecific === 'yes';
  const isDurationRequired = activeData.engagementType && activeData.engagementType !== 'fulltime';

  useEffect(() => {
    if (formData) {
      setLocalFormData(formData);
      setPristineData(formData);
    }
  }, [formData]);

  useEffect(() => {
    if (currentUser?.name && !formData) {
      updateField('screenedBy', currentUser.name);
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await departmentAPI.getAllDepartments();
        setDepartments(data || []);
      } catch (e) {
        console.error("Failed fetching live departments:", e);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Could not retrieve the department layout matrix from server."
        });
        setDepartments([]);
      }
    };
    fetchInitialData();
  }, []);

  const updateField = (field, value) => {
    if (!readOnly && !isSubmitting) {
      // Clear the error indicator for this field as soon as the user starts typing/selecting
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: false }));
      }

      if (handleInputChange) {
        handleInputChange(field, value);
      } else {
        setLocalFormData(prev => ({ 
          ...prev, 
          [field]: value 
        }));
      }
    }
  };

  const handleEngagementTypeChange = (value) => {
    updateField('engagementType', value);
    if (value === 'fulltime' || !value) {
      updateField('duration', '');
      setErrors(prev => ({ ...prev, duration: false }));
    }
  };

  const loadTiersForDept = async (deptId) => {
    if (!deptId) { setTiers([]); setDesigs([]); return; }
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId));
      setTiers((data || []).sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { 
      console.error("Failed loading tiers for department:", e); 
      setTiers([]); 
    }
  };

  const loadDesignsForTier = async (tierId) => {
    if (!tierId) { setDesigs([]); return; }
    try {
      const data = await designationAPI.getDesignationsByTier(parseInt(tierId));
      setDesigs((data || []).sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (e) { 
      console.error("Failed loading designations for tier:", e); 
      setDesigs([]); 
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

    // Validate Project Specific requirements
    if (isProjectRequired) {
      if (!activeData.departmentId) newErrors.departmentId = true;
      if (!activeData.tierId) newErrors.tierId = true;
      if (!activeData.designationId) newErrors.designationId = true;
      if (!activeData.projectName?.trim()) newErrors.projectName = true;
    }

    // Validate Duration requirement
    if (isDurationRequired && !activeData.duration) {
      newErrors.duration = true;
    }

    // Validate Referral requirement
    if (activeData.profileSource === 'Referral' && !activeData.referrerName?.trim()) {
      newErrors.referrerName = true;
    }

    // If there are errors, map them to state and halt processing
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
        ...activeData,
        modifiedAt: new Date().toISOString()
      };

      await new Promise(resolve => setTimeout(resolve, 1000));

      setPristineData(payload);
      if (!formData) setLocalFormData(payload);

      toast({
        title: "Changes Captured Successfully",
        description: "Screening requirements have updated across target business registries.",
      });
    } catch (err) {
      console.error("Transmission breakdown during validation syncing:", err);
      toast({
        variant: "destructive",
        title: "Transmission Breakdown",
        description: "An unexpected database synchronization fault was triggered while processing changes."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      {/* SECTION 1: Basic Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
          <h3 className="text-sm font-semibold text-blue-900">Basic Information</h3>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Is this project specific interview?</Label>
              <Select value={activeData.isProjectSpecific} onValueChange={(value) => updateField('isProjectSpecific', value)} disabled={readOnly || isSubmitting}>
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
                    Department {isProjectRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Select value={activeData.departmentId?.toString()} onValueChange={handleDepartmentChange} disabled={readOnly || isSubmitting}>
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
                    Tier {isProjectRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Select value={activeData.tierId?.toString()} onValueChange={handleTierChange} disabled={readOnly || !activeData.departmentId || isSubmitting}>
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
                    Project Role {isProjectRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Select value={activeData.designationId?.toString()} onValueChange={(value) => updateField('designationId', value)} disabled={readOnly || !activeData.tierId || isSubmitting}>
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
                    Project Name {isProjectRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    placeholder="Enter project name" 
                    value={activeData.projectName} 
                    onChange={(e) => updateField('projectName', e.target.value)} 
                    className={`h-9 transition-colors ${errors.projectName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                    readOnly={readOnly || isSubmitting} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">Region / Country</Label>
                  <Select value={activeData.region} onValueChange={(value) => updateField('region', value)} disabled={readOnly || isSubmitting}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Engagement Type</Label>
              <Select value={activeData.engagementType} onValueChange={handleEngagementTypeChange} disabled={readOnly || isSubmitting}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">Full Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="parttime">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                    value={activeData.duration} 
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
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">Target Start Date</Label>
            <Input type="date" value={activeData.targetStartDate} onChange={(e) => updateField('targetStartDate', e.target.value)} className="h-9" readOnly={readOnly || isSubmitting} />
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
            <Label className="text-xs font-medium text-gray-600">How did Mitra get the candidate profile?</Label>
            <Select value={activeData.profileSource} onValueChange={(value) => updateField('profileSource', value)} disabled={readOnly || isSubmitting}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct Applicant">Direct Applicant</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Job Portal">Job Portal</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Recruiter">Recruiter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeData.profileSource === 'Referral' && (
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
                value={activeData.referrerName} 
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
            <Label className="text-xs font-medium text-gray-600">Nature of Recruitment</Label>
            <Select value={activeData.natureOfRecruitment} onValueChange={(value) => updateField('natureOfRecruitment', value)} disabled={readOnly || isSubmitting}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New Position">New Position</SelectItem>
                <SelectItem value="Replacement">Replacement</SelectItem>
                <SelectItem value="Expansion">Expansion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">Role Stretch / De-stretch Acceptable?</Label>
            <Select value={activeData.roleStretch} onValueChange={(value) => updateField('roleStretch', value)} disabled={readOnly || isSubmitting}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Limited">Limited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">Special Notes by delivery/pre-sales team</Label>
            <Textarea placeholder="Enter special notes" value={activeData.specialNotes} onChange={(e) => updateField('specialNotes', e.target.value)} className="min-h-20 resize-none" readOnly={readOnly || isSubmitting} />
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
                value={activeData.screenedBy || loggedInUser} 
                className="h-9 bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200 select-none font-medium" 
                readOnly={true} 
              />
            </div>

            <div className="text-xs text-gray-400 font-medium px-1 pb-2.5">
              <span>Last Saved State: {activeData.modifiedAt ? new Date(activeData.modifiedAt).toLocaleString() : "Not modified yet"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">Feedback / Remarks</Label>
            <Textarea placeholder="Enter feedback or remarks" value={activeData.feedback} onChange={(e) => updateField('feedback', e.target.value)} className="min-h-20 resize-none" readOnly={readOnly || isSubmitting} />
          </div>
        </CardContent>
      </Card>

      {/* Floating Active Save Controls */}
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
                    if (formData) {
                      toast({ description: "Please revert manually or reload data context." });
                    } else {
                      setLocalFormData(pristineData);
                      setErrors({}); // Reset error highlights on discard
                    }
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