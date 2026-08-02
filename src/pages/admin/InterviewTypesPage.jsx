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
import { Label } from '@/components/ui/label';
import {
  Plus, Edit, Trash2, ListChecks, Loader2, Lock, FileText, GitBranch, CalendarClock, RotateCcw,
  Users, ClipboardList,
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
  noInterviewerFilterRules,
  FILTER_MODE,
} from './InterviewTypeFilterRulesFields';
import DeleteInterviewTypeDialog from './components/DeleteInterviewTypeDialog';

const NONE_VALUE = '__none__';

/** Coerce API / form values to a real boolean (avoids string "false" being truthy). */
const toBool = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'false' || value === 0 || value === '0') return false;
  if (value === 'true' || value === 1 || value === '1') return true;
  return Boolean(value);
};

/** Read meeting flag from API (supports camelCase / snake_case). */
const readCreateCalendarMeeting = (type) =>
  toBool(type?.createCalendarMeeting ?? type?.create_calendar_meeting, true);

/** Read interviewer-required flag from API. */
const readRequiresInterviewer = (type) =>
  toBool(type?.requiresInterviewer ?? type?.requires_interviewer, true);

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
  createCalendarMeeting: true,
  requiresInterviewer: true,
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
  const [reactivatingId, setReactivatingId] = useState(null);

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
      createCalendarMeeting: readCreateCalendarMeeting(type),
      requiresInterviewer: readRequiresInterviewer(type),
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
    const requiresInterviewer = readRequiresInterviewer(form);
    const filterError = requiresInterviewer ? validateFilterRules(form.filterRules) : null;
    if (filterError) {
      toast({ title: 'Validation', description: filterError, variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      const createCalendarMeeting = readCreateCalendarMeeting(form);
      const payload = {
        label: form.label.trim(),
        description: form.description?.trim() || null,
        active: editing ? form.active !== false : true,
        displayOrder: Number(form.displayOrder) || 0,
        cancelRestoreStatusKey: form.cancelRestoreStatusKey || null,
        createCalendarMeeting: requiresInterviewer ? createCalendarMeeting : false,
        requiresInterviewer,
        filterRules: requiresInterviewer ? form.filterRules : noInterviewerFilterRules(),
      };
      let saved;
      if (editing) {
        saved = await interviewTypeAPI.update(editing.id, {
          ...payload,
          roundStatusKey: form.roundStatusKey || null,
        });
        toast({
          title: 'Saved',
          description: `${form.label} updated · meeting ${readCreateCalendarMeeting(saved) ? 'on' : 'off'}`,
        });
      } else {
        saved = await interviewTypeAPI.create(payload);
        toast({
          title: 'Created',
          description: `${form.label} added · meeting ${readCreateCalendarMeeting(saved) ? 'on' : 'off'}`,
        });
      }
      if (saved && saved.createCalendarMeeting === undefined && saved.create_calendar_meeting === undefined) {
        toast({
          title: 'Warning',
          description: 'Backend did not return createCalendarMeeting. Restart the backend so migration V80 is applied.',
          variant: 'destructive',
        });
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

  const handleReactivate = async (type) => {
    if (!type?.id || type.active !== false) return;
    setReactivatingId(type.id);
    try {
      await interviewTypeAPI.reactivate(type.id);
      toast({
        title: 'Interview type reactivated',
        description: `${type.label} is available for scheduling again.`,
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reactivate interview type',
        variant: 'destructive',
      });
    } finally {
      setReactivatingId(null);
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
      <SelectContent className="max-h-64" position="popper">
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
                        {' · '}
                        {readRequiresInterviewer(type) ? 'Live interview' : 'Assessment'}
                        {' · '}
                        {readCreateCalendarMeeting(type) ? 'Meeting on' : 'Meeting off'}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {type.active === false && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReactivate(type)}
                          disabled={isMutating || reactivatingId === type.id}
                          title="Reactivate"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          {reactivatingId === type.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(type)} disabled={isMutating || reactivatingId === type.id}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestDelete(type)}
                        disabled={isMutating || reactivatingId === type.id || type.isSystem}
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
            

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] p-1">
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
                    onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
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
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short note for admins (optional)"
                    disabled={isMutating}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                {readRequiresInterviewer(form) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Display order
                    </Label>
                    <Input
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                      disabled={isMutating}
                      className="h-10 max-w-xs"
                    />
                    {!editing && (
                      <p className="text-[11px] text-muted-foreground">
                        Pre-filled after existing types.
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    What does HR book for this round?
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        value: 'interview',
                        title: 'Live interview',
                        description: 'Match an interviewer and book a slot',
                        icon: Users,
                      },
                      {
                        value: 'assessment',
                        title: 'Assessment',
                        description: 'Due date and notes — no interviewer slot',
                        icon: ClipboardList,
                      },
                    ].map((option) => {
                      const selected = readRequiresInterviewer(form)
                        ? option.value === 'interview'
                        : option.value === 'assessment';
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isMutating}
                          onClick={() => {
                            const requires = option.value === 'interview';
                            setForm((prev) => ({
                              ...prev,
                              requiresInterviewer: requires,
                              createCalendarMeeting: requires ? prev.createCalendarMeeting : false,
                            }));
                          }}
                          className={`rounded-xl border p-3 text-left transition-all ${
                            selected
                              ? 'border-sky-500 bg-sky-50/80 ring-1 ring-sky-200 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              selected ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Create calendar meeting
                  </Label>
                  <Select
                    value={readCreateCalendarMeeting(form) ? 'true' : 'false'}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, createCalendarMeeting: value === 'true' }))
                    }
                    disabled={isMutating || !readRequiresInterviewer(form)}
                    hideSelectedFromMenu={false}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent hideSelectedFromMenu={false} position="popper">
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {readRequiresInterviewer(form)
                      ? 'Creates a Google Meet when an interviewer slot is booked. Turn off to skip meeting creation.'
                      : 'Not applicable for assessments — no interviewer or calendar meeting is booked.'}
                  </p>
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
                      onChange={(v) => setForm((prev) => ({ ...prev, roundStatusKey: v }))}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    On cancel, restore to
                  </Label>
                  <StatusSelect
                    value={form.cancelRestoreStatusKey}
                    onChange={(v) => setForm((prev) => ({ ...prev, cancelRestoreStatusKey: v }))}
                  />
                </div>
              </section>
            </div>

            {readRequiresInterviewer(form) && (
              <InterviewTypeFilterRulesFields
                rules={form.filterRules}
                onChange={(filterRules) => setForm((prev) => ({ ...prev, filterRules }))}
                disabled={isMutating}
                departments={departments}
                domains={domains}
                categories={categories}
                technologies={technologies}
              />
            )}
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

      <DeleteInterviewTypeDialog
        type={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={loadData}
      />
    </Layout>
  );
};

export default InterviewTypesPage;
