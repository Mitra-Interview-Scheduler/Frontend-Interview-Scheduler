import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  Award, Download, FileText, Hash, Link, Loader2, MapPin, Plus, Trash2, TrendingUp, CalendarClock, Pencil, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import { candidatePipelineAPI } from '@/services/candidatePipelineApi';
import { tierAPI } from '@/services/tierAPI';
import { designationAPI } from '@/services/designationAPI';
import { departmentUsersAPI } from '@/services/departmentUsersAPI';
import { CandidateDocumentsPanel } from '@/components/CandidateDocumentsPanel';
import CandidateSkillsPanel from '@/components/CandidateSkillsPanel';
import { DocumentDropzone } from '@/components/DocumentDropzone';
import { downloadBlobResponse } from '@/lib/documentUtils';

// Reusable Subcomponents
import { ResourceLinkDialog } from './../../../components/ResourceLinkDialog';
import { parseJobDescriptionText } from '@/lib/jobDescriptionUtils';

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  departmentId: '', tierId: '', targetDesignationId: '',
  yearsOfExperience: '',
  resumeUrl: '', jdUrl: '', resourceLink: '', jobReferenceCode: '', location: '',
  notes: '', status: 'NEW', resourceRequestNumber: '',
  coordinatorDepartmentId: '',
  coordinatedHrId: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getCandidateFieldErrors(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!form.phone?.trim()) errors.phone = 'Phone is required';
  if (!form.coordinatedHrId) errors.coordinatedHrId = 'Candidate coordinator is required';
  if (!form.coordinatorDepartmentId) errors.coordinatorDepartmentId = 'Coordinator department is required';
  return errors;
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

function CandidateDialogPage({
  open, 
  candidate, 
  departments = [],
  candidateSteps = [],
  onOpenChange, 
  onSaveSuccess,
  readOnly = false,
  onEdit,
  onSchedule,
  mode = 'edit'
}) {
  const isCreate = mode === 'create';
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [formInteracted, setFormInteracted] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [pendingSkills, setPendingSkills] = useState([]);
  const [pendingDocumentDeleteIds, setPendingDocumentDeleteIds] = useState([]);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentType, setDocumentType] = useState('CV');
  const [coordinatorUsers, setCoordinatorUsers] = useState([]);
  const [coordinatorUsersLoading, setCoordinatorUsersLoading] = useState(false);
  
  // Resource Link States
  const [resourceLinks, setResourceLinks] = useState([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkIndexToEdit, setLinkIndexToEdit] = useState(null);
  const [desigs, setDesigs] = useState([]);


  const parseResourceLinks = (rawValue) => {
    if (!rawValue || !String(rawValue).trim()) return [];
    try {
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) return [{ url: String(rawValue).trim(), tag: '' }];
      return parsed.map((item) => ({
        url: typeof item === 'string' ? item.trim() : (item?.url || '').trim(),
        tag: typeof item === 'string' ? '' : (item?.tag || item?.name || '').trim(),
      })).filter((item) => item.url);
    } catch {
      return String(rawValue).split('\n').map((url) => ({ url: url.trim(), tag: '' })).filter((item) => item.url);
    }
  };

  const serializeResourceLinks = () => {
    const normalized = resourceLinks.filter((item) => item.url.trim());
    return normalized.length > 0 ? JSON.stringify(normalized) : JSON.stringify([]);
  };

  const getHostLabel = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'External';
    }
  };

  const buildPayload = () => ({
    name:                  form.name.trim(),
    email:                 form.email.trim(),
    phone:                 form.phone?.trim(),
    departmentId:          form.departmentId ? parseInt(form.departmentId) : null,
    targetDesignationId:   form.targetDesignationId ? parseInt(form.targetDesignationId) : null,
    status:                form.status,
    yearsOfExperience:     form.yearsOfExperience ? parseInt(form.yearsOfExperience) : null,
    jdUrl:                 form.jdUrl?.trim() || null,
    resourceLink:          serializeResourceLinks(),
    jobReferenceCode:      form.jobReferenceCode?.trim() || null,
    location:              form.location?.trim() || null,
    notes:                 form.notes?.trim() || null,
    resourceRequestNumber: form.resourceRequestNumber?.trim() || null,
    coordinatedHrId:       parseInt(form.coordinatedHrId),
  });

  const fieldErrors = useMemo(() => getCandidateFieldErrors(form), [form]);
  const isFormValid = Object.keys(fieldErrors).length === 0;

  const showFieldError = (field) => {
    if (readOnly) return '';
    if (!formInteracted && !touched[field]) return '';
    return fieldErrors[field] || '';
  };

  const touchField = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const resetValidationState = () => {
    setTouched({});
    setFormInteracted(false);
    setError('');
  };

  const handleDeleteResourceLink = (index) => {
    setResourceLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddPendingDocument = (file, docType) => {
    setPendingDocuments((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        documentType: docType || 'CV',
      },
    ]);
    setDocumentType('CV');
    setIsDocumentModalOpen(false);
  };

  const handleRemovePendingDocument = (localId) => {
    setPendingDocuments((prev) => prev.filter((doc) => doc.localId !== localId));
  };

  const handleMarkDocumentForDelete = (documentId) => {
    setPendingDocumentDeleteIds((prev) => [...prev, documentId]);
  };

  const handleDownloadDocument = async (document) => {
    if (!candidate?.id || !document?.id) return;
    try {
      const response = await candidateAPI.downloadCandidateDocument(candidate.id, document.id);
      downloadBlobResponse(response, document);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download document');
    }
  };

  const visibleSavedDocuments = documents.filter(
    (doc) => !pendingDocumentDeleteIds.includes(doc.id)
  );

  const handleOpenLinkModal = (index) => {
    setLinkIndexToEdit(index);
    setIsLinkModalOpen(true);
  };

  const handleCloseLinkModal = () => {
    setLinkIndexToEdit(null);
    setIsLinkModalOpen(false);
  };

  const handleSaveResourceLink = (linkData) => {
    let runningList = [...resourceLinks];
    if (linkIndexToEdit !== null) {
      runningList[linkIndexToEdit] = linkData;
    } else {
      runningList.push(linkData);
    }
    setResourceLinks(runningList);
    setIsLinkModalOpen(false);
    setLinkIndexToEdit(null);
  };

  const loadCoordinatorUsers = async (departmentId) => {
    if (!departmentId) {
      setCoordinatorUsers([]);
      return;
    }
    setCoordinatorUsersLoading(true);
    try {
      const data = await departmentUsersAPI.getUsersByDepartment(parseInt(departmentId, 10));
      setCoordinatorUsers(data || []);
    } catch (e) {
      console.error('Failed to load coordinator users:', e);
      setCoordinatorUsers([]);
      setError((prev) => prev || 'Could not load users for the selected coordinator department.');
    } finally {
      setCoordinatorUsersLoading(false);
    }
  };

  const handleCoordinatorDepartmentChange = (value) => {
    const deptId = value === 'NONE' ? '' : value;
    touchField('coordinatorDepartmentId');
    updateForm({ coordinatorDepartmentId: deptId, coordinatedHrId: '' });
    loadCoordinatorUsers(deptId);
  };

  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      setForm(EMPTY_FORM);
      setCoordinatorUsers([]);
      setTiers([]);
      setDesigs([]);
      setSaving(false);
      resetValidationState();
      setDocuments([]);
      setPendingDocuments([]);
      setPendingSkills([]);
      setPendingDocumentDeleteIds([]);
      setDocumentType('CV');
      setResourceLinks([]);
      return;
    }

    if (!candidate) return;

    setForm({
      name:                  candidate.name || '',
      email:                 candidate.email || '',
      phone:                 candidate.phone || '',
      departmentId:          candidate.departmentId?.toString() || '',
      tierId:                candidate.tierId?.toString() || '',
      targetDesignationId:   candidate.targetDesignationId?.toString() || '',
      yearsOfExperience:     candidate.yearsOfExperience?.toString() || '',
      resumeUrl:             candidate.resumeUrl || '',
      jdUrl:                 parseJobDescriptionText(candidate.jdUrl),
      resourceLink:          candidate.resourceLink || '',
      jobReferenceCode:      candidate.jobReferenceCode || '',
      location:              candidate.location || '',
      notes:                 candidate.notes || '',
      status:                candidate.status || 'NEW',
      resourceRequestNumber: candidate.resourceRequestNumber || '',
      coordinatorDepartmentId: candidate.coordinatedHrDepartmentId?.toString() || '',
      coordinatedHrId:       candidate.coordinatedHrId?.toString() || '',
    });

    if (candidate.coordinatedHrDepartmentId) {
      loadCoordinatorUsers(candidate.coordinatedHrDepartmentId);
    } else {
      setCoordinatorUsers([]);
    }

    setTiers([]);
    setDesigs([]);
    setSaving(false);
    resetValidationState();
    setPendingDocuments([]);
    setPendingDocumentDeleteIds([]);
    setDocumentType('CV');
    setResourceLinks(parseResourceLinks(candidate.resourceLink));

    if (candidate.departmentId) {
      loadTiersForDept(candidate.departmentId);
    }
    if (candidate.tierId) {
      loadDesignsForTier(candidate.tierId);
    }
  }, [open, candidate, isCreate]);

  useEffect(() => {
    if (!open || isCreate || !candidate?.id) {
      if (!open) setDocuments([]);
      return;
    }
    loadDocuments(candidate.id);
  }, [open, isCreate, candidate?.id]);

  const loadTiersForDept = async (deptId) => {
    if (!deptId) { setTiers([]); return; }
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId));
      setTiers(data.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { 
      console.error(e); 
      setTiers([]); 
    }
  };


    const loadDesignsForTier = async (tierId) => {
    if (!tierId) { setDesigs([]); return; }
    try {
      const data = await designationAPI.getDesignationsByTier(parseInt(tierId));
      setDesigs(data.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (e) { 
      console.error(e); 
      setDesigs([]); 
    }
  };

  const loadDocuments = async (candidateId) => {
    if (!candidateId) return;
    setDocumentsLoading(true);
    try {
      const data = await candidateAPI.getCandidateDocuments(candidateId);
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDeptChange = async (val) => {
    setForm((f) => ({ ...f, departmentId: val, tierId: '', targetDesignationId: '' }));
    setDesigs([]);
    await loadTiersForDept(val);
  };


   const handleTierChange = async (val) => {
    setForm((f) => ({ ...f, tierId: val, targetDesignationId: '' }));
    await loadDesignsForTier(val);
  };
  const handleSave = async () => {
    setFormInteracted(true);
    setTouched({
      name: true,
      email: true,
      phone: true,
      coordinatedHrId: true,
      coordinatorDepartmentId: true,
    });

    if (!isFormValid) return;

    const payload = buildPayload();

    setSaving(true);
    setError('');

    try {
      let savedCandidateId;

      if (isCreate) {
        const createdCandidate = await candidateAPI.createCandidate(payload);
        try {
          await candidatePipelineAPI.initializePipeline(createdCandidate.id);
        } catch (pipelineError) {
          console.error('Failed to initialize candidate pipeline:', pipelineError);
        }
        savedCandidateId = createdCandidate.id;
        toast({ title: 'Success', description: 'Candidate added successfully' });
      } else {
        await candidateAPI.updateCandidate(candidate.id, payload);
        savedCandidateId = candidate.id;
        toast({ title: 'Success', description: 'Candidate updated successfully' });
      }

      for (const documentId of pendingDocumentDeleteIds) {
        await candidateAPI.deleteCandidateDocument(savedCandidateId, documentId);
      }

      if (pendingDocuments.length > 0) {
        const uploadResults = await Promise.allSettled(
          pendingDocuments.map((doc) =>
            candidateAPI.uploadCandidateDocument(savedCandidateId, doc.file, doc.documentType)
          )
        );
        const failedUploads = uploadResults.filter((result) => result.status === 'rejected');
        if (failedUploads.length > 0) {
          const reason = failedUploads[0].reason?.response?.data?.message
            || failedUploads[0].reason?.message
            || 'Document upload failed';
          throw new Error(
            `Candidate saved, but ${failedUploads.length} document(s) failed to upload: ${reason}`
          );
        }
      }

      if (pendingSkills.length > 0) {
        const skillResults = await Promise.allSettled(
          pendingSkills.map((skill) =>
            candidateAPI.addCandidateTechnology(savedCandidateId, skill.technology.id)
          )
        );
        const failedSkills = skillResults.filter((result) => result.status === 'rejected');
        if (failedSkills.length > 0) {
          const reason = failedSkills[0].reason?.response?.data?.message
            || failedSkills[0].reason?.message
            || 'Skill save failed';
          throw new Error(
            `Candidate saved, but ${failedSkills.length} skill(s) failed to save: ${reason}`
          );
        }
      }

      onOpenChange(false);
      onSaveSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${isCreate ? 'add' : 'update'} candidate`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetValidationState();
    setSaving(false);
    setDocuments([]);
    setPendingDocuments([]);
    setPendingSkills([]);
    setPendingDocumentDeleteIds([]);
    setDocumentType('CV');
    setResourceLinks([]);
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}> 
      <DialogContent className="w-[95vw] max-w-4xl max-h-[92vh] p-0 border-0 bg-gradient-to-br from-white to-slate-50">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <DialogTitle className="text-blue-900">
            {isCreate ? 'Add New Candidate' : readOnly ? candidate?.name : 'Edit Candidate'}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Fill in candidate details. Documents and resource links are saved when you click Add Candidate.'
              : readOnly
                ? 'Review candidate profile, documents, and next actions.'
                : 'Update candidate information, hierarchy mapping, and documents.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-4 py-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">

            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Candidate Information</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => updateForm({ name: e.target.value })}
                onBlur={() => touchField('name')}
                placeholder="Full name" 
                disabled={saving || readOnly}
                aria-invalid={!!showFieldError('name')}
                className={showFieldError('name') ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              <FieldError message={showFieldError('name')} />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={(e) => updateForm({ email: e.target.value })}
                onBlur={() => touchField('email')}
                placeholder="email@example.com" 
                disabled={saving || readOnly}
                aria-invalid={!!showFieldError('email')}
                className={showFieldError('email') ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              <FieldError message={showFieldError('email')} />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => updateForm({ phone: e.target.value })}
                onBlur={() => touchField('phone')}
                placeholder="+1234567890" 
                disabled={saving || readOnly}
                aria-invalid={!!showFieldError('phone')}
                className={showFieldError('phone') ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              <FieldError message={showFieldError('phone')} />
            </div>

            {/* Years of experience */}
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input 
                type="number" 
                min="0" 
                value={form.yearsOfExperience}
                onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                placeholder="5" 
                disabled={saving || readOnly} 
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Location
              </Label>
              <Input 
                value={form.location} 
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, Country" 
                disabled={saving || readOnly} 
              />
            </div>

            {/* Job Reference Code */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Job Reference Code
              </Label>
              <Input 
                value={form.jobReferenceCode} 
                onChange={(e) => setForm({ ...form, jobReferenceCode: e.target.value })}
                placeholder="REQ-2024-001" 
                disabled={saving || readOnly} 
              />
            </div>

            {/* Resource Request Code */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Resource Request Number (RR Number)
              </Label>
              <Input 
                value={form.resourceRequestNumber} 
                onChange={(e) => setForm({ ...form, resourceRequestNumber: e.target.value })}
                placeholder="REQ-2024-001" 
                disabled={saving || readOnly} 
              />
            </div>

            {!isCreate && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                  disabled={saving || readOnly}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {candidateSteps.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Hiring Mapping</p>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select 
                value={form.departmentId || 'NONE'} 
                onValueChange={(v) => handleDeptChange(v === 'NONE' ? '' : v)}
                disabled={saving || readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Tier
              </Label>
              <Select 
                value={form.tierId || 'NONE'}
                onValueChange={(v) => handleTierChange(v === 'NONE' ? '' : v)}
                disabled={saving || readOnly || !form.departmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.departmentId ? 'Select tier' : 'Select department first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      Tier {t.tierOrder} – {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


               <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Target Designation
            </Label>
            {readOnly ? (
              <Input
                value={candidate?.targetDesignationName || '-'}
                disabled
                className="bg-gray-50"
              />
            ) : (
              <Select
                value={form.targetDesignationId || 'NONE'}
                onValueChange={(v) => setForm({ ...form, targetDesignationId: v === 'NONE' ? '' : v })}
                disabled={saving || !form.tierId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.tierId ? 'Select designation' : 'Select tier first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {desigs.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      Level {d.levelOrder} – {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

            <div className="md:col-span-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Candidate Coordinator</p>
            </div>

            {readOnly ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Coordinator</Label>
                <Input
                  value={candidate?.coordinatedHrName || '-'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={form.coordinatorDepartmentId || 'NONE'}
                    onValueChange={handleCoordinatorDepartmentChange}
                    disabled={saving}
                  >
                    <SelectTrigger
                      aria-invalid={!!showFieldError('coordinatorDepartmentId')}
                      className={showFieldError('coordinatorDepartmentId') ? 'border-red-500 focus:ring-red-500' : ''}
                    >
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
                  <FieldError message={showFieldError('coordinatorDepartmentId')} />
                </div>

                <div className="relative space-y-2 overflow-visible">
                  <Label>Coordinator *</Label>
                  <SearchableSelect
                    value={form.coordinatedHrId || 'NONE'}
                    onValueChange={(v) => {
                      touchField('coordinatedHrId');
                      updateForm({ coordinatedHrId: v === 'NONE' ? '' : v });
                    }}
                    disabled={saving || coordinatorUsersLoading || !form.coordinatorDepartmentId}
                    aria-invalid={!!showFieldError('coordinatedHrId')}
                    className={showFieldError('coordinatedHrId') ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    label="Coordinator"
                    placeholder={
                      !form.coordinatorDepartmentId
                        ? 'Select department first'
                        : coordinatorUsersLoading
                          ? 'Loading users...'
                          : undefined
                    }
                    searchPlaceholder="Search coordinators..."
                    emptyMessage={
                      coordinatorUsers.length === 0
                        ? 'No user found for selected department'
                        : 'No matching users found'
                    }
                    options={coordinatorUsers.map((user) => ({
                      value: user.id.toString(),
                      label: `${user.fullName} (${user.email})`,
                      keywords: `${user.fullName} ${user.email}`,
                    }))}
                  />
                  <FieldError message={showFieldError('coordinatedHrId')} />
                </div>
              </>
            )}

            {/* Job Description */}
            <div className="md:col-span-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Job Description</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Job Description
              </Label>
              <Textarea
                value={form.jdUrl}
                onChange={(e) => setForm({ ...form, jdUrl: e.target.value })}
                placeholder="Paste or write the job description..."
                rows={5}
                disabled={saving || readOnly}
              />
            </div>

            {/* Resource Links Block */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="flex items-center gap-1">
                  <Link className="w-3.5 h-3.5" /> Resource Links (Drive URL)
                </Label>

                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleOpenLinkModal(null)}
                    disabled={saving}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Link
                  </Button>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                {resourceLinks.length === 0 && (
                  <p className="text-xs text-muted-foreground p-1">No resource links attached yet.</p>
                )}
                {resourceLinks.map((item, index) => (
                  <div key={`${index}-${item.url}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                        {item.tag || getHostLabel(item.url)}
                      </Badge>
                      <p className="text-xs font-medium text-gray-900 truncate">{item.url}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        title="Open External Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      {!readOnly && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-600"
                            onClick={() => handleOpenLinkModal(index)}
                            disabled={saving}
                            title="Edit Link"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteResourceLink(index)}
                            disabled={saving}
                            title="Remove Link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Documents Section */}
            {readOnly ? (
              <div className="md:col-span-2">
                <CandidateDocumentsPanel
                  candidateId={candidate?.id}
                  documents={documents}
                  documentsLoading={documentsLoading}
                  onDocumentsRefresh={() => loadDocuments(candidate?.id)}
                  readOnly
                  variant="embedded"
                />
              </div>
            ) : (
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Documents
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsDocumentModalOpen(true)}
                  disabled={saving}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Document
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                {documentsLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                )}
                {!documentsLoading
                  && visibleSavedDocuments.length === 0
                  && pendingDocuments.length === 0 && (
                  <p className="text-xs text-muted-foreground p-1">No documents attached yet.</p>
                )}
                {visibleSavedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                        {document.documentType || 'Document'}
                      </Badge>
                      <p className="text-xs font-medium text-gray-900 truncate">{document.fileName}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isCreate && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDownloadDocument(document)}
                          disabled={saving}
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleMarkDocumentForDelete(document.id)}
                        disabled={saving}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingDocuments.map((doc) => (
                  <div
                    key={doc.localId}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                        {doc.documentType}
                      </Badge>
                      <p className="text-xs font-medium text-gray-900 truncate">{doc.file.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemovePendingDocument(doc.localId)}
                      disabled={saving}
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            )}

            {open && (
              <div className="md:col-span-2">
                <CandidateSkillsPanel
                  candidateId={isCreate ? null : candidate?.id}
                  skills={candidate?.technologies}
                  readOnly={readOnly}
                  disabled={saving}
                  pendingSkills={pendingSkills}
                  onPendingSkillsChange={setPendingSkills}
                  variant="embedded"
                />
              </div>
            )}

            {/* Notes */}
            <div className="md:col-span-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Additional Notes</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..." 
                rows={3} 
                disabled={saving || readOnly} 
              />
            </div>

            {/* Errors — API / server errors only */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="md:col-span-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </DialogBody>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200">
          {readOnly ? (
            <>
              <Button variant="outline" onClick={onSchedule} className="gap-2">
                <CalendarClock className="w-4 h-4" />
                Schedule Interview
              </Button>
              
              <Button onClick={onEdit} className="gap-2">
                Edit Candidate
              </Button>

              <Button 
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/hr/candidates/${candidate.id}/details`);
                }} 
                variant="outline"
                className="gap-2"
              >
                Detailed View
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="min-w-[110px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  isCreate ? 'Add Candidate' : 'Update'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Resource Link Extracted Dialog Component Binding */}
      <ResourceLinkDialog
        open={isLinkModalOpen}
        onClose={handleCloseLinkModal}
        item={linkIndexToEdit !== null ? resourceLinks[linkIndexToEdit] : null}
        saving={saving}
        onSave={handleSaveResourceLink}
      />

      <Dialog open={isDocumentModalOpen} onOpenChange={(open) => !saving && setIsDocumentModalOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Select a file and category. It will be uploaded when you save the candidate.
            </DialogDescription>
          </DialogHeader>
          <DocumentDropzone
            type={documentType}
            onTypeChange={setDocumentType}
            onAddDocument={handleAddPendingDocument}
            disabled={saving}
            isCreate
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default CandidateDialogPage;