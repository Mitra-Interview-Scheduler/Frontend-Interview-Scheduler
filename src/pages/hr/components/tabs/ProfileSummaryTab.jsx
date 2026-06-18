import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, Eye, ExternalLink, FileText, Link2, Loader2, NotebookPen, Plus, Trash2, Pencil 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { DocumentDropzone } from './../../../../components/DocumentDropzone';
import { ResourceLinkDialog } from './../../../../components/ResourceLinkDialog';
import { candidateAPI } from '@/services/candidateAPI';
import { toast } from '@/hooks/use-toast';
import { parseJobDescriptionText } from '@/lib/jobDescriptionUtils';

const ProfileSummaryTab = ({
  candidate,
  documents = [],
  documentsLoading = false,
  onPreviewDocument = () => {},
  onDownloadDocument = () => {},
  onDocumentUploaded = () => {},  
  onCandidateUpdated = () => {},   
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('CV');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Re-architected Resource Link control states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkIndexToEdit, setLinkIndexToEdit] = useState(null); 
  const [linkSaving, setLinkSaving] = useState(false);

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

  const resourceLinks = parseResourceLinks(candidate.resourceLink);
  const jobDescriptionText = parseJobDescriptionText(candidate.jdUrl);
  
  const getHostLabel = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'External';
    }
  };

  const executeResourceLinksUpdate = async (updatedLinksList) => {
    setLinkSaving(true);
    try {
      const payload = {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        departmentId: candidate.departmentId ? parseInt(candidate.departmentId) : null,
        targetDesignationId: candidate.targetDesignationId ? parseInt(candidate.targetDesignationId) : null,
        status: candidate.status,
        yearsOfExperience: candidate.yearsOfExperience ? parseInt(candidate.yearsOfExperience) : null,
        jdUrl: candidate.jdUrl || null,
        jobReferenceCode: candidate.jobReferenceCode || null,
        location: candidate.location || null,
        notes: candidate.notes || null,
        resourceRequestNumber: candidate.resourceRequestNumber || null,
        resourceLink: JSON.stringify(updatedLinksList),
      };

      await candidateAPI.updateCandidate(candidate.id, payload);
      toast({ title: 'Success', description: 'Resource links synchronized successfully' });
      setIsLinkModalOpen(false);
      onCandidateUpdated();
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.message || err.message || 'Failed to update resource link changes.',
        variant: 'destructive',
      });
    } finally {
      setLinkSaving(false);
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

  // Process unified form details emitted out of extracted dialog component 
  const handleSaveResourceLink = async (linkData) => {
    let runningList = [...resourceLinks];
    if (linkIndexToEdit !== null) {
      runningList[linkIndexToEdit] = linkData;
    } else {
      runningList.push(linkData);
    }
    await executeResourceLinksUpdate(runningList);
  };

  const handleDeleteResourceLink = async (index) => {
    const runningList = resourceLinks.filter((_, idx) => idx !== index);
    await executeResourceLinksUpdate(runningList);
  };

  const handleImmediateUpload = async () => {
    if (!candidate?.id || !documentFile) return;
    setUploading(true);
    try {
      await candidateAPI.uploadCandidateDocument(candidate.id, documentFile, documentType || 'OTHER');
      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setDocumentFile(null);
      setDocumentType('CV');
      setIsUploadOpen(false);
      onDocumentUploaded();
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: err.response?.data?.message || err.message || 'Failed to sync file.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!candidate?.id || !documentId) return;
    setDeletingId(documentId);
    try {
      await candidateAPI.deleteCandidateDocument(candidate.id, documentId);
      toast({ title: 'Success', description: 'Document deleted successfully' });
      onDocumentUploaded();
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: err.response?.data?.message || err.message || 'Failed to remove document.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Job Description Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mt-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job Description</p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {jobDescriptionText || '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{candidate.notes || '-'}</p>
        </CardContent>
      </Card>

      {/* Resource Links Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resource Links</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[11px]">{resourceLinks.length}</Badge>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1 hover:bg-slate-50"
                onClick={() => handleOpenLinkModal(null)}
                disabled={linkSaving}
              >
                <Plus className="h-3.5 w-3.5" /> 
                Add Link
              </Button>
            </div>
          </div>
          
          {resourceLinks.length === 0 && <p className="text-sm text-slate-500">No resource links available.</p>}
          {resourceLinks.length > 0 && (
            <div className="space-y-2">
              {resourceLinks.map((item, index) => (
                <div key={`${item.url}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                        {item.tag || getHostLabel(item.url)}
                      </Badge>
                      <p className="text-xs font-medium text-gray-900 truncate hover:text-blue-600">{item.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => handleOpenLinkModal(index)}
                      disabled={linkSaving}
                      title="Edit Link"
                    >
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" 
                      onClick={() => handleDeleteResourceLink(index)}
                      disabled={linkSaving}
                      title="Delete Link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Feed List Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[11px]">
                {Array.isArray(documents) ? documents.length : 0}
              </Badge>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1 hover:bg-slate-50"
                onClick={() => setIsUploadOpen(true)}
                disabled={deletingId !== null}
              >
                <Plus className="h-3.5 w-3.5" /> 
                Add Document
              </Button>
            </div>
          </div>

          {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
          {!documentsLoading && documents.length === 0 && <p className="text-sm text-slate-500">No documents available.</p>}
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((document) => {
                const isCurrentlyDeleting = deletingId === document.id;
                return (
                  <div 
                    key={document.id} 
                    role="button" 
                    tabIndex={0} 
                    onClick={() => !isCurrentlyDeleting && onPreviewDocument(document)} 
                    className={`flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors ${
                      isCurrentlyDeleting ? 'opacity-60 bg-slate-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">{document.documentType || 'Document'}</Badge>
                        <p className="min-w-0 text-left text-xs font-medium text-gray-900 truncate group-hover:text-blue-600">{document.fileName || 'Untitled document'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onPreviewDocument(document); }} disabled={documentsLoading || deletingId !== null} title="Preview"><Eye className="h-4 w-4 text-blue-600" /></Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onDownloadDocument(document); }} disabled={documentsLoading || deletingId !== null} title="Download"><Download className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteDocument(document.id); }} disabled={documentsLoading || deletingId !== null} title="Delete">
                        {isCurrentlyDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Newly Extracted Dynamic Reusable Link Component Modal */}
      <ResourceLinkDialog
        open={isLinkModalOpen}
        onClose={handleCloseLinkModal}
        item={linkIndexToEdit !== null ? resourceLinks[linkIndexToEdit] : null}
        saving={linkSaving}
        onSave={handleSaveResourceLink}
      />

      {/* Upload Dialog Modal */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => !uploading && !open && setIsUploadOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Select a file and assign a category tag to attach it directly to this profile.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <DocumentDropzone file={documentFile} onFileSelect={setDocumentFile} type={documentType} onTypeChange={setDocumentType} disabled={uploading} loading={uploading} isCreate={false} onImmediateUpload={handleImmediateUpload} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSummaryTab;