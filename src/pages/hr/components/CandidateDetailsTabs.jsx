import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Download, Eye, ExternalLink, FileText, Link2, Loader2, MapPin, NotebookPen, UserCircle2 } from 'lucide-react';

const CandidateDetailsTabs = ({
  candidate,
  readOnly = false,
  documents = [],
  documentsLoading = false,
  onPreviewDocument = () => {},
  onDownloadDocument = () => {},
}) => {
  const [activeTab, setActiveTab] = useState('profile');
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

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const parseResourceLinks = (rawValue) => {
    if (!rawValue || !String(rawValue).trim()) return [];

    try {
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) {
        return [{
          url: String(rawValue).trim(),
          tag: '',
        }];
      }

      return parsed
        .map((item) => ({
          url: typeof item === 'string' ? item.trim() : (item?.url || '').trim(),
          tag: typeof item === 'string' ? '' : (item?.tag || '').trim(),
        }))
        .filter((item) => item.url);
    } catch {
      return String(rawValue)
        .split('\n')
        .map((url) => ({
          url: url.trim(),
          tag: '',
        }))
        .filter((item) => item.url);
    }
  };

  const resourceLinks = parseResourceLinks(candidate.resourceLink);

  const getHostLabel = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return 'External';
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col overflow-hidden ">


      <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-1 rounded-lg border border-blue-200 flex-shrink-0">
        <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
          Profile Summary
        </TabsTrigger>
        <TabsTrigger value="screening" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
          Screening
        </TabsTrigger>
        <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
          Interview Summary
        </TabsTrigger>
      </TabsList>


      <TabsContent value="profile" className="mt-6 space-y-4 flex-1 overflow-y-auto pr-4">
        <div className="grid grid-cols-1 gap-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="px-2 py-1">
              {/* <div className="grid grid-cols-1 gap-3 md:grid-cols-4"> */}
                {/* <div className="md:col-span-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Job Reference</p>
                  <p className="font-medium text-slate-900">{candidate.jobReferenceCode || '-'}</p>
                </div>
                <div className="md:col-span-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Request Number</p>
                  <p className="font-medium text-slate-900">{candidate.resourceRequestNumber || '-'}</p>
                </div> */}
                {/* <div className="md:col-span-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Location</p>
                  <p className="font-medium text-slate-900">{candidate.location || '-'}</p>
                </div>
                <div className="md:col-span-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Experience</p>
                  <p className="font-medium text-slate-900">{candidate.yearsOfExperience !== null && candidate.yearsOfExperience !== undefined ? `${candidate.yearsOfExperience} years` : '-'}</p>
                </div> */}
              {/* </div> */}

              {/* <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Department</p>
                  <p className="text-sm font-medium text-slate-900">{candidate.departmentName || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Tier</p>
                  <p className="text-sm font-medium text-slate-900">{candidate.tierName || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Target Designation</p>
                  <p className="text-sm font-medium text-slate-900">{candidate.targetDesignationName || '-'}</p>
                </div>
              </div> */}

              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job Description</p>
                </div>

                {candidate.jdUrl ? (
                  <a
                    href={candidate.jdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 break-all text-sm text-blue-700 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {candidate.jdUrl}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">-</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
          <Card className="border border-slate-200 shadow-sm lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{candidate.notes || '-'}</p>
            </CardContent>
          </Card>

          {/* <Card className="border border-slate-200 shadow-sm lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] text-slate-500">Applied At</p>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(candidate.appliedAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] text-slate-500">Last Updated</p>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(candidate.updatedAt)}</p>
              </div>
              
            </CardContent>
          </Card> */}
        </div>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resource Links</p>
              <Badge variant="outline" className="ml-auto rounded-full text-[11px]">
                {resourceLinks.length}
              </Badge>
            </div>

            {resourceLinks.length === 0 && (
              <p className="text-sm text-slate-500">No resource links available.</p>
            )}

            {resourceLinks.length > 0 && (
              <div className="space-y-2">
                {resourceLinks.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        window.open(item.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                          {item.tag || getHostLabel(item.url)}
                        </Badge>
                        <p className="text-xs font-medium text-gray-900 truncate hover:text-blue-600">
                          {item.url}
                        </p>
                      </div>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline shrink-0"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</p>
              <Badge variant="outline" className="ml-auto rounded-full text-[11px]">
                {Array.isArray(documents) ? documents.length : 0}
              </Badge>
            </div>

            {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
            {!documentsLoading && documents.length === 0 && (
              <p className="text-sm text-slate-500">No documents available.</p>
            )}

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onPreviewDocument(document)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onPreviewDocument(document);
                      }
                    }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                          {document.documentType || 'Document'}
                        </Badge>
                        <p className="min-w-0 text-left text-xs font-medium text-gray-900 truncate group-hover:text-blue-600">
                          {document.fileName || 'Untitled document'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          onPreviewDocument(document);
                        }}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDownloadDocument(document);
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

       
      </TabsContent>
      
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
