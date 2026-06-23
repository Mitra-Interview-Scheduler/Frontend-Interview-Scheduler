import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Loader2, ChevronLeft, ChevronRight, FileText, Tags, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { questionCategoryAPI } from '@/services/questionCategoryAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { designationAPI } from '@/services/designationAPI';
import FeedbackFormPreview from '@/components/FeedbackFormPreview';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';
import CategoryManager from '@/components/admin/CategoryManager';
import ObligatoryQuestionsManager from '@/components/admin/ObligatoryQuestionsManager';
import { FEEDBACK_INTERVIEW_TYPE_OPTIONS, formatInterviewTypeLabel } from '@/lib/statusConstants';

const FeedbackFormsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'categories'
    ? 'categories'
    : tabParam === 'obligatory'
      ? 'obligatory'
      : 'forms';

  const setActiveTab = (tab) => {
    if (tab === 'forms') {
      setSearchParams({});
      return;
    }
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [questionCategories, setQuestionCategories] = useState([]);
  const [obligatoryQuestionCount, setObligatoryQuestionCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    departmentId: '',
    designationId: '',
    interviewType: '',
  });

  const totalPages = Math.ceil(filteredForms.length / itemsPerPage);
  const paginatedForms = filteredForms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const refreshData = async () => {
    try {
      setLoading(true);
      const [deptData, desigData, categoryData] = await Promise.all([
        departmentAPI.getAllDepartments(),
        designationAPI.getAllDesignations(),
        questionCategoryAPI.getAll(false),
      ]);

      try {
        const formsData = await feedbackQuestionsAPI.getAll();
        setForms(Array.isArray(formsData) ? formsData : []);
      } catch (formError) {
        console.error('Could not load feedback forms:', formError);
        setForms([]);
        toast({
          title: 'Load failed',
          description: 'Unable to load feedback forms from the database.',
          variant: 'destructive',
        });
      }

      setDepartments(deptData || []);
      setDesignations(desigData || []);
      setQuestionCategories(categoryData || []);
    } catch (error) {
      console.error('Load failed:', error);
      setForms([]);
      toast({
        title: 'Load failed',
        description: 'Unable to load data from the server.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredForms]);

  useEffect(() => {
    if (activeTab !== 'obligatory') return;

    feedbackQuestionsAPI.getObligatoryQuestions()
      .then((data) => {
        setObligatoryQuestionCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {
        setObligatoryQuestionCount(0);
      });
  }, [activeTab]);

  useEffect(() => {
    let result = [...forms];

    if (statusFilter === 'active') {
      result = result.filter((form) => form.isActive !== false);
    }

    if (statusFilter === 'inactive') {
      result = result.filter((form) => form.isActive === false);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (form) =>
          form.name?.toLowerCase().includes(term) ||
          form.description?.toLowerCase().includes(term)
      );
    }

    if (filters.departmentId) {
      result = result.filter((form) =>
        form.scopes?.departmentIds?.includes(Number(filters.departmentId))
      );
    }

    if (filters.designationId) {
      result = result.filter((form) =>
        form.scopes?.designationIds?.includes(Number(filters.designationId))
      );
    }

    if (filters.interviewType) {
      result = result.filter((form) =>
        !form.scopes?.interviewTypes?.length
        || form.scopes.interviewTypes.includes(filters.interviewType)
      );
    }

    setFilteredForms(result);
  }, [forms, filters, statusFilter]);

  const handleStatusToggle = async (form, nextActive) => {
    try {
      setStatusUpdatingId(form.id);
      await feedbackQuestionsAPI.setActive(form.id, nextActive);
      await refreshData();
      toast({
        title: nextActive ? 'Form activated' : 'Form deactivated',
        description: nextActive
          ? 'This version is now active for interviewer use.'
          : 'This version has been hidden from interviewer selection.',
      });
    } catch (error) {
      toast({
        title: 'Status update failed',
        description: error.response?.data?.message || 'Unable to update form status.',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getFormStats = (form) => {
    const stats = [];
    if (form.questions?.length) {
      stats.push(`${form.questions.length} question(s)`);
    }
    if (form.scopes?.departmentIds?.length) {
      stats.push(`${form.scopes.departmentIds.length} department(s)`);
    }
    if (form.scopes?.designationIds?.length) {
      stats.push(`${form.scopes.designationIds.length} designation(s)`);
    }
    if (form.scopes?.interviewTypes?.length) {
      stats.push(`${form.scopes.interviewTypes.length} interview type(s)`);
    }
    if (form.scopes?.tierIds?.length) {
      stats.push(`${form.scopes.tierIds.length} tier(s)`);
    }
    return stats.join(' • ');
  };

  const getDepartmentName = (id) => {
    return departments.find((d) => d.id === id)?.name || `Dept #${id}`;
  };

  const getDesignationName = (id) => {
    return designations.find((d) => d.id === id)?.name || `Desig #${id}`;
  };

  return (
    <Layout>
      <div
        className={
          activeTab === 'forms'
            ? 'flex h-[calc(100vh-7rem)] flex-col gap-6 overflow-hidden'
            : 'space-y-6'
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Feedback Forms</h1>
            <p className="text-muted-foreground">
              Manage feedback forms and question categories for your organization.
            </p>
          </div>

          {activeTab === 'forms' && (
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/feedback-questions')} className="gap-2 w-fit">
              <Plus className="w-4 h-4" /> New Form
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setLoading(true);
                  const createdForms = await feedbackQuestionsAPI.seedMock({ totalForms: 5 });
                  toast({
                    title: 'Seeded',
                    description: `${createdForms.length} mock feedback forms created from the template questions.`,
                  });
                  await refreshData();
                } catch (err) {
                  console.error('Seed failed', err);
                  toast({ title: 'Seed failed', description: err.response?.data?.message || err.message || 'Unable to seed mock form', variant: 'destructive' });
                } finally {
                  setLoading(false);
                }
              }}
              className="gap-2 w-fit"
            >
              Seed 5 Mock Forms
            </Button>
          </div>
          )}
        </div>

        <AdminSectionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'forms', label: 'Forms', icon: FileText, count: forms.length },
            { value: 'obligatory', label: 'Obligatory Questions', icon: ListChecks, count: obligatoryQuestionCount },
            { value: 'categories', label: 'Categories', icon: Tags, count: questionCategories.length },
          ]}
        />

        {activeTab === 'categories' ? (
          <CategoryManager type="question" onCategoriesChange={setQuestionCategories} />
        ) : activeTab === 'obligatory' ? (
          <ObligatoryQuestionsManager onQuestionsChange={setObligatoryQuestionCount} />
        ) : (
          <>
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search forms..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select 
                value={filters.departmentId || 'all'} 
                onValueChange={(value) => setFilters({ ...filters, departmentId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Designation</Label>
              <Select 
                value={filters.designationId || 'all'} 
                onValueChange={(value) => setFilters({ ...filters, designationId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All designations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All designations</SelectItem>
                  {designations.map((desig) => (
                    <SelectItem key={desig.id} value={desig.id.toString()}>
                      {desig.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select
                value={filters.interviewType || 'all'}
                onValueChange={(value) => setFilters({ ...filters, interviewType: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All interview types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All interview types</SelectItem>
                  {FEEDBACK_INTERVIEW_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All forms</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <FeedbackFormPreview 
          open={previewOpen} 
          onOpenChange={setPreviewOpen} 
          form={previewForm} 
          getDepartmentName={getDepartmentName} 
          getDesignationName={getDesignationName} 
        />

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading forms...</p>
            </div>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-muted-foreground">
                {forms.length === 0 ? 'No feedback forms yet.' : 'No forms match your filters.'}
              </p>
              {forms.length === 0 && (
                <Button onClick={() => navigate('/admin/feedback-questions')} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Form
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4 pb-2">
              <AnimatePresence initial={false}>
                {paginatedForms.map((form) => (
                  <motion.div
                    key={form.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setPreviewForm(form); setPreviewOpen(true); }}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{form.name}</h3>
                                <Badge variant="outline">Version {form.versionNumber || 1}</Badge>
                              </div>
                              {form.description && (
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge
                                  variant="outline"
                                  className={form.isActive
                                    ? 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200'
                                    : 'border-transparent bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200'}
                                >
                                  {form.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <span>{getFormStats(form)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/feedback-questions?id=${form.id}`)}
                                className="gap-2"
                              >
                                <Edit className="w-4 h-4" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant={form.isActive ? 'destructive' : 'default'}
                                onClick={() => handleStatusToggle(form, !form.isActive)}
                                disabled={statusUpdatingId === form.id}
                                className="gap-2"
                              >
                                {statusUpdatingId === form.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating
                                  </>
                                ) : form.isActive ? (
                                  'Deactivate'
                                ) : (
                                  'Activate'
                                )}
                              </Button>
                            </div>
                          </div>

                          {form.scopes && (
                            <div className="flex flex-wrap gap-2">
                              {form.scopes.interviewTypes?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {form.scopes.interviewTypes.map((interviewType) => (
                                    <Badge key={`type-${interviewType}`} variant="outline">
                                      {formatInterviewTypeLabel(interviewType)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {form.scopes.departmentIds?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {form.scopes.departmentIds.map((deptId) => (
                                    <Badge key={`dept-${deptId}`} variant="secondary">
                                      {getDepartmentName(deptId)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {form.scopes.designationIds?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {form.scopes.designationIds.map((desigId) => (
                                    <Badge key={`desig-${desigId}`} variant="outline">
                                      {getDesignationName(desigId)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t bg-background pt-4">
          <div className="text-xs text-muted-foreground">
            {filteredForms.length > 0
              ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredForms.length)} of ${filteredForms.length} form(s)`
              : 'No forms to display'}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-10"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default FeedbackFormsPage;
