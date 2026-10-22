import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, SquarePen, ChevronLeft, ChevronRight, ChevronDown,
  FileText, Tags, ListChecks, Filter, X, Building2, Briefcase, Layers,
} from 'lucide-react';
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
import { LoadingState, LoadingSwap } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { FEEDBACK_INTERVIEW_TYPE_OPTIONS, formatInterviewTypeLabel } from '@/lib/statusConstants';
import { useInterviewTypes } from '@/hooks/useInterviewTypes';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    departmentId: '',
    designationId: '',
    interviewType: '',
  });

  const { interviewTypes: dynamicInterviewTypes } = useInterviewTypes(true);
  const interviewTypeOptions = dynamicInterviewTypes.length > 0
    ? dynamicInterviewTypes.map((t) => ({ value: t.code, label: t.label }))
    : FEEDBACK_INTERVIEW_TYPE_OPTIONS;

  const availableDesignations = useMemo(() => {
    if (!filters.departmentId) return [];
    const departmentId = Number(filters.departmentId);
    return designations.filter((designation) => designation.departmentId === departmentId);
  }, [designations, filters.departmentId]);

  const handleDepartmentFilterChange = (value) => {
    const departmentId = value === 'all' ? '' : value;
    setFilters((current) => ({
      ...current,
      departmentId,
      designationId: '',
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      departmentId: '',
      designationId: '',
      interviewType: '',
    });
    setStatusFilter('all');
  };

  const activeFilterCount = useMemo(() => (
    [
      filters.searchTerm.trim(),
      filters.departmentId,
      filters.designationId,
      filters.interviewType,
      statusFilter !== 'all' ? statusFilter : '',
    ].filter(Boolean).length
  ), [filters, statusFilter]);

  const activeFormCount = useMemo(
    () => filteredForms.filter((form) => form.isActive !== false).length,
    [filteredForms]
  );
  const inactiveFormCount = useMemo(
    () => filteredForms.filter((form) => form.isActive === false).length,
    [filteredForms]
  );

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
      const selectedType = filters.interviewType.toUpperCase();
      result = result.filter((form) =>
        (form.scopes?.interviewTypes || []).some(
          (interviewType) => String(interviewType).toUpperCase() === selectedType
        )
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
            ? 'flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-4 overflow-hidden'
            : 'space-y-6'
        }
      >
        <div className="shrink-0 space-y-4">
        <PageHeader
          title="Feedback Forms"
          description="Manage feedback forms and question categories for your organization."
          actions={
            activeTab === 'forms' ? (
              <Button onClick={() => navigate('/admin/feedback-questions')} className="gap-2 w-fit">
                <Plus className="w-4 h-4" /> New Form
              </Button>
            ) : null
          }
        />

        <AdminSectionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'forms', label: 'Forms', icon: FileText },
            { value: 'obligatory', label: 'Obligatory Questions', icon: ListChecks },
            { value: 'categories', label: 'Categories', icon: Tags },
          ]}
        />
        </div>

        {activeTab === 'categories' ? (
          <CategoryManager type="question" onCategoriesChange={setQuestionCategories} />
        ) : activeTab === 'obligatory' ? (
          <ObligatoryQuestionsManager />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <Card className="shrink-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-3">
              {isFiltersCollapsed && (
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search forms…"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="pl-10"
                  />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFiltersCollapsed((value) => !value)}
                className="h-9 gap-2"
                aria-expanded={!isFiltersCollapsed}
                aria-label={isFiltersCollapsed ? 'Show filters' : 'Hide filters'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isFiltersCollapsed ? '-rotate-90' : ''}`} />
                {isFiltersCollapsed ? 'Show' : 'Hide'}
              </Button>
            </div>
          </CardHeader>
          <AnimatePresence initial={false}>
            {!isFiltersCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {!isFiltersCollapsed && (
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search forms…"
                        value={filters.searchTerm}
                        onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
              {!isFiltersCollapsed && (
                <>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={filters.departmentId || 'all'}
                    onValueChange={handleDepartmentFilterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
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
                    disabled={!filters.departmentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filters.departmentId ? 'All Designations' : 'Select department first'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designations</SelectItem>
                      {availableDesignations.map((desig) => (
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
                      <SelectValue placeholder="All Interview Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Interview Types</SelectItem>
                      {interviewTypeOptions.map((option) => (
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
                      <SelectValue placeholder="All Forms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Forms</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </>
              )}
            </div>

              
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <LoadingSwap
          loading={loading && forms.length === 0}
          className="min-h-0 flex-1 flex flex-col overflow-hidden"
          fallback={<LoadingState label="Loading forms..." className="flex-1 rounded-lg border" />}
        >
        {filteredForms.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border bg-card">
            <EmptyState
              icon={FileText}
              title={forms.length === 0 ? 'No feedback forms yet.' : 'No forms match your filters.'}
              action={
                forms.length === 0 ? (
                  <Button onClick={() => navigate('/admin/feedback-questions')} className="gap-2">
                    <Plus className="w-4 h-4" /> Create Your First Form
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" /> Clear Filters
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-3 pb-2">
              <AnimatePresence initial={false}>
                {paginatedForms.map((form) => {
                  const interviewTypes = form.scopes?.interviewTypes || [];
                  const departmentIds = form.scopes?.departmentIds || [];
                  const designationIds = form.scopes?.designationIds || [];
                  const questionCount = form.questions?.length || 0;
                  const visibleDepartments = departmentIds.slice(0, 2);
                  const extraDepartments = Math.max(0, departmentIds.length - visibleDepartments.length);

                  return (
                    <motion.div
                      key={form.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div
                        className="group cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:border-foreground/15 hover:bg-muted/25"
                        onClick={() => { setPreviewForm(form); setPreviewOpen(true); }}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground transition-colors group-hover:border-foreground/10 group-hover:text-foreground">
                              <FileText className="h-[18px] w-[18px]" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-semibold text-foreground">{form.name}</h3>
                                <Badge variant="outline" className="font-normal">
                                  v{form.versionNumber || 1}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={form.isActive
                                    ? 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200'
                                    : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300'}
                                >
                                  {form.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>

                              {form.description ? (
                                <p className="text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                              ) : (
                                <p className="text-sm italic text-muted-foreground/70">No description</p>
                              )}

                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <Badge variant="secondary" className="gap-1 font-normal">
                                  <Layers className="h-3 w-3" />
                                  {questionCount} question{questionCount === 1 ? '' : 's'}
                                </Badge>

                                {interviewTypes.map((interviewType) => (
                                  <Badge key={`type-${form.id}-${interviewType}`} variant="outline" className="font-normal">
                                    {formatInterviewTypeLabel(interviewType)}
                                  </Badge>
                                ))}

                                {visibleDepartments.map((deptId) => (
                                  <Badge key={`dept-${form.id}-${deptId}`} variant="outline" className="gap-1 font-normal">
                                    <Building2 className="h-3 w-3" />
                                    {getDepartmentName(deptId)}
                                  </Badge>
                                ))}
                                {extraDepartments > 0 && (
                                  <Badge variant="outline" className="font-normal">
                                    +{extraDepartments} more
                                  </Badge>
                                )}

                                {designationIds.length > 0 && (
                                  <Badge variant="outline" className="gap-1 font-normal">
                                    <Briefcase className="h-3 w-3" />
                                    {designationIds.length} designation{designationIds.length === 1 ? '' : 's'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 lg:pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/feedback-questions?id=${form.id}`)}
                              className="gap-2"
                            >
                              <SquarePen className="w-4 h-4" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={form.isActive ? 'destructive' : 'default'}
                              onClick={() => handleStatusToggle(form, !form.isActive)}
                              loading={statusUpdatingId === form.id}
                              className="gap-2"
                            >
                              {form.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
        </LoadingSwap>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-background pt-3">
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
          </div>
        )}

        <FeedbackFormPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={previewForm}
          getDepartmentName={getDepartmentName}
          getDesignationName={getDesignationName}
        />
      </div>
    </Layout>
  );
};

export default FeedbackFormsPage;
