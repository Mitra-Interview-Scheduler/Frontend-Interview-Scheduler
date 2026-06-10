import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export function DocumentDropzone({
  file,
  onFileSelect,
  type,
  onTypeChange,
  disabled = false,
  isCreate = true,
  onImmediateUpload,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
      onFileSelect(droppedFile);
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
            {file ? file.name : 'Drop document here or click to upload'}
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
          if (selectedFile) onFileSelect(selectedFile);
        }}
        disabled={disabled}
      />

      <Select value={type} onValueChange={onTypeChange} disabled={disabled}>
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
          {file
            ? 'This document will be uploaded when you add the candidate.'
            : 'Choose a document to upload with the candidate.'}
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