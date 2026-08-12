import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Download, Eye, FileText, Plus, Trash2,
} from 'lucide-react';
import { Spinner } from '@/components/ui/loading';
import { DocumentDropzone } from '@/components/DocumentDropzone';
import  candidateAPI from '@/services/candidateAPI';

import { toast } from '@/hooks/use-toast';
import { createDocumentObjectUrl, downloadBlobResponse, revokeObjectUrl } from '@/lib/documentUtils';
import InterviewDocumentPreviewDialog from '@/pages/interviewer/components/InterviewDocumentPreviewDialog';

export function CandidateDocumentsPanel({
  candidateId = null,
  documents = [],
  documentsLoading = false,
  onDocumentsRefresh = () => {},
  ensureCandidateId = null,
  readOnly = false,
  disabled = false,
  variant = 'card',
}) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('CV');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const resolveCandidateId = async () => {
    if (candidateId) return candidateId;
    if (!ensureCandidateId) {
      throw new Error('Save the candidate before uploading documents');
    }
    return ensureCandidateId();
  };

  const handleImmediateUpload = async () => {
    if (!documentFile) return;
    setUploading(true);
    try {
      const id = await resolveCandidateId();
      await candidateAPI.uploadCandidateDocument(id, documentFile, documentType || 'OTHER');
      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setDocumentFile(null);
      setDocumentType('CV');
      setIsUploadOpen(false);
      onDocumentsRefresh(id);
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: err.response?.data?.message || err.message || 'Failed to upload document.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!documentId) return;
    setDeletingId(documentId);
    try {
      const id = await resolveCandidateId();
      await candidateAPI.deleteCandidateDocument(id, documentId);
      toast({ title: 'Success', description: 'Document deleted successfully' });
      onDocumentsRefresh(id);
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

  const handleDownloadDocument = async (document) => {
    if (!document?.id) return;
    try {
      const id = candidateId || await resolveCandidateId();
      const response = await candidateAPI.downloadCandidateDocument(id, document.id);
      downloadBlobResponse(response, document);
    } catch (err) {
      toast({
        title: 'Download Failed',
        description: err.response?.data?.message || err.message || 'Failed to download document.',
        variant: 'destructive',
      });
    }
  };

  const closePreview = () => {
    revokeObjectUrl(previewUrl);
    setPreviewUrl(null);
    setSelectedDocument(null);
    setPreviewLoading(false);
  };

  const handlePreviewDocument = async (document) => {
    if (!document?.id) return;
    setSelectedDocument(document);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const id = candidateId || await resolveCandidateId();
      const response = await candidateAPI.downloadCandidateDocument(id, document.id);
      setPreviewUrl(createDocumentObjectUrl(response, document));
    } catch (err) {
      toast({
        title: 'Preview Failed',
        description: err.message || 'Failed to load document preview',
        variant: 'destructive',
      });
      closePreview();
    } finally {
      setPreviewLoading(false);
    }
  };

  const documentList = (
    <>
      {documentsLoading && <Spinner size="sm" className="text-muted-foreground mx-auto" />}
      {!documentsLoading && documents.length === 0 && (
        <p className="text-sm text-slate-500">No documents available.</p>
      )}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((document) => {
            const isCurrentlyDeleting = deletingId === document.id;
            return (
              <div
                key={document.id}
                role="button"
                tabIndex={0}
                onClick={() => !isCurrentlyDeleting && !readOnly && handlePreviewDocument(document)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCurrentlyDeleting && !readOnly) {
                    handlePreviewDocument(document);
                  }
                }}
                className={`flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors ${
                  isCurrentlyDeleting
                    ? 'opacity-60 bg-slate-50 cursor-not-allowed'
                    : readOnly
                      ? 'hover:bg-gray-50 cursor-pointer'
                      : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">
                      {document.documentType || 'Document'}
                    </Badge>
                    <p className="min-w-0 text-left text-xs font-medium text-gray-900 truncate">
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
                    onClick={(e) => { e.stopPropagation(); handlePreviewDocument(document); }}
                    disabled={documentsLoading || deletingId !== null}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => { e.stopPropagation(); handleDownloadDocument(document); }}
                    disabled={documentsLoading || deletingId !== null}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDocument(document.id); }}
                      disabled={documentsLoading || deletingId !== null || disabled}
                      title="Delete"
                    >
                      {isCurrentlyDeleting
                        ? <Spinner size="sm" className="text-red-600" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const uploadDialog = (
    <Dialog
      open={isUploadOpen}
      onOpenChange={(open) => {
        if (!uploading && !open) {
          setIsUploadOpen(false);
          setDocumentFile(null);
          setDocumentType('CV');
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a file and assign a category. The document uploads immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <DocumentDropzone
            file={documentFile}
            onFileSelect={setDocumentFile}
            type={documentType}
            onTypeChange={setDocumentType}
            disabled={uploading || disabled}
            isCreate={false}
            onImmediateUpload={handleImmediateUpload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  const previewDialog = (
    <InterviewDocumentPreviewDialog
      open={!!selectedDocument}
      document={selectedDocument}
      previewUrl={previewUrl}
      previewLoading={previewLoading}
      onClose={closePreview}
      onDownload={handleDownloadDocument}
    />
  );

  if (variant === 'embedded') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 hover:bg-slate-50"
              onClick={() => setIsUploadOpen(true)}
              disabled={deletingId !== null || disabled}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Document
            </Button>
          )}
        </div>
        {documentList}
        {uploadDialog}
        {previewDialog}
      </div>
    );
  }

  return (
    <>
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
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 hover:bg-slate-50"
                  onClick={() => setIsUploadOpen(true)}
                  disabled={deletingId !== null || disabled}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Document
                </Button>
              )}
            </div>
          </div>
          {documentList}
        </CardContent>
      </Card>
      {uploadDialog}
      {previewDialog}
    </>
  );
}

export default CandidateDocumentsPanel;
