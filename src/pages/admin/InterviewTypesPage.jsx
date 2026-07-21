import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Edit, Trash2, ListChecks, Loader2, Lock, FileText, GitBranch, CalendarClock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { interviewTypeAPI } from '@/services/interviewTypeAPI';
import { masterStepAPI } from '@/services/masterStepApi';
import DepartmentAPI from '@/services/departmentAPI';
import { domainAPI } from '@/services/domainAPI';
import { technologyAPI } from '@/services/technologyAPI';
import InterviewTypeFilterRulesFields, {
  defaultFilterRules,
  filterRulesFromType,
  FILTER_MODE,
} from './InterviewTypeFilterRulesFields';

const NONE_VALUE = '__none__';

/** "Manager Interview" → MANAGER_INTERVIEW (preview only; uniqueness is server-side) */
const slugifyFromLabel = (label) => {
  if (!label?.trim()) return '';
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

const emptyForm = {
  code: '',
  label: '',
  description: '',
  active: true,
  displayOrder: 0,
  roundStatusKey: '',
  cancelRestoreStatusKey: 'SCREENING',
  filterRules: defaultFilterRules(),
};

const InterviewTypesPage = () => {
  const [candidateSteps, setCandidateSteps] = useState([]);
  const [types, setTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        typeData,
        stepData,
        deptData,
        domainData,
        categoryData,
        techData,
      ] = await Promise.all([
        interviewTypeAPI.getAll(false),
        masterStepAPI.getAllActiveSteps(),
        DepartmentAPI.getAllDepartments(),
        domainAPI.getAllDomains(),
        technologyAPI.getAllCategories(),
        technologyAPI.getAllTechnologies(),
      ]);
      setTypes(Array.isArray(typeData) ? typeData : []);
      setCandidateSteps(Array.isArray(stepData) ? stepData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setDomains(Array.isArray(domainData) ? domainData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setTechnologies(Array.isArray(techData) ? techData : []);
    } catch (error) {
      console.error('Error loading interview types:', error);
      toast({ title: 'Error', description: 'Failed to load interview types', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    const maxOrder = types.reduce((max, t) => Math.max(max, Number(t.displayOrder) || 0), 0);
    setForm({ ...emptyForm, displayOrder: maxOrder + 1 });
    setDialogOpen(true);
  };

  const openEdit = (type) => {
    setEditing(type);
    setForm({
      code: type.code || '',
      label: type.label || '',
      description: type.description || '',
      active: type.active !== false,
      displayOrder: type.displayOrder ?? 0,
      roundStatusKey: type.roundStatusKey || '',
      cancelRestoreStatusKey: type.cancelRestoreStatusKey || '',
      filterRules: filterRulesFromType(type),
    });
    setDialogOpen(true);
  };

  const validateFilterRules = (rules) => {
    if (rules.departmentFilterMode === FILTER_MODE.FIXED && !rules.fixedDepartmentId) {
      return 'Select a fixed department';
    }
    if (rules.tierFilterMode === FILTER_MODE.FIXED && !rules.fixedMinTierId) {
      return 'Select a fixed minimum tier';
    }
    if (rules.designationFilterMode === FILTER_MODE.FIXED) {
      if (rules.tierFilterMode !== FILTER_MODE.FIXED || !rules.fixedMinTierId) {
        return 'Fixed designation requires a fixed minimum tier';
      }
      if (!rules.fixedMinDesignationId) {
        return 'Select a fixed minimum designation';
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!form.label?.trim()) {
      toast({ title: 'Validation', description: 'Label is required', variant: 'destructive' });
      return;
    }
    if (!editing && !slugifyFromLabel(form.label)) {
      toast({
        title: 'Validation',
        description: 'Label must contain letters or digits to generate a code',
        variant: 'destructive',
      });
      return;
    }
    const filterError = validateFilterRules(form.filterRules);
    if (filterError) {
      toast({ title: 'Validation', description: filterError, variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      const payload = {
        label: form.label.trim(),
        description: form.description?.trim() || null,
        active: form.active,
        displayOrder: Number(form.displayOrder) || 0,
        cancelRestoreStatusKey: form.cancelRestoreStatusKey || null,
        filterRules: form.filterRules,
      };
      if (editing) {
        await interviewTypeAPI.update(editing.id, {
          ...payload,
          roundStatusKey: form.roundStatusKey || null,
        });
        toast({ title: 'Saved', description: `${form.label} updated` });
      } else {
        await interviewTypeAPI.create(payload);
        toast({ title: 'Created', description: `${form.label} added` });
      }
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save interview type',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const requestDelete = (type) => {
    if (type.isSystem) return;
    setDeleteTarget(type);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.isSystem) return;
    const type = deleteTarget;
    setIsMutating(true);
    try {
      await interviewTypeAPI.delete(type.id);
      toast({ title: 'Deleted', description: `${type.label} removed` });
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete interview type',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const stepLabel = (key) => {
    if (!key) return '—';
    const step = candidateSteps.find((s) => s.key === key);
    return step ? step.label : key;
  };

  const StatusSelect = ({ value, onChange }) => (
    <Select
      value={value || NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? '' : v)}
      disabled={isMutating}
    >
      <SelectTrigger><SelectValue placeholder="None (generic scheduled)" /></SelectTrigger>
      <SelectContent className="max-h-64">
        <SelectItem value={NONE_VALUE}>None (generic scheduled)</SelectItem>
        {candidateSteps.map((s) => (
          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Interview Types</h1>
            <p className="text-muted-foreground text-lg">
              Configure the interview types HR can schedule (e.g. Technical, HR, Manager, Assessment).
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add Type
          </Button>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" /> Interview Types ({types.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : types.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No interview types yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {types.map((type) => (
                  <div
                    key={type.id}
                    className={`border rounded-lg p-4 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow ${
                      type.active === false ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{type.label}</p>
                        {type.isSystem && (
                          <Badge variant="outline" className="text-[10px] gap-1"><Lock className="w-3 h-3" /> System</Badge>
                        )}
                        {type.active === false && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      </div>
                      {type.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{type.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Pipeline: {stepLabel(type.roundStatusKey)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(type)} disabled={isMutating}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestDelete(type)}
                        disabled={isMutating || type.isSystem}
                        title={type.isSystem ? 'System types cannot be deleted' : 'Delete'}
                        className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!isMutating) setDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-w-[95vw] p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-slate-50 via-white to-sky-50/60 px-6 py-5 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200/80">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg">
                  {editing ? 'Edit interview type' : 'Create interview type'}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed">
                  {editing
                    ? 'Update details, pipeline mapping, and interviewer matching rules.'
                    : 'Define how this type appears in scheduling, where candidates move in the pipeline, and who can interview.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="px-6 py-5 space-y-4">
            <section className="rounded-xl border bg-white p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FileText className="h-4 w-4 text-sky-600" />
                Details
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Label <span className="text-red-400 normal-case">*</span>
                </Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Manager Interview"
                  disabled={isMutating}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short note for admins (optional)"
                  disabled={isMutating}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Display order
                  </Label>
                  <Input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                    disabled={isMutating}
                    className="h-10"
                  />
                  {!editing && (
                    <p className="text-[11px] text-muted-foreground">
                      Pre-filled after existing types.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Availability
                  </Label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm text-muted-foreground">Available for scheduling</span>
                    <Switch
                      checked={form.active}
                      onCheckedChange={(v) => setForm({ ...form, active: v === true })}
                      disabled={isMutating}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-white p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <GitBranch className="h-4 w-4 text-sky-600" />
                Pipeline
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {editing
                  ? 'Choose which candidate pipeline stage this type advances to, and where to restore on cancel.'
                  : 'A pipeline stage is created automatically from the label (like Technical / HR rounds). On cancel defaults to Screening unless you change it.'}
              </p>
              {editing && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Advances candidate to
                  </Label>
                  <StatusSelect
                    value={form.roundStatusKey}
                    onChange={(v) => setForm({ ...form, roundStatusKey: v })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  On cancel, restore to
                </Label>
                <StatusSelect
                  value={form.cancelRestoreStatusKey}
                  onChange={(v) => setForm({ ...form, cancelRestoreStatusKey: v })}
                />
              </div>
            </section>

            <InterviewTypeFilterRulesFields
              rules={form.filterRules}
              onChange={(filterRules) => setForm({ ...form, filterRules })}
              disabled={isMutating}
              departments={departments}
              domains={domains}
              categories={categories}
              technologies={technologies}
            />
          </DialogBody>

          <DialogFooter className="px-6 py-4 bg-slate-50/80">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isMutating} className="min-w-[110px]">
              {isMutating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                editing ? 'Save changes' : 'Create type'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isMutating) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete interview type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.label}"? If it's already used in schedules it will be deactivated instead of removed.`
                : 'This action cannot be undone for unused types.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isMutating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default InterviewTypesPage;
