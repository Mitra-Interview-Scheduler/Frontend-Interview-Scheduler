import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Edit, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { designationAPI } from '@/services/designationAPI';
import FeedbackFormPreview from '@/components/FeedbackFormPreview';

const FeedbackFormsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState(null);
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    departmentId: '',
    designationId: '',
  });

  const totalPages = Math.ceil(filteredForms.length / itemsPerPage);
  const paginatedForms = filteredForms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredForms]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [deptData, desigData] = await Promise.all([
          departmentAPI.getAllDepartments(),
          designationAPI.getAllDesignations(),
        ]);
        
        // Load forms only from the database
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

    loadData();
  }, []);

  useEffect(() => {
    let result = [...forms];

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

    setFilteredForms(result);
  }, [forms, filters]);

  const handleDelete = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;

    try {
      setDeleting(formId);
      await feedbackQuestionsAPI.delete(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
      toast({ title: 'Deleted', description: 'Form deleted successfully.' });
      setPreviewOpen(false);
      // Navigate to feedback forms page after successful delete
      setTimeout(() => navigate('/admin/feedback-forms'), 500);
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.message || 'Unable to delete form.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Feedback Forms</h1>
            <p className="text-muted-foreground">
              Manage all feedback forms used across your organization.
            </p>
          </div>

          <Button onClick={() => navigate('/admin/feedback-questions')} className="gap-2 w-fit">
            <Plus className="w-4 h-4" /> New Form
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
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
          <div className="flex h-64 items-center justify-center rounded-lg border">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading forms...</p>
            </div>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border">
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
          <div className="grid gap-4">
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
                            <h3 className="text-lg font-semibold text-foreground">{form.name}</h3>
                            {form.description && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                            )}
                            <div className="mt-3 text-xs text-muted-foreground">
                              {getFormStats(form)}
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
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(form.id)}
                              disabled={deleting === form.id}
                              className="gap-2"
                            >
                              {deleting === form.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {form.scopes && (
                          <div className="flex flex-wrap gap-2">
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
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {filteredForms.length > 0 ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredForms.length)} of ${filteredForms.length} form(s)` : 'No forms to display'}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FeedbackFormsPage;
