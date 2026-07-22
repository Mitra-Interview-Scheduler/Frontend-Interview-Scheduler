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
import { resourceTypeAPI } from '@/services/catalogTypeAPI';
import { useActiveCatalogTypes } from '@/hooks/useActiveCatalogTypes';

const FALLBACK_RESOURCE_TYPES = [
  { code: 'CV', label: 'CV' },
  { code: 'PROFILE_PICTURE', label: 'Profile Picture' },
  { code: 'CERTIFICATE', label: 'Certificate' },
  { code: 'PORTFOLIO', label: 'Portfolio' },
  { code: 'OTHER', label: 'Other' },
];

export function ResourceLinkDialog({
  open,
  onClose,
  item = null,
  saving = false,
  onSave,
}) {
  const [url, setUrl] = useState('');
  const [tagType, setTagType] = useState('CV');
  const [customTag, setCustomTag] = useState('');
  const { options: typeOptions, loading: typesLoading } = useActiveCatalogTypes(
    resourceTypeAPI.getActive,
    { enabled: open, fallback: FALLBACK_RESOURCE_TYPES },
  );

  useEffect(() => {
    if (!open) return;

    if (item) {
      setUrl(item.url || '');
      const matchByLabel = typeOptions.find((opt) => opt.label === item.tag);
      const matchByCode = typeOptions.find((opt) => opt.code === item.tag);
      const match = matchByLabel || matchByCode;
      if (match) {
        setTagType(match.code);
        setCustomTag('');
      } else if (item.tag) {
        const other = typeOptions.find((opt) => opt.code === 'OTHER') || typeOptions[typeOptions.length - 1];
        setTagType(other?.code || 'OTHER');
        setCustomTag(item.tag);
      } else {
        setTagType(typeOptions[0]?.code || 'CV');
        setCustomTag('');
      }
    } else {
      setUrl('');
      setTagType(typeOptions[0]?.code || 'CV');
      setCustomTag('');
    }
  }, [open, item, typeOptions]);

  const selectedType = typeOptions.find((opt) => opt.code === tagType);
  const isOther = selectedType?.code === 'OTHER' || selectedType?.label?.toLowerCase() === 'other';

  const handleSubmit = () => {
    if (!url.trim()) return;

    const finalTag = (isOther ? customTag : (selectedType?.label || tagType)).trim();
    if (!finalTag) return;

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
                const selected = typeOptions.find((opt) => opt.code === val);
                const isOtherOption = selected?.code === 'OTHER'
                  || selected?.label?.toLowerCase() === 'other';
                if (!isOtherOption) setCustomTag('');
              }}
              disabled={saving || typesLoading || typeOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={typesLoading ? 'Loading types…' : 'Select classification tag'} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOther && (
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
          <Button
            onClick={handleSubmit}
            disabled={saving || typesLoading || !url.trim() || (isOther && !customTag.trim()) || typeOptions.length === 0}
            className="min-w-[90px]"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
