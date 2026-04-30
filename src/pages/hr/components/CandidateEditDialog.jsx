import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Hash, Link, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI } from '@/services/tierAPI';

const CANDIDATE_STATUSES = [
  'APPLIED','SCREENING','SCHEDULED','INTERVIEWED',
  'TECHNICAL_ROUND','HR_ROUND','SELECTED','REJECTED','WITHDRAWN','ON_HOLD',
];

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  departmentId: '', tierId: '', targetDesignationId: '',
  yearsOfExperience: '',
  resumeUrl: '', jdUrl: '', jobReferenceCode: '', location: '',
  notes: '', status: 'APPLIED',
};

function CandidateEditDialog({ 
  open, 
  candidate, 
  departments = [],
  onOpenChange, 
  onSaveSuccess 
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState([]);
  const [desigs, setDesigs] = useState([]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open || !candidate) return;
    
    const newForm = {
      name:              candidate.name || '',
      email:             candidate.email || '',
      phone:             candidate.phone || '',
      departmentId:      candidate.departmentId?.toString() || '',
      tierId:            candidate.tierId?.toString() || '',
      targetDesignationId: candidate.targetDesignationId?.toString() || '',
      yearsOfExperience: candidate.yearsOfExperience?.toString() || '',
      resumeUrl:         candidate.resumeUrl || '',
      jdUrl:             candidate.jdUrl || '',
      jobReferenceCode:  candidate.jobReferenceCode || '',
      location:          candidate.location || '',
      notes:             candidate.notes || '',
      status:            candidate.status || 'APPLIED',
    };
    
    setForm(newForm);
    setTiers([]);
    setDesigs([]);
    setError('');
    setSaving(false);

    // Pre-load cascades
    if (candidate.departmentId) {
      loadTiersForDept(candidate.departmentId);
      if (candidate.tierId) {
        loadDesignsForTier(candidate.tierId);
      }
    }
  }, [open, candidate]);

  const loadTiersForDept = async (deptId) => {
    if (!deptId) { setTiers([]); return; }
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId));
      setTiers(data.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { 
      console.error(e); 
      setTiers([]); 
    }
  };

  const loadDesignsForTier = async (tierId) => {
    if (!tierId) { setDesigs([]); return; }
    try {
      const data = await designationAPI.getDesignationsByTier(parseInt(tierId));
      setDesigs(data.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (e) { 
      console.error(e); 
      setDesigs([]); 
    }
  };

  const handleDeptChange = async (val) => {
    setForm((f) => ({ ...f, departmentId: val, tierId: '', targetDesignationId: '' }));
    setDesigs([]);
    await loadTiersForDept(val);
  };

  const handleTierChange = async (val) => {
    setForm((f) => ({ ...f, tierId: val, targetDesignationId: '' }));
    await loadDesignsForTier(val);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required');
      return;
    }

    const payload = {
      name:              form.name.trim(),
      email:             form.email.trim(),
      phone:             form.phone?.trim() || null,
      departmentId:      form.departmentId ? parseInt(form.departmentId) : null,
      targetDesignationId: form.targetDesignationId ? parseInt(form.targetDesignationId) : null,
      status:            form.status,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : null,
      resumeUrl:         form.resumeUrl?.trim() || null,
      jdUrl:             form.jdUrl?.trim() || null,
      jobReferenceCode:  form.jobReferenceCode?.trim() || null,
      location:          form.location?.trim() || null,
      notes:             form.notes?.trim() || null,
    };

    setSaving(true);
    setError('');

    try {
      await candidateAPI.updateCandidate(candidate.id, payload);
      toast({ title: 'Success', description: 'Candidate updated successfully' });
      onOpenChange(false);
      onSaveSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError('');
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}> 
      <DialogContent >
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">

          {/* Name */}
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name" 
              disabled={saving} 
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input 
              type="email" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com" 
              disabled={saving} 
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1234567890" 
              disabled={saving} 
            />
          </div>

          {/* Years of experience */}
          <div className="space-y-2">
            <Label>Years of Experience</Label>
            <Input 
              type="number" 
              min="0" 
              value={form.yearsOfExperience}
              onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
              placeholder="5" 
              disabled={saving} 
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Location
            </Label>
            <Input 
              value={form.location} 
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, Country" 
              disabled={saving} 
            />
          </div>

          {/* Job Reference Code */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> Job Reference Code
            </Label>
            <Input 
              value={form.jobReferenceCode} 
              onChange={(e) => setForm({ ...form, jobReferenceCode: e.target.value })}
              placeholder="REQ-2024-001" 
              disabled={saving} 
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={form.status} 
              onValueChange={(v) => setForm({ ...form, status: v })} 
              disabled={saving}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANDIDATE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Select 
              value={form.departmentId || 'NONE'} 
              onValueChange={(v) => handleDeptChange(v === 'NONE' ? '' : v)}
              disabled={saving}
            >
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tier */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Tier
            </Label>
            <Select 
              value={form.tierId || 'NONE'}
              onValueChange={(v) => handleTierChange(v === 'NONE' ? '' : v)}
              disabled={saving || !form.departmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.departmentId ? 'Select tier' : 'Select department first'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    Tier {t.tierOrder} – {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Designation */}
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Target Designation
            </Label>
            <Select 
              value={form.targetDesignationId || 'NONE'}
              onValueChange={(v) => setForm({ ...form, targetDesignationId: v === 'NONE' ? '' : v })}
              disabled={saving || !form.tierId}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.tierId ? 'Select designation' : 'Select tier first'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {desigs.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    Level {d.levelOrder} – {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resume URL */}
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1">
              <Link className="w-3.5 h-3.5" /> Resume URL
            </Label>
            <Input 
              value={form.resumeUrl} 
              onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
              placeholder="https://drive.google.com/..." 
              disabled={saving} 
            />
          </div>

          {/* JD URL */}
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1">
              <Link className="w-3.5 h-3.5" /> Job Description URL
            </Label>
            <Input 
              value={form.jdUrl} 
              onChange={(e) => setForm({ ...form, jdUrl: e.target.value })}
              placeholder="https://careers.company.com/jd/..." 
              disabled={saving} 
            />
          </div>

          {/* Notes */}
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..." 
              rows={3} 
              disabled={saving} 
            />
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="md:col-span-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[110px]">
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Update'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CandidateEditDialog;
