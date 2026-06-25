import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus, Trash2, Eye, Save, Copy, GripVertical, Loader2, ChevronDown, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { departmentAPI } from '@/services/departmentAPI';
import { designationAPI } from '@/services/designationAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { questionCategoryAPI } from '@/services/questionCategoryAPI';
import FeedbackFormPreview from '@/components/FeedbackFormPreview';
import { FEEDBACK_INTERVIEW_TYPE_OPTIONS } from '@/lib/statusConstants';
import { isObligatoryFormQuestion } from '@/lib/feedbackResponseKeys';

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

const getDefaultOptionsForType = (type) => (type === 'dropdown' ? [...DEFAULT_DROPDOWN_OPTIONS] : ['']);

const createQuestion = (categoryId = '', overrides = {}) => ({
  id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
  label: '',
  categoryId: categoryId ? String(categoryId) : '',
  type: 'text',
  required: true,
  commentsEnabled: false,
  placeholder: '',
  helpText: '',
  options: [''],
  ...overrides,
});

const normalizeMultiLine = (value) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeQuestionOptions = (options) => {
  const labels = (Array.isArray(options) ? options : [])
    .map((option) => {
      if (typeof option === 'string') return option;
      return option?.label ?? option?.value ?? '';
    })
    .map((item) => String(item).trim())
    .filter(Boolean);

  return labels.length ? labels : [''];
};

const FeedbackQuestionsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedDesignationIds, setSelectedDesignationIds] = useState([]);
  const [selectedInterviewType, setSelectedInterviewType] = useState('');
  const [departmentDesignations, setDepartmentDesignations] = useState([]);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [questionCategories, setQuestionCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [initialData, setInitialData] = useState(null);
  const questionRefs = useRef({});
  const [scrollToQuestionId, setScrollToQuestionId] = useState(null);

  const hasChanges = useMemo(() => {
    if (!initialData) return true;
    return (
      formName !== initialData.formName ||
      formDescription !== initialData.formDescription ||
      JSON.stringify(selectedDepartmentId) !== JSON.stringify(initialData.selectedDepartmentId) ||
      JSON.stringify(selectedDesignationIds) !== JSON.stringify(initialData.selectedDesignationIds) ||
      selectedInterviewType !== initialData.selectedInterviewType ||
      JSON.stringify(questions) !== JSON.stringify(initialData.questions)
    );
  }, [formName, formDescription, selectedDepartmentId, selectedDesignationIds, selectedInterviewType, questions, initialData]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLoading(true);
        const [deptData, designationData, categoryData] = await Promise.all([
          departmentAPI.getAllDepartments(),
          designationAPI.getAllDesignations(),
          questionCategoryAPI.getAll(true),
        ]);
        setDepartments(deptData || []);
        setDesignations(designationData || []);
        const categories = categoryData || [];
        setQuestionCategories(categories);
        const defaultCategoryId = categories[0]?.id;
        // Prefill when editing existing form via ?id=
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');
        if (editId) {
          try {
            const form = await feedbackQuestionsAPI.getById(editId);
            if (form) {
              setFormName(form.name || '');
              setFormDescription(form.description || '');
              setSelectedDepartmentId(String((form.scopes?.departmentIds || [])[0] || ''));
              setSelectedDesignationIds((form.scopes?.designationIds || []).map(String));
              setSelectedInterviewType((form.scopes?.interviewTypes || [])[0] || '');
              const questionsData = (form.questions || [])
                .filter((q) => !isObligatoryFormQuestion(q))
                .map((q) => ({
                id: q.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
                label: q.label || '',
                categoryId: String(q.categoryId || defaultCategoryId || ''),
                type: q.type || 'text',
                required: q.required || false,
                commentsEnabled: q.commentsEnabled || false,
                placeholder: q.placeholder || '',
                helpText: q.helpText || '',
                options: normalizeQuestionOptions(q.options),
              }));
              setQuestions(questionsData);
              setInitialData({
                formName: form.name || '',
                formDescription: form.description || '',
                selectedDepartmentId: String((form.scopes?.departmentIds || [])[0] || ''),
                selectedDesignationIds: (form.scopes?.designationIds || []).map(String),
                selectedInterviewType: (form.scopes?.interviewTypes || [])[0] || '',
                questions: questionsData,
              });
            }
          } catch (err) {
            console.warn('Failed to load form for editing:', err);
          }
        } else if (defaultCategoryId) {
          setQuestions([createQuestion(defaultCategoryId)]);
        }
      } catch (error) {
        toast({
          title: 'Lookup load failed',
          description: 'Could not load the scope lookups from the server.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadLookups();
  }, []);

  // Load designations for the selected department
  useEffect(() => {
    const loadDesignations = async () => {
      if (!selectedDepartmentId) {
        setDepartmentDesignations([]);
        return;
      }

      try {
        const desigs = await designationAPI.getDesignationsByDepartment(Number(selectedDepartmentId));
        const sorted = (desigs || []).slice().sort((a, b) => {
          const ta = a?.tierOrder ?? Number.MAX_SAFE_INTEGER;
          const tb = b?.tierOrder ?? Number.MAX_SAFE_INTEGER;
          if (ta !== tb) return ta - tb;
          return String(a?.name || '').localeCompare(String(b?.name || ''));
        });
        setDepartmentDesignations(sorted);
      } catch (error) {
        console.error(`Failed to load designations for department ${selectedDepartmentId}:`, error);
        setDepartmentDesignations([]);
      }
    };
    loadDesignations();
  }, [selectedDepartmentId]);

  useEffect(() => {
    if (!scrollToQuestionId) return;
    const element = questionRefs.current[scrollToQuestionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollToQuestionId(null);
    }
  }, [scrollToQuestionId, questions.length]);

  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartmentId(departmentId);
    setSelectedDesignationIds([]);
  };

  const toggleDesignation = (designationId) => {
    const id = designationId.toString();
    setSelectedDesignationIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const selectAllDesignations = () => {
    const allIds = departmentDesignations.map((d) => d.id.toString());
    setSelectedDesignationIds(allIds);
  };

  const clearDesignations = () => {
    setSelectedDesignationIds([]);
  };

  const updateQuestion = (questionId, patch) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;

        const nextQuestion = { ...question, ...patch };

        if (patch.type === 'dropdown' && question.type !== 'dropdown') {
          nextQuestion.options = getDefaultOptionsForType('dropdown');
        }

        if ((patch.type === 'text' || patch.type === 'multiline') && question.type === 'dropdown') {
          nextQuestion.options = [''];
        }

        if (patch.type === 'multiline') {
          nextQuestion.commentsEnabled = false;
        }

        return nextQuestion;
      })
    );
  };

  const addQuestion = () => {
    const defaultCategoryId = questionCategories[0]?.id;
    const newQuestion = createQuestion(defaultCategoryId);
    setQuestions((current) => [...current, newQuestion]);
    setScrollToQuestionId(newQuestion.id);
  };

  const duplicateQuestion = (question) => {
    const clone = {
      ...question,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      label: `${question.label} (copy)`,
    };
    setQuestions((current) => [...current, clone]);
  };

  const removeQuestion = (questionId) => {
    setQuestions((current) => (current.length > 1 ? current.filter((question) => question.id !== questionId) : current));
  };

  const setQuestionOption = (questionId, optionIndex, value) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;
        const nextOptions = [...question.options];
        nextOptions[optionIndex] = value;
        return { ...question, options: nextOptions };
      })
    );
  };

  const addQuestionOption = (questionId) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, options: [...question.options, ''] } : question
      )
    );
  };

  const removeQuestionOption = (questionId, optionIndex) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;
        const nextOptions = question.options.filter((_, index) => index !== optionIndex);
        return { ...question, options: nextOptions.length ? nextOptions : [''] };
      })
    );
  };

  const buildPayload = () => ({
    name: formName.trim(),
    description: formDescription.trim(),
    scopes: {
      departmentIds: selectedDepartmentId ? [Number(selectedDepartmentId)] : [],
      designationIds: selectedDesignationIds.map((value) => Number(value)),
      interviewTypes: selectedInterviewType ? [selectedInterviewType] : [],
    },
    questions: questions.map((question, index) => ({
      order: index + 1,
      label: question.label.trim(),
      categoryId: Number(question.categoryId),
      type: question.type,
      required: question.required,
      commentsEnabled: question.type === 'multiline' ? false : question.commentsEnabled,
      placeholder: question.placeholder.trim(),
      helpText: question.helpText.trim(),
      options: question.type === 'dropdown'
        ? question.options
            .map((item) => item.trim())
            .filter(Boolean)
            .map((label) => ({ value: label, label }))
        : [],
    })),
  });

  const validate = () => {
    if (!formName.trim()) return 'Form name is required';
    if (!selectedInterviewType) return 'Interview type is required';
    if (!selectedDepartmentId) return 'Department is required';
    if (selectedDesignationIds.length === 0) return 'Select at least one designation from the selected department';
    if (!questions.length) return 'Add at least one question';
    if (questions.some((question) => !question.label.trim())) return 'Every question needs a label';
    if (questions.some((question) => question.label.trim().length > FEEDBACK_QUESTION_LABEL_MAX)) {
      return `Question labels must be ${FEEDBACK_QUESTION_LABEL_MAX} characters or fewer`;
    }
    if (questions.some((question) => question.placeholder.trim().length > FEEDBACK_QUESTION_PLACEHOLDER_MAX)) {
      return `Placeholders must be ${FEEDBACK_QUESTION_PLACEHOLDER_MAX} characters or fewer`;
    }
    if (questions.some((question) => question.helpText.trim().length > FEEDBACK_QUESTION_HELP_TEXT_MAX)) {
      return `Help text must be ${FEEDBACK_QUESTION_HELP_TEXT_MAX} characters or fewer`;
    }
    if (questions.some((question) => !question.categoryId)) return 'Every question needs a category';
    if (questions.some((question) => question.type === 'dropdown' && normalizeMultiLine(question.options.join('\n')).length === 0)) {
      return 'Dropdown questions need at least one option';
    }
    return '';
  };

  const handleSave = async () => {
    const errorMessage = validate();
    if (errorMessage) {
      toast({ title: 'Missing information', description: errorMessage, variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('id');
      if (editId) {
        await feedbackQuestionsAPI.update(editId, payload);
      } else {
        await feedbackQuestionsAPI.save(payload);
      }
      toast({ title: 'Saved', description: 'Feedback questions saved successfully.' });
      // Navigate to feedback forms page after successful save
      setTimeout(() => navigate('/admin/feedback-forms'), 500);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error.response?.data?.message || 'Unable to save feedback questions.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const previewPayload = buildPayload();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Feedback Questions</h1>
            <p className="text-muted-foreground">
              Build reusable feedback forms for selected roles, tiers, and departments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2" disabled={loading}>
              <Eye className="w-4 h-4" /> Preview
            </Button>
            {hasChanges && (
              <Button onClick={handleSave} className="gap-2" disabled={saving || loading}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Form
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/admin/feedback-forms')} className="gap-2">
              Close
            </Button>
          </div>
        </div>

        <Collapsible open={scopeOpen} onOpenChange={setScopeOpen} className="w-full">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Form Scope</CardTitle>
                <CardDescription>Select interview type, department, and designations for this form.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScopeOpen((value) => !value)}
                className="h-9 gap-2"
                aria-expanded={scopeOpen}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${scopeOpen ? '' : '-rotate-90'}`} />
                {scopeOpen ? 'Hide' : 'Show'}
              </Button>
            </CardHeader>
            <CollapsibleContent asChild>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Form Name *</Label>
                  <Input 
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    placeholder="e.g. Candidate Manager Feedback" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Explain when this feedback form should be used"
                    rows={3}
                  />
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Interview Type *</Label>
                      <Select value={selectedInterviewType} onValueChange={setSelectedInterviewType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interview type" />
                        </SelectTrigger>
                        <SelectContent>
                          {FEEDBACK_INTERVIEW_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select value={selectedDepartmentId} onValueChange={handleDepartmentChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id.toString()}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {departments.length === 0 && (
                        <p className="text-xs text-muted-foreground">No departments available</p>
                      )}
                    </div>
                  </div>

                  {selectedDepartmentId && (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-base font-semibold">Designations *</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllDesignations}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearDesignations}
                            className="text-xs"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      {departmentDesignations.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No designations available for this department</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {departmentDesignations.map((designation) => (
                            <label
                              key={designation.id}
                              className="flex items-center gap-3 rounded-md border bg-background p-2 text-sm hover:bg-muted/30 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedDesignationIds.includes(designation.id.toString())}
                                onCheckedChange={() => toggleDesignation(designation.id)}
                              />
                              <span className="flex-1">
                                {designation.name}
                                {designation.tierOrder != null && (
                                  <span className="ml-1 text-xs text-muted-foreground"> (Tier - {designation.tierOrder})</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 
                  {(selectedDepartmentId || selectedDesignationIds.length > 0 || selectedInterviewType) && (
                    <div className="rounded-lg border bg-primary/5 p-3">
                      <p className="text-xs font-medium text-foreground mb-2">Selected Scope:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedInterviewType && (
                          <Badge variant="outline">
                            {FEEDBACK_INTERVIEW_TYPE_OPTIONS.find((option) => option.value === selectedInterviewType)?.label || selectedInterviewType}
                          </Badge>
                        )}
                        {selectedDepartmentId && (
                          <Badge variant="default">
                            {departments.find((d) => d.id.toString() === selectedDepartmentId)?.name}
                          </Badge>
                        )}
                        {selectedDesignationIds.map((desigId) => (
                          <Badge key={`desig-${desigId}`} variant="outline">
                            {designations.find((d) => d.id.toString() === desigId)?.name
                              || departmentDesignations.find((d) => d.id.toString() === desigId)?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  */}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Question Builder</CardTitle>
                <CardDescription>Add as many questions as needed. Each question can be text or dropdown.</CardDescription>
              </div>
              <Button type="button" onClick={addQuestion} className="gap-2">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>
          </CardHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <CardContent className="space-y-4">
            <AnimatePresence initial={false}>
              {questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  ref={(element) => {
                    if (element) {
                      questionRefs.current[question.id] = element;
                    } else {
                      delete questionRefs.current[question.id];
                    }
                  }}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Question Text *</Label>
                          <Input
                            value={question.label}
                            onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                            placeholder="e.g. How strong was the candidate's communication?"
                            maxLength={FEEDBACK_QUESTION_LABEL_MAX}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={question.categoryId}
                            onValueChange={(value) => updateQuestion(question.id, { categoryId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {questionCategories.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Question Type</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(question.id, { type: value })}
                          >
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

                        <div className="space-y-2 md:col-span-2">
                          <Label>Flags</Label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuestion(question.id, { required: !question.required })}
                              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${question.required ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                            >
                              Required
                            </button>
                            {question.type !== 'multiline' && (
                              <button
                                type="button"
                                onClick={() => updateQuestion(question.id, { commentsEnabled: !question.commentsEnabled })}
                                className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${question.commentsEnabled ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                              >
                                Comments
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={question.placeholder}
                            onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                            placeholder="Optional placeholder text"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Helper Text</Label>
                          <Input
                            value={question.helpText}
                            onChange={(e) => updateQuestion(question.id, { helpText: e.target.value })}
                            placeholder="Optional guidance shown below the question"
                          />
                        </div>
                      </div>

                      {question.type === 'dropdown' && (
                        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Dropdown Values</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addQuestionOption(question.id)} className="gap-2">
                              <Plus className="w-4 h-4" /> Add option
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                <Input
                                  value={option}
                                  onChange={(e) => setQuestionOption(question.id, optionIndex, e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeQuestionOption(question.id, optionIndex)}
                                  disabled={question.options.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Type one value per line or use the option inputs above.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-muted-foreground">
                          {question.type === 'dropdown'
                            ? `${question.options.filter(Boolean).length} dropdown option(s)`
                            : question.type === 'multiline'
                              ? 'Multiline response'
                              : 'Text response'}
                          {question.commentsEnabled && question.type !== 'multiline' && ' · comments enabled'}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => duplicateQuestion(question)} className="gap-2">
                            <Copy className="w-4 h-4" /> Duplicate
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(question.id)} disabled={questions.length === 1} className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" /> Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </CardContent>
          </div>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Saved Payload Preview</CardTitle>
            <CardDescription>This is the JSON structure that can be stored in a jsonb column on the backend.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-xl bg-muted/40 p-4 text-xs leading-relaxed">
{JSON.stringify(previewPayload, null, 2)}
            </pre>
          </CardContent>
        </Card> */}

        <FeedbackFormPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={previewPayload}
          getDepartmentName={(id) => departments.find((department) => department.id === id)?.name || `Dept #${id}`}
          getDesignationName={(id) => designations.find((designation) => designation.id === id)?.name || `Desig #${id}`}
          showEdit={false}
        />
      </div>
    </Layout>
  );
};

export default FeedbackQuestionsPage;
