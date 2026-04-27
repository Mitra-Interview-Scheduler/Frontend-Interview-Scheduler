// src/pages/hr/CandidatesPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Manages candidates with:
//  • 3-level cascade: Department → Tier → Designation
//  • New fields: JD URL, Job Reference Code, Location
//  • Global email uniqueness validation
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge }    from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, Mail, Phone, Edit, Loader2, MapPin, Hash, Link,
  TrendingUp, Award, Users,
  CalendarClockIcon,
} from 'lucide-react';
import { motion }   from 'framer-motion';
import { toast }    from '@/hooks/use-toast';
import { candidateAPI }   from '@/services/candidateAPI';
import { departmentAPI }  from '@/services/departmentAPI';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI }        from '@/services/tierAPI';
import CandidateEditDialog from './components/CandidateEditDialog';

// ── Constants ─────────────────────────────────────────────────────────────────
const CANDIDATE_STATUSES = [
  'APPLIED','SCREENING','SCHEDULED','INTERVIEWED',
  'TECHNICAL_ROUND','HR_ROUND','SELECTED','REJECTED','WITHDRAWN','ON_HOLD',
];

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  departmentId: '', tierId: '', targetDesignationId: '',
  yearsOfExperience: '',
  resumeUrl: '', jdUrl: '', jobReferenceCode: '', location: '',
  notes: '',
};

// ── Status badge colours ──────────────────────────────────────────────────────
const STATUS_COLORS = {
  APPLIED:        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SCREENING:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  SCHEDULED:      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  INTERVIEWED:    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  TECHNICAL_ROUND:'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  HR_ROUND:       'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  SELECTED:       'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED:       'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WITHDRAWN:      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  ON_HOLD:        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

// ── Component ─────────────────────────────────────────────────────────────────
const CandidatesPage = () => {
  const [candidates,   setCandidates]   = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [searchTerm,    setSearchTerm]   = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus,  setFilterStatus] = useState('ALL');
  const [loading,       setLoading]      = useState(true);
  const [isMutating,    setIsMutating]   = useState(false);

  // ── Add dialog state ────────────────────────────────────────────────────────
  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [addForm,      setAddForm]      = useState(EMPTY_FORM);
  const [addTiers,     setAddTiers]     = useState([]);
  const [addDesigs,    setAddDesigs]    = useState([]);

  // ── Edit dialog state ───────────────────────────────────────────────────────
  const [isEditOpen,   setIsEditOpen]   = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    const id = setTimeout(applyFilters, 300);
    return () => clearTimeout(id);
  }, [filterDepartment, filterStatus, searchTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [cands, depts] = await Promise.all([
        candidateAPI.getAllCandidates(),
        departmentAPI.getAllDepartments(),
      ]);
      setCandidates(cands || []);
      setDepartments(depts || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load candidates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterDepartment !== 'ALL') filters.departmentId = parseInt(filterDepartment);
      if (filterStatus !== 'ALL')    filters.status = filterStatus;
      if (searchTerm.trim())          filters.search = searchTerm.trim();
      const data = await candidateAPI.getAllCandidates(filters);
      setCandidates(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to filter candidates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Cascade helpers ───────────────────────────────────────────────────────
  const loadTiersForDept = async (deptId, setTiers) => {
    if (!deptId) { setTiers([]); return; }
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId));
      setTiers(data.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { console.error(e); setTiers([]); }
  };

  const loadDesignsForTier = async (tierId, setDesigs) => {
    if (!tierId) { setDesigs([]); return; }
    try {
      const data = await designationAPI.getDesignationsByTier(parseInt(tierId));
      setDesigs(data.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (e) { console.error(e); setDesigs([]); }
  };

  // ── Add dialog handlers ───────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddTiers([]);
    setAddDesigs([]);
    setIsAddOpen(true);
  };

  const handleAddDeptChange = async (val) => {
    setAddForm((f) => ({ ...f, departmentId: val, tierId: '', targetDesignationId: '' }));
    setAddDesigs([]);
    await loadTiersForDept(val, setAddTiers);
  };

  const handleAddTierChange = async (val) => {
    setAddForm((f) => ({ ...f, tierId: val, targetDesignationId: '' }));
    await loadDesignsForTier(val, setAddDesigs);
  };

  const handleAddSubmit = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast({ title: 'Validation Error', description: 'Name and email are required', variant: 'destructive' });
      return;
    }
    const payload = {
      name:              addForm.name.trim(),
      email:             addForm.email.trim(),
      phone:             addForm.phone?.trim()             || null,
      departmentId:      addForm.departmentId              ? parseInt(addForm.departmentId) : null,
      targetDesignationId: addForm.targetDesignationId     ? parseInt(addForm.targetDesignationId) : null,
      yearsOfExperience: addForm.yearsOfExperience         ? parseInt(addForm.yearsOfExperience) : null,
      resumeUrl:         addForm.resumeUrl?.trim()         || null,
      jdUrl:             addForm.jdUrl?.trim()             || null,
      jobReferenceCode:  addForm.jobReferenceCode?.trim()  || null,
      location:          addForm.location?.trim()          || null,
      notes:             addForm.notes?.trim()             || null,
    };
    setIsMutating(true);
    try {
      await candidateAPI.createCandidate(payload);
      await applyFilters();
      setIsAddOpen(false);
      toast({ title: 'Success', description: 'Candidate added successfully' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to add candidate',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  // ── Edit dialog handlers ──────────────────────────────────────────────────
  const handleOpenEdit = (candidate) => {
    setSelectedCandidate(candidate);
    setIsEditOpen(true);
  };

  // ── Shared form fields renderer ───────────────────────────────────────────
  const renderFormFields = (form, setForm, tiers, desigs, onDeptChange, onTierChange, includeStatus) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">

      {/* Name */}
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name" disabled={isMutating} />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label>Email *</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@example.com" disabled={isMutating} />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+1234567890" disabled={isMutating} />
      </div>

      {/* Years of experience */}
      <div className="space-y-2">
        <Label>Years of Experience</Label>
        <Input type="number" min="0" value={form.yearsOfExperience}
          onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
          placeholder="5" disabled={isMutating} />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</Label>
        <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="City, Country" disabled={isMutating} />
      </div>

      {/* Job Reference Code */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> Job Reference Code</Label>
        <Input value={form.jobReferenceCode} onChange={(e) => setForm({ ...form, jobReferenceCode: e.target.value })}
          placeholder="REQ-2024-001" disabled={isMutating} />
      </div>

      {/* Status (edit only) */}
      {includeStatus && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={isMutating}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CANDIDATE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── 3-level cascade: Department → Tier → Designation ── */}
      {/* Department */}
      <div className="space-y-2">
        <Label>Department</Label>
        <Select value={form.departmentId || 'NONE'} onValueChange={(v) => onDeptChange(v === 'NONE' ? '' : v)}
          disabled={isMutating}>
          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tier */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Tier</Label>
        <Select value={form.tierId || 'NONE'}
          onValueChange={(v) => onTierChange(v === 'NONE' ? '' : v)}
          disabled={isMutating || !form.departmentId}>
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
        <Label className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Target Designation</Label>
        <Select value={form.targetDesignationId || 'NONE'}
          onValueChange={(v) => setForm({ ...form, targetDesignationId: v === 'NONE' ? '' : v })}
          disabled={isMutating || !form.tierId}>
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
        <Label className="flex items-center gap-1"><Link className="w-3.5 h-3.5" /> Resume URL</Label>
        <Input value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
          placeholder="https://drive.google.com/..." disabled={isMutating} />
      </div>

      {/* JD URL */}
      <div className="space-y-2 md:col-span-2">
        <Label className="flex items-center gap-1"><Link className="w-3.5 h-3.5" /> Job Description URL</Label>
        <Input value={form.jdUrl} onChange={(e) => setForm({ ...form, jdUrl: e.target.value })}
          placeholder="https://careers.company.com/jd/..." disabled={isMutating} />
      </div>

      {/* Notes */}
      <div className="space-y-2 md:col-span-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Additional notes..." rows={3} disabled={isMutating} />
      </div>
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && candidates.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading candidates…</span>
        </div>
      </Layout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
            <p className="text-muted-foreground">Manage and track all candidates</p>
          </div>
          <Button onClick={handleOpenAdd} disabled={isMutating} className="gap-2">
            <Plus className="w-4 h-4" /> Add Candidate
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or email…" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  {CANDIDATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No candidates found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate, index) => (
                  <motion.div key={candidate.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-4">

                          {/* Name + status */}
                          <div className="w-48 shrink-0">
                            <h3 className="font-semibold text-base truncate">{candidate.name}</h3>
                            <Badge className={`${STATUS_COLORS[candidate.status] || 'bg-gray-100 text-gray-800'} text-xs mt-1`}>
                              {candidate.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          {/* Contact */}
                          <div className="flex-1 min-w-0 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{candidate.email}</span>
                            </div>
                            {candidate.phone && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{candidate.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Designation / tier / location / ref code */}
                          <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
                            {candidate.targetDesignationName && (
                              <div className="whitespace-nowrap">
                                <span className="font-medium text-foreground">{candidate.targetDesignationName}</span>
                                {candidate.tierName && <span className="ml-1 text-xs">({candidate.tierName})</span>}
                              </div>
                            )}
                            {candidate.location && (
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <MapPin className="w-3 h-3" />
                                <span className="text-xs">{candidate.location}</span>
                              </div>
                            )}
                            {candidate.jobReferenceCode && (
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Hash className="w-3 h-3" />
                                <span className="text-xs">{candidate.jobReferenceCode}</span>
                              </div>
                            )}
                            {candidate.departmentName && (
                              <span className="whitespace-nowrap text-xs">{candidate.departmentName}</span>
                            )}
                            {candidate.yearsOfExperience && (
                              <span className="whitespace-nowrap text-xs">{candidate.yearsOfExperience}y exp</span>
                            )}
                          </div>

                          {/* Applied date */}
                          <div className="hidden xl:block text-xs text-muted-foreground whitespace-nowrap w-24 text-right">
                            {new Date(candidate.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>

                          {/* Edit button */}
                          <div className="flex gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(candidate)} disabled={isMutating} title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>

                              <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(candidate)} disabled={isMutating} title="calender">
                              <CalendarClockIcon className="w-3.5 h-3.5" />
                            </Button>



                          </div>
                        </div>


                        
                       

                        {/* Mobile extra row */}
                        <div className="lg:hidden mt-2 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {candidate.targetDesignationName && (
                            <span>
                              <span className="font-medium text-foreground">Target:</span>{' '}
                              {candidate.targetDesignationName}{candidate.tierName && ` (${candidate.tierName})`}
                            </span>
                          )}
                          {candidate.location && (
                            <span><span className="font-medium text-foreground">Location:</span> {candidate.location}</span>
                          )}
                          {candidate.jobReferenceCode && (
                            <span><span className="font-medium text-foreground">Ref:</span> {candidate.jobReferenceCode}</span>
                          )}
                          {candidate.departmentName && (
                            <span><span className="font-medium text-foreground">Dept:</span> {candidate.departmentName}</span>
                          )}
                          {candidate.yearsOfExperience && (
                            <span><span className="font-medium text-foreground">Exp:</span> {candidate.yearsOfExperience} years</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ ADD DIALOG ═══════════════════════════════════════════════════ */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
            </DialogHeader>
            {renderFormFields(
              addForm, setAddForm,
              addTiers, addDesigs,
              handleAddDeptChange, handleAddTierChange,
              false  // no status field on create
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isMutating}>Cancel</Button>
              <Button onClick={handleAddSubmit} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CandidateEditDialog
          open={isEditOpen}
          candidate={selectedCandidate}
          departments={departments}
          onOpenChange={setIsEditOpen}
          onSaveSuccess={applyFilters}
        />
      </div>
    </Layout>
  );
};

export default CandidatesPage;