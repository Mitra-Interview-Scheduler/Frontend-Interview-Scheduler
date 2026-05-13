import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CandidateDetailsTabs = ({ candidate, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState('screening');
  const [formData, setFormData] = useState({
    isProjectSpecific: '',
    projectName: '',
    region: '',
    engagementType: '',
    duration: '',
    targetStartDate: '',
    profileSource: 'Direct Applicant',
    referrerName: '',
    screenedBy: '',
    feedback: '',
    projectRole: '',
    natureOfRecruitment: '',
    roleStretch: '',
    specialNotes: '',
  });

  const handleInputChange = (field, value) => {
    if (!readOnly) {
      setFormData(prev => (
        {
          ...prev,
          [field]: value,
        }
      ));
    }
  };

  if (!candidate) {
    return <div className="text-center text-gray-500">No candidate data available</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col ">


      <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-1 rounded-lg border border-blue-200 flex-shrink-0">
        <TabsTrigger value="screening" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
          Screening
        </TabsTrigger>
        <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
          Interview Summary
        </TabsTrigger>
      </TabsList>



      {/* Screening Tab */}
      <TabsContent value="screening" className="mt-6 space-y-6 flex-1 overflow-y-auto pr-4">
           {/* Basic Information Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
            <h3 className="text-sm font-semibold text-blue-900">Basic Information</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Is this project specific interview?</Label>
                <Select value={formData.isProjectSpecific} onValueChange={(value) => handleInputChange('isProjectSpecific', value)} disabled={readOnly}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.isProjectSpecific === 'yes' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Project Name</Label>
                    <Input
                      placeholder="Enter project name"
                      value={formData.projectName}
                      onChange={(e) => handleInputChange('projectName', e.target.value)}
                      className="h-9"
                      readOnly={readOnly}
                    />
                  </div>
                </>
              )}
            </div>

            {formData.isProjectSpecific === 'yes' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">Region</Label>
                  <Input
                    placeholder="Enter region"
                    value={formData.region}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                    className="h-9"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Engagement Type</Label>
                <Select value={formData.engagementType} onValueChange={(value) => handleInputChange('engagementType', value)} disabled={readOnly}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="parttime">Part Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Duration (in months)</Label>
                <Input
                  type="number"
                  placeholder="Enter duration"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className="h-9"
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Target Start Date</Label>
              <Input
                type="date"
                value={formData.targetStartDate}
                onChange={(e) => handleInputChange('targetStartDate', e.target.value)}
                className="h-9"
                readOnly={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Source Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
            <h3 className="text-sm font-semibold text-blue-900">Profile Source</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">How did Mitra get the candidate profile?</Label>
              <Select value={formData.profileSource} onValueChange={(value) => handleInputChange('profileSource', value)} disabled={readOnly}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct Applicant">Direct Applicant</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Job Portal">Job Portal</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.profileSource === 'Referral' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Referrer Name</Label>
                <Input
                  placeholder="Enter referrer name"
                  value={formData.referrerName}
                  onChange={(e) => handleInputChange('referrerName', e.target.value)}
                  className="h-9"
                  readOnly={readOnly}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Screening Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
            <h3 className="text-sm font-semibold text-blue-900">Profile Screening</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Screened By</Label>
              <Input
                placeholder="Enter screener name"
                value={formData.screenedBy}
                onChange={(e) => handleInputChange('screenedBy', e.target.value)}
                className="h-9"
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Feedback / Remarks</Label>
              <Textarea
                placeholder="Enter feedback or remarks"
                value={formData.feedback}
                onChange={(e) => handleInputChange('feedback', e.target.value)}
                className="min-h-20 resize-none"
                readOnly={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Project Role Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
            <h3 className="text-sm font-semibold text-blue-900">Project Role</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Project Role</Label>
              <Input
                placeholder="Enter project role"
                value={formData.projectRole}
                onChange={(e) => handleInputChange('projectRole', e.target.value)}
                className="h-9"
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Nature of Recruitment</Label>
              <Select value={formData.natureOfRecruitment} onValueChange={(value) => handleInputChange('natureOfRecruitment', value)} disabled={readOnly}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New Position">New Position</SelectItem>
                  <SelectItem value="Replacement">Replacement</SelectItem>
                  <SelectItem value="Expansion">Expansion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Role Stretch / De-stretch Acceptable?</Label>
              <Select value={formData.roleStretch} onValueChange={(value) => handleInputChange('roleStretch', value)} disabled={readOnly}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Special Notes by delivery/pre-sales team</Label>
              <Textarea
                placeholder="Enter special notes"
                value={formData.specialNotes}
                onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                className="min-h-20 resize-none"
                readOnly={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 pb-4">
            <h3 className="text-sm font-semibold text-blue-900">Screening Information</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Screened By</Label>
              <Input
                placeholder="Enter screener name"
                value={formData.screenedBy}
                onChange={(e) => handleInputChange('screenedBy', e.target.value)}
                className="h-9"
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Screening Feedback / Remarks</Label>
              <Textarea
                placeholder="Enter screening feedback"
                value={formData.feedback}
                onChange={(e) => handleInputChange('feedback', e.target.value)}
                className="min-h-24 resize-none"
                readOnly={readOnly}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      {/* Interview Summary Tab */}
      <TabsContent value="summary" className="mt-6 space-y-6 flex-1 overflow-y-auto pr-4">
      </TabsContent>
    </Tabs>
  );
};

export default CandidateDetailsTabs;
