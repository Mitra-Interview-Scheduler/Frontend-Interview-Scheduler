import React, { useEffect, useState } from 'react';
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
import { 
  Download, FileText, Hash, Link, Loader2, MapPin, Plus,Award, Trash2, TrendingUp, Upload, CalendarClock, Pencil, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import { tierAPI } from '@/services/tierAPI';
import { designationAPI } from '@/services/designationAPI';
import { downloadBlobResponse } from '@/lib/documentUtils';
import { FALLBACK_CANDIDATE_STEPS } from '@/lib/candidateSteps';

// Reusable Subcomponents
import { DocumentDropzone } from './../../../components/DocumentDropzone'; 
import { ResourceLinkDialog } from './../../../components/ResourceLinkDialog';

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  departmentId: '', tierId: '', targetDesignationId: '',
  yearsOfExperience: '',
  resumeUrl: '', jdUrl: '', resourceLink: '', jobReferenceCode: '', location: '',
  notes: '', status: 'NEW', resourceRequestNumber: '',
};

function CandidateDialogPage({ 
  open, 
  candidate, 
  departments = [],
  candidateSteps = FALLBACK_CANDIDATE_STEPS,
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('CV');
  
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

  const handleDeleteResourceLink = (index) => {
    setResourceLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      setForm(EMPTY_FORM);
      setTiers([]);
      setError('');
      setSaving(false);
      setDocuments([]);
      setDocumentFile(null);
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
      jdUrl:                 candidate.jdUrl || '',
      resourceLink:          candidate.resourceLink || '',
      jobReferenceCode:      candidate.jobReferenceCode || '',
      location:              candidate.location || '',
      notes:                 candidate.notes || '',
      status:                candidate.status || 'NEW',
      resourceRequestNumber: candidate.resourceRequestNumber || '',
    });
    
    setTiers([]);
    setDesigs([]);
    setError('');
    setSaving(false);
    setDocuments([]);
    setDocumentFile(null);
    setDocumentType('CV');
    setResourceLinks(parseResourceLinks(candidate.resourceLink));
    loadDocuments(candidate.id);

    if (candidate.departmentId) {
      loadTiersForDept(candidate.departmentId);
    }
    if (candidate.tierId) {
        loadDesignsForTier(candidate.tierId);
      }
  }, [open, candidate, isCreate]);

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

  const handleUploadDocument = async () => {
    if (!candidate?.id || !documentFile) return;
    setSaving(true);
    setError('');
    try {
      await candidateAPI.uploadCandidateDocument(candidate.id, documentFile, documentType || 'OTHER');
      setDocumentFile(null);
      await loadDocuments(candidate.id);
      toast({ title: 'Success', description: 'Document uploaded successfully' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload document');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceDocument = async (document, file) => {
    if (!candidate?.id || !document?.id || !file) return;
    setSaving(true);
    setError('');
    try {
      await candidateAPI.replaceCandidateDocument(candidate.id, document.id, file, document.documentType || 'OTHER');
      await loadDocuments(candidate.id);
      toast({ title: 'Success', description: 'Document updated successfully' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update document');
    } finally {
      setSaving(false);
    }
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

  const handleDeleteDocument = async (documentId) => {
    if (!candidate?.id || !documentId) return;
    setSaving(true);
    setError('');
    try {
      await candidateAPI.deleteCandidateDocument(candidate.id, documentId);
      await loadDocuments(candidate.id);
      toast({ title: 'Success', description: 'Document deleted successfully' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete document');
    } finally {
      setSaving(false);
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
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required');
      return;
    }

    const payload = {
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
    };

    setSaving(true);
    setError('');

    try {
      if (isCreate) {
        const createdCandidate = await candidateAPI.createCandidate(payload);
        if (documentFile) {
          await candidateAPI.uploadCandidateDocument(createdCandidate.id, documentFile, documentType || 'CV');
        }
        toast({ title: 'Success', description: 'Candidate added successfully' });
      } else {
        await candidateAPI.updateCandidate(candidate.id, payload);
        if (documentFile) {
          await candidateAPI.uploadCandidateDocument(candidate.id, documentFile, documentType || 'OTHER');
        }
        toast({ title: 'Success', description: 'Candidate updated successfully' });
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
    setError('');
    setSaving(false);
    setDocuments([]);
    setDocumentFile(null);
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
              ? 'Fill in candidate details and attach documents before saving.'
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name" 
                disabled={saving || readOnly} 
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com" 
                disabled={saving || readOnly} 
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1234567890" 
                disabled={saving || readOnly} 
              />
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
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Documents
              </Label>

              <div className="border border-slate-200 bg-slate-50/60 rounded-lg p-3">
                {documents.length === 0 && !documentsLoading ? (
                  <p className="text-xs text-muted-foreground">
                    {isCreate
                      ? 'Attach a CV or other document before saving the candidate.'
                      : readOnly
                        ? 'No documents stored for this candidate.'
                        : ''}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {documents.map((document) => (
                      <div key={document.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border px-3 py-2 bg-white">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{document.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {document.documentType} - {(document.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownloadDocument(document)}
                            disabled={saving}
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Input
                                id={`replace-document-${document.id}`}
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleReplaceDocument(document, file);
                                  e.target.value = '';
                                }}
                                disabled={saving}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.document.getElementById(`replace-document-${document.id}`)?.click()}
                                disabled={saving}
                                title="Replace"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteDocument(document.id)}
                                disabled={saving}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!readOnly && (
                  <DocumentDropzone 
                    file={documentFile}
                    onFileSelect={setDocumentFile}
                    type={documentType}
                    onTypeChange={setDocumentType}
                    disabled={saving}
                    isCreate={isCreate}
                    onImmediateUpload={handleUploadDocument}
                  />
                )}
              </div>
            </div>

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

            {/* Errors */}
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
              <Button onClick={handleSave} disabled={saving} className="min-w-[110px]">
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
    </Dialog>
  );
}

export default CandidateDialogPage;