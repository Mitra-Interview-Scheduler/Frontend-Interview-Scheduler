import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Link2, NotebookPen, Plus, Trash2, SquarePen 
} from 'lucide-react';
import { ResourceLinkDialog } from './../../../../components/ResourceLinkDialog';
import { CandidateDocumentsPanel } from '@/components/CandidateDocumentsPanel';
import CandidateSkillsPanel from '@/components/CandidateSkillsPanel';
import CandidateDomainsPanel, { buildCandidateDomainPayload } from '@/components/CandidateDomainsPanel';
import  candidateAPI from '@/services/candidateAPI';

import { toast } from '@/hooks/use-toast';
import { parseJobDescriptionText, serializeJobDescriptionText } from '@/lib/jobDescriptionUtils';
import { CandidateFieldEditDialog, SectionEditButton } from '../CandidateFieldEditDialog';

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
  const [editField, setEditField] = useState(null);
  const [fieldSaving, setFieldSaving] = useState(false);

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
        ...buildCandidateDomainPayload(
          candidate,
          (candidate.domains || []).map((domain) => domain.id),
        ),
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

  const openFieldEditor = (field) => {
    setEditField(field);
  };

  const closeFieldEditor = () => {
    if (fieldSaving) return;
    setEditField(null);
  };

  const handleSaveField = async (value) => {
    if (!candidate?.id || !editField) return;
    setFieldSaving(true);
    try {
      const payload = {
        ...buildCandidateDomainPayload(
          candidate,
          (candidate.domains || []).map((domain) => domain.id),
        ),
        ...(editField === 'jd'
          ? { jdUrl: serializeJobDescriptionText(value) }
          : { notes: String(value ?? '').trim() || null }),
      };

      await candidateAPI.updateCandidate(candidate.id, payload);
      toast({
        title: 'Success',
        description: editField === 'jd' ? 'Job description updated' : 'Notes updated',
      });
      setEditField(null);
      onCandidateUpdated();
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.message || err.message || 'Failed to save changes.',
        variant: 'destructive',
      });
    } finally {
      setFieldSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Job Description Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mt-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job Description</p>
              </div>
              <SectionEditButton
                label={jobDescriptionText ? 'Edit job description' : 'Add job description'}
                onClick={() => openFieldEditor('jd')}
                disabled={fieldSaving}
              />
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
            </div>
            <SectionEditButton
              label={candidate.notes ? 'Edit notes' : 'Add notes'}
              onClick={() => openFieldEditor('notes')}
              disabled={fieldSaving}
            />
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{candidate.notes || '-'}</p>
        </CardContent>
      </Card>

      <CandidateDomainsPanel
        candidate={candidate}
        domains={candidate?.domains}
        onDomainsUpdated={onCandidateUpdated}
      />

      <CandidateSkillsPanel
        candidateId={candidate?.id}
        skills={candidate?.technologies}
        onSkillsUpdated={onCandidateUpdated}
      />

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
                      <SquarePen className="h-4 w-4 text-slate-600" />
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

      <CandidateFieldEditDialog
        open={Boolean(editField)}
        title={
          editField === 'jd'
            ? (jobDescriptionText ? 'Edit Job Description' : 'Add Job Description')
            : (candidate.notes ? 'Edit Notes' : 'Add Notes')
        }
        description={
          editField === 'jd'
            ? 'Paste or write the job description for this candidate.'
            : 'Add internal notes about this candidate.'
        }
        label={editField === 'jd' ? 'Job Description' : 'Notes'}
        initialValue={editField === 'jd' ? jobDescriptionText : (candidate.notes || '')}
        placeholder={
          editField === 'jd'
            ? 'Paste or write the job description...'
            : 'Additional notes...'
        }
        rows={editField === 'jd' ? 10 : 6}
        saving={fieldSaving}
        onClose={closeFieldEditor}
        onSave={handleSaveField}
      />
    </div>
  );
};

export default ProfileSummaryTab;