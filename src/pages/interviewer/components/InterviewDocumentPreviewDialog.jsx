import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Loader2, FileText, X, ExternalLink } from 'lucide-react';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

function InterviewDocumentPreviewDialog({
  open,
  document,
  previewUrl,
  previewLoading,
  onClose,
  onDownload,
}) {
  const { formatDate } = useFormattedDateTime();
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={(dialogOpen) => !dialogOpen && onClose()}>
      <DialogContent className="max-w-full h-[100vh] flex flex-col p-0 bg-gradient-to-br from-slate-50 to-slate-100 border-0">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-blue-900 truncate">{document.fileName}</h2>
            <p className="text-blue-600 text-sm mt-1">{document.documentType} • Preview</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 shrink-0 ml-4 hover:bg-blue-100 text-blue-600"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden gap-0">
          <div className="flex-1 flex items-center justify-center bg-white p-2 border-b border-gray-200">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading document preview...</p>
              </div>
            ) : previewUrl ? (
              (() => {
                const docType = document?.documentType?.toLowerCase() || '';
                const fileName = document?.fileName?.toLowerCase() || '';
                const isPdf = docType.includes('pdf') || fileName.endsWith('.pdf');

                return isPdf ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0 rounded-lg"
                    title="Document Preview"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                    onError={(event) => {
                      console.error('Image load error:', event);
                      event.target.style.display = 'none';
                    }}
                  />
                );
              })()
            ) : (
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Unable to display preview</p>
              </div>
            )}
          </div>

          <div className=" border-t border-slate-600 flex flex-col shrink-0 max-h-48">
            <div className="flex-1 overflow-y-auto px-8 py-4">
              <div className="flex gap-8 flex-wrap items-center">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">File Name</p>
                  <p className="text-sm text-gray-900 font-medium">{document.fileName}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Type</p>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                    {document.documentType}
                  </Badge>
                </div>

                {document.fileSize && (
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Size</p>
                    <p className="text-sm text-gray-700 font-medium">
                      {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                {document.createdAt && (
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Uploaded</p>
                    <p className="text-sm text-gray-700 font-medium">
                      {formatDate(document.createdAt)}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 ml-3 mr-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!previewUrl) return;
                      window.open(previewUrl, '_blank', 'noopener,noreferrer');
                    }}
                    disabled={!previewUrl || previewLoading}
                    className="gap-2 text-sm h-9"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open In New Tab
                  </Button>
                  <Button
                    onClick={() => onDownload(document)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 text-sm h-9"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InterviewDocumentPreviewDialog;
