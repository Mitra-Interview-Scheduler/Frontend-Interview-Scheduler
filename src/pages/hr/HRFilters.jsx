import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function HRFilters({
  departments = [], tiersForDept = [],
  selectedDept, setSelectedDept,
  selectedTier, setSelectedTier,
  tierFilterMode = 'min', setTierFilterMode = () => {},
}) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <div>
        <Label className="text-xs">Department</Label>
        <Select value={selectedDept || 'ALL'} onValueChange={(v) => setSelectedDept(v === 'ALL' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Tier</Label>
        <Select value={selectedTier || 'ALL'} onValueChange={(v) => setSelectedTier(v === 'ALL' ? '' : v)} disabled={!selectedDept}>
          <SelectTrigger><SelectValue placeholder={selectedDept ? 'All tiers' : 'Select department first'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tiers</SelectItem>
            {tiersForDept.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{`Tier ${t.tierOrder} – ${t.name}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <Label className="text-xs">Min tier (gte)</Label>
        <Switch checked={tierFilterMode === 'min'} onCheckedChange={(v) => setTierFilterMode(v ? 'min' : 'exact')} />
      </div>
    </div>
  );
}

