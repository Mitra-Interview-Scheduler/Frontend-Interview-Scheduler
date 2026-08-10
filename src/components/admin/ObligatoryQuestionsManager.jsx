import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { LoadingState } from '@/components/ui/loading';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const QUESTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'multiline', label: 'Multiline' },
  { value: 'dropdown', label: 'Dropdown' },
];

const FEEDBACK_QUESTION_LABEL_MAX = 1000;
const FEEDBACK_QUESTION_PLACEHOLDER_MAX = 255;
const FEEDBACK_QUESTION_HELP_TEXT_MAX = 500;

const DEFAULT_DROPDOWN_OPTIONS = [
  'N/A',
  '1 - Poor',
  '2 - Fair',
  '3 - Good',
  '4 - Very Good',
  '5 - Excellent',
];

const normalizeOptions = (options) => {
  const labels = (Array.isArray(options) ? options : [])
    .map((option) => {
      if (typeof option === 'string') return option;
      return option?.label ?? option?.value ?? '';
    })
    .map((item) => String(item).trim())
    .filter(Boolean);

  return labels.length ? labels : [''];
};

const createEmptyQuestion = (order = 1) => ({
  order,
  label: '',
  type: 'text',
  required: true,
  commentsEnabled: false,
  placeholder: '',
  helpText: '',
  options: [''],
});

const toFormState = (question) => ({
  order: question?.order ?? 1,
  label: question?.label || '',
  type: question?.type || 'text',
  required: question?.required ?? true,
  commentsEnabled: question?.commentsEnabled ?? false,
  placeholder: question?.placeholder || '',
  helpText: question?.helpText || '',
  options: normalizeOptions(question?.options),
});

const buildPayload = (question) => ({
  order: Number(question.order) || 1,
  label: question.label.trim(),
  type: question.type,
  required: question.required,
  commentsEnabled: question.type === 'multiline' ? false : question.commentsEnabled,
  placeholder: question.placeholder?.trim() || '',
  helpText: question.helpText?.trim() || '',
  options: question.type === 'dropdown'
    ? question.options
        .map((item) => item.trim())
        .filter(Boolean)
        .map((label) => ({ value: label, label }))
    : [],
});

const ObligatoryQuestionsManager = ({ onQuestionsChange }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [form, setForm] = useState(createEmptyQuestion());
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await feedbackQuestionsAPI.getObligatoryQuestions();
      const list = Array.isArray(data) ? data : [];
      setQuestions(list);
      onQuestionsChange?.(list.length);
    } catch (error) {
      console.error('Failed to load obligatory questions:', error);
      setQuestions([]);
      const status = error.response?.status;
      toast({
        title: 'Load failed',
        description: status === 403 || status === 401
          ? 'You do not have permission to manage obligatory questions.'
          : (error.response?.data?.message || 'Unable to load obligatory questions.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [onQuestionsChange]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const openCreateDialog = () => {
    const nextOrder = questions.length > 0
      ? Math.max(...questions.map((question) => question.order || 0)) + 1
      : 1;
    setEditingQuestion(null);
    setForm(createEmptyQuestion(nextOrder));
    setDialogOpen(true);
  };

  const openEditDialog = (question) => {
    setEditingQuestion(question);
    setForm(toFormState(question));
    setDialogOpen(true);
  };

  const updateForm = (updates) => {
    setForm((current) => {
      const next = { ...current, ...updates };
      if (updates.type === 'dropdown' && current.type !== 'dropdown') {
        next.options = [...DEFAULT_DROPDOWN_OPTIONS];
      }
      if (updates.type === 'text' || updates.type === 'multiline') {
        next.options = [''];
      }
      if (updates.type === 'multiline') {
        next.commentsEnabled = false;
      }
      return next;
    });
  };

  const setOptionValue = (index, value) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }));
  };

  const addOption = () => {
    setForm((current) => ({ ...current, options: [...current.options, ''] }));
  };

  const removeOption = (index) => {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index).length
        ? current.options.filter((_, optionIndex) => optionIndex !== index)
        : [''],
    }));
  };

  const validateForm = () => {
    if (!form.label.trim()) return 'Question text is required';
    if (form.label.trim().length > FEEDBACK_QUESTION_LABEL_MAX) {
      return `Question text must be ${FEEDBACK_QUESTION_LABEL_MAX} characters or fewer`;
    }
    if (form.placeholder.trim().length > FEEDBACK_QUESTION_PLACEHOLDER_MAX) {
      return `Placeholder must be ${FEEDBACK_QUESTION_PLACEHOLDER_MAX} characters or fewer`;
    }
    if (form.helpText.trim().length > FEEDBACK_QUESTION_HELP_TEXT_MAX) {
      return `Help text must be ${FEEDBACK_QUESTION_HELP_TEXT_MAX} characters or fewer`;
    }
    if (form.type === 'dropdown' && !form.options.some((option) => option.trim())) {
      return 'Add at least one dropdown option';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({ title: 'Validation error', description: validationError, variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload(form);
      if (editingQuestion?.id) {
        await feedbackQuestionsAPI.updateObligatoryQuestion(editingQuestion.id, payload);
        toast({ title: 'Updated', description: 'Obligatory question updated successfully.' });
      } else {
        await feedbackQuestionsAPI.createObligatoryQuestion(payload);
        toast({ title: 'Created', description: 'Obligatory question added successfully.' });
      }
      setDialogOpen(false);
      await loadQuestions();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error.response?.data?.message || 'Unable to save obligatory question.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmTarget) return;

    try {
      setIsDeleting(true);
      await feedbackQuestionsAPI.deleteObligatoryQuestion(confirmTarget.id);
      setConfirmTarget(null);
      toast({ title: 'Deleted', description: 'Obligatory question removed.' });
      await loadQuestions();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.message || 'Unable to delete obligatory question.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Obligatory Questions</h2>
          <p className="text-sm text-muted-foreground">
            These questions appear on every interviewer feedback form, in addition to the selected form questions.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-4">
            <LoadingState label="Loading obligatory questions..." size="sm" minHeight="sm" />
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No obligatory questions yet. Add the shared questions every interviewer must answer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">#{question.order}</Badge>
                    <Badge variant="secondary">{question.type}</Badge>
                    {question.required && <Badge>Required</Badge>}
                    {question.commentsEnabled && <Badge variant="outline">Comments</Badge>}
                  </div>
                  <p className="font-medium text-foreground">{question.label}</p>
                  {question.helpText && (
                    <p className="text-sm text-muted-foreground">{question.helpText}</p>
                  )}
                  {question.type === 'dropdown' && question.options?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Options: {question.options.map((option) => option.label || option.value || option).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(question)} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmTarget(question)}
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Obligatory Question' : 'Add Obligatory Question'}</DialogTitle>
            <DialogDescription>
              This question will be shown to interviewers on every feedback submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Question Text *</Label>
                <Input
                  value={form.label}
                  onChange={(e) => updateForm({ label: e.target.value })}
                  placeholder="e.g. Overall Rating"
                  maxLength={FEEDBACK_QUESTION_LABEL_MAX}
                />
              </div>

              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => updateForm({ order: parseInt(e.target.value, 10) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={form.type} onValueChange={(value) => updateForm({ type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Flags</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateForm({ required: !form.required })}
                    className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${form.required ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                  >
                    Required
                  </button>
                  {form.type !== 'multiline' && (
                    <button
                      type="button"
                      onClick={() => updateForm({ commentsEnabled: !form.commentsEnabled })}
                      className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${form.commentsEnabled ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                    >
                      Comments
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Placeholder</Label>
                <Input
                  value={form.placeholder}
                  onChange={(e) => updateForm({ placeholder: e.target.value })}
                  placeholder="Optional placeholder text"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Helper Text</Label>
                <Input
                  value={form.helpText}
                  onChange={(e) => updateForm({ helpText: e.target.value })}
                  placeholder="Optional guidance shown below the question"
                />
              </div>
            </div>

            {form.type === 'dropdown' && (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Dropdown Values</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add option
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.options.map((option, index) => (
                    <div key={`option-${index}`} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={option}
                        onChange={(e) => setOptionValue(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        disabled={form.options.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="gap-2">
              {editingQuestion ? 'Save Changes' : 'Create Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => { if (!open && !isDeleting) setConfirmTarget(null); }}
        title="Delete obligatory question?"
        description={confirmTarget ? `Delete obligatory question "${confirmTarget.label}"?` : undefined}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};

export default ObligatoryQuestionsManager;
