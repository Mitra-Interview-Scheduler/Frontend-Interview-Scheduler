import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { documentTypeAPI } from '@/services/catalogTypeAPI';

const FALLBACK_DOCUMENT_TYPES = [
  { code: 'CV', label: 'CV' },
  { code: 'PROFILE', label: 'Profile Picture' },
  { code: 'CERTIFICATE', label: 'Certificate' },
  { code: 'PORTFOLIO', label: 'Portfolio' },
  { code: 'OTHER', label: 'Other' },
];

export function DocumentDropzone({
  file,
  onFileSelect,
  onAddDocument,
  type,
  onTypeChange,
  disabled = false,
  isCreate = true,
  onImmediateUpload,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [typeOptions, setTypeOptions] = useState(FALLBACK_DOCUMENT_TYPES);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    documentTypeAPI.getActive()
      .then((data) => {
        if (cancelled) return;
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => item?.code && item?.label)
          .map((item) => ({ code: item.code, label: item.label }));
        if (options.length > 0) {
          setTypeOptions(options);
          if (onTypeChange && !options.some((opt) => opt.code === type)) {
            onTypeChange(options[0].code);
          }
        }
      })
      .catch(() => {
        // Keep fallback options if catalog API is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChosen = (selectedFile) => {
    if (!selectedFile) return;

    if (isCreate && onAddDocument) {
      onAddDocument(selectedFile, type);
      resetPicker();
      return;
    }

    onFileSelect?.(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChosen(droppedFile);
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-slate-200 mt-3">
      <div
        className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-4 text-center transition-colors hover:ring ring-primary cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 bg-muted/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-4 w-4 text-muted-foreground" />

        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isCreate
              ? 'Drop document here or click to add'
              : file
                ? file.name
                : 'Drop document here or click to upload'}
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
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) handleFileChosen(selectedFile);
        }}
        disabled={disabled}
      />

      <Select value={type} onValueChange={onTypeChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((opt) => (
            <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCreate ? (
        <p className="text-xs text-muted-foreground">
          Documents are added to the queue and uploaded when you save the candidate.
        </p>
      ) : (
        <Button
          type="button"
          onClick={onImmediateUpload}
          disabled={disabled || !file}
          className="gap-2 hover:ring ring-primary cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 " />
          Upload
        </Button>
      )}
    </div>
  );
}
