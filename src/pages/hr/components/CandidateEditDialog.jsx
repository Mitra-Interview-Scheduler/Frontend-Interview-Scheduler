import React, { useEffect, useState ,useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Hash, Link, Loader2, MapPin, Trash2, TrendingUp, Award, Upload, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI } from '@/services/tierAPI';

const CANDIDATE_STATUSES = [
  'APPLIED','SCREENING','SCHEDULED','INTERVIEWED',
  'TECHNICAL_ROUND','HR_ROUND','SELECTED','REJECTED','WITHDRAWN','ON_HOLD',
];

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  departmentId: '', tierId: '', targetDesignationId: '',
  yearsOfExperience: '',
  resumeUrl: '', jdUrl: '', jobReferenceCode: '', location: '',
  notes: '', status: 'APPLIED',
};

function CandidateEditDialog({ 
  open, 
  candidate, 
  departments = [],
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
  const [desigs, setDesigs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('CV');
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const fileInputRef = useRef(null);
  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      setForm(EMPTY_FORM);
      setTiers([]);
      setDesigs([]);
      setError('');
      setSaving(false);
      setDocuments([]);
      setDocumentFile(null);
      setDocumentType('CV');
      setIsUploadDragging(false);
      return;
    }

    if (!candidate) return;
    
    const newForm = {
      name:              candidate.name || '',
      email:             candidate.email || '',
      phone:             candidate.phone || '',
      departmentId:      candidate.departmentId?.toString() || '',
      tierId:            candidate.tierId?.toString() || '',
      targetDesignationId: candidate.targetDesignationId?.toString() || '',
      yearsOfExperience: candidate.yearsOfExperience?.toString() || '',
      resumeUrl:         candidate.resumeUrl || '',
      jdUrl:             candidate.jdUrl || '',
      jobReferenceCode:  candidate.jobReferenceCode || '',
      location:          candidate.location || '',
      notes:             candidate.notes || '',
      status:            candidate.status || 'APPLIED',
    };
    
    setForm(newForm);
    setTiers([]);
    setDesigs([]);
    setError('');
    setSaving(false);
    setDocuments([]);
    setDocumentFile(null);
    setDocumentType('CV');
    setIsUploadDragging(false);
    loadDocuments(candidate.id);

    // Pre-load cascades
    if (candidate.departmentId) {
      loadTiersForDept(candidate.departmentId);
      if (candidate.tierId) {
        loadDesignsForTier(candidate.tierId);
      }
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

  const selectDocumentFile = (file) => {
    if (!file) return;
    setDocumentFile(file);
  };

  const handleUploadDrop = (event) => {
    event.preventDefault();
    setIsUploadDragging(false);
    selectDocumentFile(event.dataTransfer.files?.[0]);
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
      const url = window.URL.createObjectURL(new Blob([response.data], { type: document.contentType }));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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
      name:              form.name.trim(),
      email:             form.email.trim(),
      phone:             form.phone?.trim() || null,
      departmentId:      form.departmentId ? parseInt(form.departmentId) : null,
      targetDesignationId: form.targetDesignationId ? parseInt(form.targetDesignationId) : null,
      status:            form.status,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : null,
      jdUrl:             form.jdUrl?.trim() || null,
      jobReferenceCode:  form.jobReferenceCode?.trim() || null,
      location:          form.location?.trim() || null,
      notes:             form.notes?.trim() || null,
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
    setIsUploadDragging(false);
    setForm(EMPTY_FORM);

  };

  return (
    <Dialog open={open} onOpenChange={handleClose}> 
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Add New Candidate' : readOnly ? candidate?.name : 'Edit Candidate'}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="grid grid-cols-1 px-7 md:grid-cols-2 gap-4">

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
            <Label>Phone</Label>
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
                  {CANDIDATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Designation */}
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Target Designation
            </Label>
            <Select 
              value={form.targetDesignationId || 'NONE'}
              onValueChange={(v) => setForm({ ...form, targetDesignationId: v === 'NONE' ? '' : v })}
              disabled={saving || readOnly || !form.tierId}
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

          {/* JD URL */}
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1">
              <Link className="w-3.5 h-3.5" /> Job Description URL
            </Label>
            <Input 
              value={form.jdUrl} 
              onChange={(e) => setForm({ ...form, jdUrl: e.target.value })}
              placeholder="https://careers.company.com/jd/..." 
              disabled={saving || readOnly} 
            />
          </div>


          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center ">
                <FileText className="w-3.5 h-3.5" /> Documents
              </Label>
            <div className="flex items-center justify-between gap-2 ">
              {documentsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

          <div className="border rounded-md p-3">
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
                  <div key={document.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border px-3 py-2 ">
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
              <div className="flex flex-col gap-2 pt-2">
                
                <div className="space-y-2">
                  <div
                    className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-4 text-center transition-colors hover:ring ring-primary cursor-pointer ${
                      isUploadDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/30 bg-muted/20'
                    } ${saving ? 'opacity-60' : ''}`}
                    onClick={() => !saving && fileInputRef.current?.click()}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (!saving) setIsUploadDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!saving) setIsUploadDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsUploadDragging(false);
                    }}
                    onDrop={saving ? undefined : handleUploadDrop}
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" />

                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {documentFile ? documentFile.name : 'Drop document here or click to upload'}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, or DOCX up to 10 MB
                      </p>
                    </div>
                  </div>

                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => selectDocumentFile(e.target.files?.[0])}
                    disabled={saving}
                  />
                </div>
                <Select value={documentType} onValueChange={setDocumentType} disabled={saving} >
                  <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CV">CV</SelectItem>
                    <SelectItem value="PROFILE">Profile Picture</SelectItem>
                    <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                    <SelectItem value="PORTFOLIO">Portfolio</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>

                {isCreate ? (
                  <p className="text-xs text-muted-foreground">
                    {documentFile ? 'This document will be uploaded when you add the candidate.' : 'Choose a document to upload with the candidate.'}
                  </p>
                ) : (
                  <Button
                    type="button"
                    onClick={handleUploadDocument}
                    disabled={saving || !documentFile}
                    className="gap-2 hover:ring ring-primary cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 " />
                    Upload
                  </Button>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Notes */}
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

          {/* Error message */}
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

        <DialogFooter>
          {readOnly ? (
            <>
              {/* <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button> */}
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
    </Dialog>
  );
}

export default CandidateEditDialog;
