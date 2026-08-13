import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, FileDown, FileUp, XCircle, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { summarizeImportResult } from '@/lib/excelImportExport';

/**
 * Shared Import / Export controls for Excel (.xlsx) master-data flows.
 * After import, shows a results dialog with passed / skipped / failed counts.
 */
export function ExcelImportExportButtons({
  onExport,
  onImport,
  onImported,
  disabled = false,
  exportLabel = 'Export',
  importLabel = 'Import',
  className = '',
}) {
  const inputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const busy = exporting || importing;

  const handleExport = async () => {
    if (!onExport) return;
    setExporting(true);
    try {
      await onExport();
      toast({ title: 'Exported', description: 'Excel file downloaded' });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error.response?.data?.message || error.message || 'Could not export Excel',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onImport) return;

    setImporting(true);
    try {
      const result = await onImport(file);
      setImportResult(result || { created: 0, skipped: 0, failed: 0, errors: [], messages: [] });
      setResultOpen(true);
      toast({
        title: Number(result?.failed || 0) > 0 ? 'Import completed with errors' : 'Import completed',
        description: summarizeImportResult(result),
        variant: Number(result?.failed || 0) > 0 ? 'destructive' : 'default',
      });
      await onImported?.(result);
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error.response?.data?.message || error.message || 'Could not import Excel',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const created = Number(importResult?.created || 0);
  const skipped = Number(importResult?.skipped || 0);
  const failed = Number(importResult?.failed || 0);
  const total = created + skipped + failed;
  const errors = Array.isArray(importResult?.errors) ? importResult.errors : [];
  const messages = Array.isArray(importResult?.messages) ? importResult.messages : [];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        disabled={disabled || busy || !onExport}
        loading={exporting}
        className="gap-2"
      >
        <FileUp className="h-4 w-4" />
        {exportLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy || !onImport}
        loading={importing}
        className="gap-2"
      >
        <FileDown className="h-4 w-4" />
        {importLabel}
      </Button>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import results</DialogTitle>
            <DialogDescription>
              {total > 0
                ? `${total} row${total === 1 ? '' : 's'} processed from the Excel file.`
                : 'No data rows were processed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-emerald-700">{created}</p>
              <p className="text-xs text-emerald-800">Passed</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <SkipForward className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-amber-700">{skipped}</p>
              <p className="text-xs text-amber-800">Skipped</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700">
                <XCircle className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-red-700">{failed}</p>
              <p className="text-xs text-red-800">Failed</p>
            </div>
          </div>

          {(errors.length > 0 || messages.length > 0) && (
            <div className="max-h-56 space-y-3 overflow-auto rounded-lg border bg-muted/30 p-3 text-sm">
              {errors.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-destructive">Failed rows</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {errors.map((item, index) => (
                      <li key={`err-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {messages.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-amber-700">Skipped rows</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {messages.map((item, index) => (
                      <li key={`msg-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setResultOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

ExcelImportExportButtons.propTypes = {
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  onImported: PropTypes.func,
  disabled: PropTypes.bool,
  exportLabel: PropTypes.string,
  importLabel: PropTypes.string,
  className: PropTypes.string,
};

export default ExcelImportExportButtons;
