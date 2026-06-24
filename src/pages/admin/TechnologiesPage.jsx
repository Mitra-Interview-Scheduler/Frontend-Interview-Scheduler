import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Code2, Loader2, Tags } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { technologyAPI } from '@/services/technologyAPI';
import { getTechnologyCategoryLabel, toLookupCode } from '@/lib/technologyHelpers';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';
import CategoryManager from '@/components/admin/CategoryManager';

const TechnologiesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'technologies';

  const setActiveTab = (tab) => {
    setSearchParams(tab === 'categories' ? { tab: 'categories' } : {});
  };

  const [technologies, setTechnologies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTechnology, setEditingTechnology] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    newCategoryLabel: '',
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (filterCategory === 'ALL') {
      loadData();
    } else {
      filterTechnologies();
    }
  }, [filterCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [techData, catData] = await Promise.all([
        technologyAPI.getAllTechnologies(),
        technologyAPI.getAllCategories()
      ]);
      setTechnologies(techData || []);
      setCategories(catData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load technologies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTechnologies = async () => {
    try {
      setLoading(true);
      const data = await technologyAPI.getTechnologiesByCategory(filterCategory);
      setTechnologies(data || []);
    } catch (error) {
      console.error('Error filtering:', error);
      toast({
        title: "Error",
        description: "Failed to filter technologies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshTechnologies = async () => {
    if (filterCategory === 'ALL') {
      await loadData();
    } else {
      await filterTechnologies();
    }
  };

  const getCategoryColor = (categoryLabel) => {
    const colors = {
      'Programming Language': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      'Framework': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      'Database': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      'Cloud Platform': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
      'DevOps': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
      'Runtime': 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
      'Architecture': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
      'Cache': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      'Concept': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200',
      'General': 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[categoryLabel] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200';
  };

  const groupByCategory = (techs) => {
    return techs.reduce((acc, tech) => {
      const label = getTechnologyCategoryLabel(tech);
      if (!acc[label]) acc[label] = [];
      acc[label].push(tech);
      return acc;
    }, {});
  };

  const resolveCategoryId = async () => {
    if (isCustomCategory) {
      if (!formData.newCategoryLabel?.trim()) {
        throw new Error('Category label is required');
      }
      const created = await technologyAPI.createCategory({
        code: toLookupCode(formData.newCategoryLabel),
        label: formData.newCategoryLabel.trim(),
      });
      return created.id;
    }
    if (!formData.categoryId) {
      throw new Error('Category is required');
    }
    return Number(formData.categoryId);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      newCategoryLabel: '',
    });
    setIsCustomCategory(false);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setTimeout(() => setIsAddDialogOpen(true), 0);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleAddTechnology = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in technology name",
        variant: "destructive"
      });
      return;
    }

    setIsMutating(true);

    try {
      const categoryId = await resolveCategoryId();
      const payload = {
        name: formData.name.trim(),
        categoryId,
      };

      await technologyAPI.createTechnology(payload);
      await refreshTechnologies();
      handleCloseAddDialog();
      
      toast({
        title: "Success",
        description: `${formData.name} has been successfully added`
      });
    } catch (err) {
      console.error('Error creating technology:', err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create technology";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenEditDialog = (tech) => {
    setEditingTechnology(tech);
    setFormData({
      name: tech.name || '',
      categoryId: tech.category?.id ? String(tech.category.id) : '',
      newCategoryLabel: '',
    });
    setIsCustomCategory(false);
    setTimeout(() => setIsEditDialogOpen(true), 0);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingTechnology(null);
    resetForm();
  };

  const handleEditTechnology = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in technology name",
        variant: "destructive"
      });
      return;
    }

    setIsMutating(true);

    try {
      const categoryId = await resolveCategoryId();
      const payload = {
        name: formData.name.trim(),
        categoryId,
      };

      await technologyAPI.updateTechnology(editingTechnology.id, payload);
      await refreshTechnologies();
      handleCloseEditDialog();
      
      toast({
        title: "Success",
        description: "Technology updated successfully"
      });
    } catch (err) {
      console.error('Error updating technology:', err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to update technology";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTechnology = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    setIsMutating(true);

    try {
      await technologyAPI.deleteTechnology(id);
      await refreshTechnologies();
      
      toast({
        title: "Success",
        description: "Technology deleted successfully"
      });
    } catch (err) {
      console.error('Error deleting technology:', err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to delete technology";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const filteredTechnologies = technologies.filter(tech =>
    filterCategory === 'ALL' || tech.category?.code === filterCategory
  );

  const grouped = groupByCategory(filteredTechnologies);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Technologies</h1>
            <p className="text-muted-foreground">Manage technology stack, skills, and categories</p>
          </div>
          {activeTab === 'technologies' && (
            <Button onClick={handleOpenAddDialog} disabled={isMutating}>
              <Plus className="mr-2 h-4 w-4" />
              Add Technology
            </Button>
          )}
        </div>

        <AdminSectionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'technologies', label: 'Technologies', icon: Code2 },
            { value: 'categories', label: 'Categories', icon: Tags },
          ]}
        />

        {activeTab === 'categories' ? (
          <CategoryManager type="technology" onCategoriesChange={setCategories} />
        ) : (
          <>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Technology</DialogTitle>
              <DialogDescription>
                Add a new technology to your stack. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Technology Name *</Label>
                <Input 
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., React, Java, AWS" 
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-category">Category *</Label>
                <Select 
                  value={isCustomCategory ? 'custom' : formData.categoryId} 
                  onValueChange={(v) => {
                    if (v === 'custom') {
                      setIsCustomCategory(true);
                      setFormData({ ...formData, categoryId: '' });
                    } else {
                      setIsCustomCategory(false);
                      setFormData({ ...formData, categoryId: v, newCategoryLabel: '' });
                    }
                  }}
                  disabled={isMutating}
                >
                  <SelectTrigger id="add-category">
                    <SelectValue placeholder="Select or create category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.label}</SelectItem>
                    ))}
                    <SelectItem value="custom">+ Add New Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCustomCategory && (
                <div className="space-y-2">
                  <Label htmlFor="new-category-label">New Category Label *</Label>
                  <Input 
                    id="new-category-label"
                    value={formData.newCategoryLabel}
                    onChange={(e) => setFormData({ ...formData, newCategoryLabel: e.target.value })}
                    placeholder="e.g., Machine Learning, Mobile Development" 
                    disabled={isMutating}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={handleCloseAddDialog} 
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleAddTechnology} 
                disabled={isMutating}
              >
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isMutating ? 'Adding...' : 'Add Technology'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Technology</DialogTitle>
              <DialogDescription>
                Update technology details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Technology Name *</Label>
                <Input 
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select 
                  value={isCustomCategory ? 'custom' : formData.categoryId} 
                  onValueChange={(v) => {
                    if (v === 'custom') {
                      setIsCustomCategory(true);
                      setFormData({ ...formData, categoryId: '' });
                    } else {
                      setIsCustomCategory(false);
                      setFormData({ ...formData, categoryId: v, newCategoryLabel: '' });
                    }
                  }}
                  disabled={isMutating}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.label}</SelectItem>
                    ))}
                    <SelectItem value="custom">+ Add New Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCustomCategory && (
                <div className="space-y-2">
                  <Label htmlFor="edit-new-category-label">New Category Label *</Label>
                  <Input 
                    id="edit-new-category-label"
                    value={formData.newCategoryLabel}
                    onChange={(e) => setFormData({ ...formData, newCategoryLabel: e.target.value })}
                    placeholder="Enter new category label" 
                    disabled={isMutating}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={handleCloseEditDialog} 
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleEditTechnology} 
                disabled={isMutating}
              >
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isMutating ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Technology Stack ({technologies.length})</CardTitle>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.code}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {Object.keys(grouped).length === 0 ? (
              <div className="py-12 text-center">
                <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No technologies found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([category, techs], catIndex) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: catIndex * 0.1 }}
                  >
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Code2 className="w-4 h-4" />
                        {category} ({techs.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {techs.map((tech) => (
                          <Card key={tech.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Code2 className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium truncate">{tech.name}</h4>
                                    <Badge className={`${getCategoryColor(getTechnologyCategoryLabel(tech))} text-xs`}>
                                        {getTechnologyCategoryLabel(tech)}
                                      </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleOpenEditDialog(tech)}
                                    disabled={isMutating}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteTechnology(tech.id, tech.name)}
                                    disabled={isMutating}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TechnologiesPage;