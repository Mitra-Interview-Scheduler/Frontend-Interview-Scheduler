import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, FileText, Link2, NotebookPen, Plus, Trash2, Pencil 
} from 'lucide-react';
import { ResourceLinkDialog } from './../../../../components/ResourceLinkDialog';
import { CandidateDocumentsPanel } from '@/components/CandidateDocumentsPanel';
import { candidateAPI } from '@/services/candidateAPI';
import { toast } from '@/hooks/use-toast';
import { parseJobDescriptionText } from '@/lib/jobDescriptionUtils';

const ProfileSummaryTab = ({
  candidate,
  documents = [],
  documentsLoading = false,
  onDocumentUploaded = () => {},
  onCandidateUpdated = () => {},
}) => {

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

      <CandidateDocumentsPanel
        candidateId={candidate?.id}
        documents={documents}
        documentsLoading={documentsLoading}
        onDocumentsRefresh={onDocumentUploaded}
      />

      <ResourceLinkDialog
        open={isLinkModalOpen}
        onClose={handleCloseLinkModal}
        item={linkIndexToEdit !== null ? resourceLinks[linkIndexToEdit] : null}
        saving={linkSaving}
        onSave={handleSaveResourceLink}
      />
    </div>
  );
};

export default ProfileSummaryTab;