import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const RESOURCE_LINK_TAG_OPTIONS = ['CV', 'Profile Picture', 'Certificate', 'Portfolio', 'Other'];

export function ResourceLinkDialog({
  open,
  onClose,
  item = null, // If provided, populates form for edit mode; otherwise creates new link
  saving = false,
  onSave,
}) {
  const [url, setUrl] = useState('');
  const [tagType, setTagType] = useState('CV'); // Set default to 'CV'
  const [customTag, setCustomTag] = useState('');

  // Automatically parse and populate form inputs when modal triggers or active item shifts
  useEffect(() => {
    if (open) {
      if (item) {
        setUrl(item.url || '');
        const isStandardOption = ['CV', 'Profile Picture', 'Certificate', 'Portfolio'].includes(item.tag);
        if (isStandardOption) {
          setTagType(item.tag);
          setCustomTag('');
        } else if (item.tag) {
          setTagType('Other');
          setCustomTag(item.tag);
        } else {
          setTagType('CV'); // Fallback default to 'CV'
          setCustomTag('');
        }
      } else {
        setUrl('');
        setTagType('CV'); // Default for new link creation set to 'CV'
        setCustomTag('');
      }
    }
  }, [open, item]);

  const handleSubmit = () => {
    if (!url.trim()) return;
    
    const finalTag = (tagType === 'Other' ? customTag : tagType).trim();
    onSave({
      url: url.trim(),
      tag: finalTag,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !saving && !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Resource Link' : 'Add Resource Link'}</DialogTitle>
          <DialogDescription>
            Input target URL path directories and categorize with indexing markers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Drive / Resource URL *</Label>
            <Input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label>Category Tag</Label>
            <Select 
              value={tagType} 
              onValueChange={(val) => { 
                setTagType(val); 
                if (val !== 'Other') setCustomTag(''); 
              }} 
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select classification tag" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_LINK_TAG_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tagType === 'Other' && (
            <div className="space-y-2">
              <Label>Custom Tag Identification Marker</Label>
              <Input 
                value={customTag} 
                onChange={(e) => setCustomTag(e.target.value)} 
                placeholder="Enter distinctive tag label" 
                disabled={saving} 
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !url.trim()} className="min-w-[90px]">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}