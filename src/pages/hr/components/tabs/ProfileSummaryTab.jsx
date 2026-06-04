import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, ExternalLink, FileText, Link2, Loader2, NotebookPen } from 'lucide-react';

const ProfileSummaryTab = ({
  candidate,
  documents = [],
  documentsLoading = false,
  onPreviewDocument = () => {},
  onDownloadDocument = () => {},
}) => {
  const parseResourceLinks = (rawValue) => {
    if (!rawValue || !String(rawValue).trim()) return [];

    try {
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) {
        return [{ url: String(rawValue).trim(), tag: '' }];
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
        .map((url) => ({ url: url.trim(), tag: '' }))
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
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mt-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job Description</p>
            </div>
            {candidate.jdUrl ? (
              <a href={candidate.jdUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-sm text-blue-700 hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                {candidate.jdUrl}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-700">-</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{candidate.notes || '-'}</p>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resource Links</p>
            <Badge variant="outline" className="ml-auto rounded-full text-[11px]">{resourceLinks.length}</Badge>
          </div>
          {resourceLinks.length === 0 && <p className="text-sm text-slate-500">No resource links available.</p>}
          {resourceLinks.length > 0 && (
            <div className="space-y-2">
              {resourceLinks.map((item, index) => (
                <div key={`${item.url}-${index}`} role="button" tabIndex={0} onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.open(item.url, '_blank', 'noopener,noreferrer'); } }} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">{item.tag || getHostLabel(item.url)}</Badge>
                      <p className="text-xs font-medium text-gray-900 truncate hover:text-blue-600">{item.url}</p>
                    </div>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline shrink-0">
                    Open <ExternalLink className="h-3.5 w-3.5" />
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
            <Badge variant="outline" className="ml-auto rounded-full text-[11px]">{Array.isArray(documents) ? documents.length : 0}</Badge>
          </div>
          {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
          {!documentsLoading && documents.length === 0 && <p className="text-sm text-slate-500">No documents available.</p>}
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((document) => (
                <div key={document.id} role="button" tabIndex={0} onClick={() => onPreviewDocument(document)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPreviewDocument(document); } }} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="w-28 justify-center rounded-full text-[11px] font-medium shrink-0 truncate">{document.documentType || 'Document'}</Badge>
                      <p className="min-w-0 text-left text-xs font-medium text-gray-900 truncate group-hover:text-blue-600">{document.fileName || 'Untitled document'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(event) => { event.stopPropagation(); onPreviewDocument(document); }} title="Preview"><Eye className="h-4 w-4 text-blue-600" /></Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(event) => { event.stopPropagation(); onDownloadDocument(document); }} title="Download"><Download className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSummaryTab;