import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus, Trash2, Eye, Save, Copy, GripVertical, MessageSquare, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { departmentAPI } from '@/services/departmentAPI';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI } from '@/services/tierAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';

const QUESTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'dropdown', label: 'Dropdown' },
];

const QUESTION_CATEGORIES = [
  'Educational Background',
  'Relevant Experience',
  'Architecture & Systems Design',
  'Software Development & Programming',
  'Methodologies & Tools',
  'Technical Expertise',
  'Conceptual Understanding',
  'Analytical and Problem Solving Skills',
  'Teamwork',
  'Leadership',
  'Growth Potential and Achievements',
  'Communication Skills',
];

const createQuestion = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
  label: '',
  category: QUESTION_CATEGORIES[0],
  type: 'text',
  required: true,
  commentsEnabled: false,
  placeholder: '',
  helpText: '',
  options: [''],
});

const normalizeMultiLine = (value) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const FeedbackQuestionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedDesignationIds, setSelectedDesignationIds] = useState([]);
  const [designationsByDepartment, setDesignationsByDepartment] = useState({});
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [questions, setQuestions] = useState([createQuestion()]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLoading(true);
        const [deptData, designationData] = await Promise.all([
          departmentAPI.getAllDepartments(),
          designationAPI.getAllDesignations(),
        ]);
        setDepartments(deptData || []);
        setDesignations(designationData || []);
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

  // Load designations for each selected department
  useEffect(() => {
    const loadDesignations = async () => {
      const result = {};
      for (const deptId of selectedDepartmentIds) {
        try {
          const desigs = await designationAPI.getDesignationsByDepartment(Number(deptId));
          result[deptId] = desigs || [];
        } catch (error) {
          console.error(`Failed to load designations for department ${deptId}:`, error);
          result[deptId] = [];
        }
      }
      setDesignationsByDepartment(result);
    };
    loadDesignations();
  }, [selectedDepartmentIds]);

  const toggleDepartment = (departmentId) => {
    const id = departmentId.toString();
    setSelectedDepartmentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
    // Clear designations from removed department
    setSelectedDesignationIds((current) => {
      const desigIdsInDept = (designationsByDepartment[id] || []).map((d) => d.id.toString());
      return current.filter((dId) => !desigIdsInDept.includes(dId));
    });
  };

  const toggleDesignation = (designationId) => {
    const id = designationId.toString();
    setSelectedDesignationIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const selectAllDesignationsForDepartment = (departmentId) => {
    const desigs = designationsByDepartment[departmentId] || [];
    const allIds = desigs.map((d) => d.id.toString());
    setSelectedDesignationIds((current) => [...new Set([...current, ...allIds])]);
  };

  const clearDesignationsForDepartment = (departmentId) => {
    const desigs = designationsByDepartment[departmentId] || [];
    const desigIdsInDept = desigs.map((d) => d.id.toString());
    setSelectedDesignationIds((current) => current.filter((id) => !desigIdsInDept.includes(id)));
  };

  const updateQuestion = (questionId, patch) => {
    setQuestions((current) => current.map((question) => (question.id === questionId ? { ...question, ...patch } : question)));
  };

  const addQuestion = () => setQuestions((current) => [...current, createQuestion()]);

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
      departmentIds: selectedDepartmentIds.map((value) => Number(value)),
      designationIds: selectedDesignationIds.map((value) => Number(value)),
    },
    questions: questions.map((question, index) => ({
      order: index + 1,
      label: question.label.trim(),
      category: question.category,
      type: question.type,
      required: question.required,
      commentsEnabled: question.commentsEnabled,
      placeholder: question.placeholder.trim(),
      helpText: question.helpText.trim(),
      options: question.type === 'dropdown' ? question.options.map((item) => item.trim()).filter(Boolean) : [],
    })),
  });

  const validate = () => {
    if (!formName.trim()) return 'Form name is required';
    if (!questions.length) return 'Add at least one question';
    if (questions.some((question) => !question.label.trim())) return 'Every question needs a label';
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
      await feedbackQuestionsAPI.save(payload);
      toast({ title: 'Saved', description: 'Feedback questions saved successfully.' });
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
            <Button onClick={handleSave} className="gap-2" disabled={saving || loading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Form
            </Button>
          </div>
        </div>

        <Collapsible open={scopeOpen} onOpenChange={setScopeOpen} className="w-full">
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between hover:bg-muted/30 rounded-t-lg px-1 py-1">
                  <div className="flex items-center gap-3 flex-1">
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform ${scopeOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                    <div className="text-left">
                      <CardTitle>Form Scope</CardTitle>
                      <CardDescription>Select departments and their relevant designations for this form.</CardDescription>
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
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
                  {/* Department Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-base font-semibold">Departments</Label>
                      <Badge variant="secondary">Optional</Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {departments.map((department) => (
                        <label
                          key={department.id}
                          className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/30 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedDepartmentIds.includes(department.id.toString())}
                            onCheckedChange={() => toggleDepartment(department.id)}
                          />
                          <span className="flex-1 font-medium">{department.name}</span>
                        </label>
                      ))}
                      {departments.length === 0 && (
                        <p className="text-xs text-muted-foreground col-span-full">No departments available</p>
                      )}
                    </div>
                  </div>

                  {/* Designations by Department - Show for each selected department */}
                  {selectedDepartmentIds.length > 0 && (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                      <Label className="text-base font-semibold">Designations by Department</Label>
                      <div className="space-y-4">
                        {selectedDepartmentIds.map((deptId) => {
                          const dept = departments.find((d) => d.id.toString() === deptId);
                          const desigs = designationsByDepartment[deptId] || [];
                          return (
                            <div key={deptId} className="rounded-lg border bg-background p-3">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <p className="font-medium text-sm">{dept?.name}</p>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectAllDesignationsForDepartment(deptId)}
                                    className="text-xs"
                                  >
                                    Select All
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => clearDesignationsForDepartment(deptId)}
                                    className="text-xs"
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </div>
                              {desigs.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No designations available for this department</p>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {desigs.map((designation) => (
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
                                        {designation.levelOrder != null && (
                                          <span className="ml-1 text-xs text-muted-foreground">(L{designation.levelOrder})</span>
                                        )}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Summary */}
                  {(selectedDepartmentIds.length > 0 || selectedDesignationIds.length > 0) && (
                    <div className="rounded-lg border bg-primary/5 p-3">
                      <p className="text-xs font-medium text-foreground mb-2">Selected Scope:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDepartmentIds.map((deptId) => (
                          <Badge key={`dept-${deptId}`} variant="default">
                            {departments.find((d) => d.id.toString() === deptId)?.name}
                          </Badge>
                        ))}
                        {selectedDesignationIds.map((desigId) => (
                          <Badge key={`desig-${desigId}`} variant="outline">
                            {designations.find((d) => d.id.toString() === desigId)?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
          <CardContent className="space-y-4">
            <AnimatePresence initial={false}>
              {questions.map((question, index) => (
                <motion.div
                  key={question.id}
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
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={question.category}
                            onValueChange={(value) => updateQuestion(question.id, { category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
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
                            <button
                              type="button"
                              onClick={() => updateQuestion(question.id, { commentsEnabled: !question.commentsEnabled })}
                              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${question.commentsEnabled ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                            >
                              Comments
                            </button>
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
                            : 'Text response'}
                          {question.commentsEnabled && ' · comments enabled'}
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

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="min-w-80">
            <DialogHeader>
              <DialogTitle>Preview Feedback Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{formName || 'Untitled Feedback Form'}</h3>
                <p className="text-sm text-muted-foreground">{formDescription || 'No description provided.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {selectedDepartmentIds.length > 0 && <span>Departments: {selectedDepartmentIds.length}</span>}
                  {selectedDesignationIds.length > 0 && <span>Designations: {selectedDesignationIds.length}</span>}
                </div>
              </div>

              {questions.map((question, index) => (
                <div key={`preview-${question.id}`} className="rounded-2xl border bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <Label className="text-base font-medium ">{index + 1}. {question.label || 'Question'} </Label>
                      <Badge className="mt-1 ml-4 px-2.5 py-1 text-xs font-medium ">{question.category}</Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {/* {question.required && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          Required
                        </span>
                      )} */}
                     
                    </div>
                  </div>
                  {question.helpText && <p className="mb-3 text-xs text-muted-foreground">{question.helpText}</p>}

                  {question.type === 'dropdown' ? (
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={question.placeholder || 'Select an option'} />
                      </SelectTrigger>
                      <SelectContent>
                        {normalizeMultiLine(question.options.join('\n')).map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder={question.placeholder || 'Type your response'} />
                  )}

                  {question.commentsEnabled && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-sm">Comments</Label>
                      <Textarea placeholder="Add optional comments..." rows={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FeedbackQuestionsPage;