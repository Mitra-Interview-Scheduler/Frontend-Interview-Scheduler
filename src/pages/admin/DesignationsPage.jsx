import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Building2, ArrowUp, ArrowDown, Loader2, Layers } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { designationAPI } from '@/services/designationAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { tierAPI } from '@/services/tierAPI';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';

const DesignationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'designations' ? 'designations' : 'tiers';

  const setActiveTab = (tab) => {
    setSearchParams(tab === 'designations' ? { tab: 'designations' } : {});
  };

  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddDesignationOpen, setIsAddDesignationOpen] = useState(false);
  const [isEditDesignationOpen, setIsEditDesignationOpen] = useState(false);
  const [isAddTierOpen, setIsAddTierOpen] = useState(false);
  const [isEditTierOpen, setIsEditTierOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [editingTier, setEditingTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [designationForm, setDesignationForm] = useState({
    name: '',
    levelOrder: '',
    departmentId: '',
    tierId: '',
    description: ''
  });

  const [tierForm, setTierForm] = useState({
    name: '',
    tierOrder: '',
    departmentId: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDepartment === 'all') {
      loadData();
    } else {
      filterByDepartment();
    }
  }, [selectedDepartment]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [designationsData, departmentsData, tiersData] = await Promise.all([
        designationAPI.getAllDesignations(),
        departmentAPI.getAllDepartments(),
        tierAPI.getAllTiers()
      ]);
      setDesignations(designationsData || []);
      setDepartments(departmentsData || []);
      setTiers(tiersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterByDepartment = async () => {
    try {
      setLoading(true);
      const [designationsData, tiersData] = await Promise.all([
        designationAPI.getDesignationsByDepartment(parseInt(selectedDepartment)),
        tierAPI.getTiersByDepartment(parseInt(selectedDepartment))
      ]);
      setDesignations(designationsData || []);
      setTiers(tiersData || []);
    } catch (error) {
      console.error('Error filtering:', error);
      toast({
        title: "Error",
        description: "Failed to filter data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (selectedDepartment === 'all') {
      await loadData();
    } else {
      await filterByDepartment();
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      1: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      2: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      4: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
      5: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[level] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200';
  };

  const getTierColor = (order) => {
    const colors = {
      1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
      2: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
      3: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
      4: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
    };
    return colors[order] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200';
  };

  // Tier Management
  const handleOpenAddTier = () => {
    setTierForm({ name: '', tierOrder: '', departmentId: '', description: '' });
    setTimeout(() => setIsAddTierOpen(true), 0);
  };

  const handleAddTier = async () => {
    if (!tierForm.name?.trim() || !tierForm.tierOrder || !tierForm.departmentId) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }

    const payload = {
      name: tierForm.name.trim(),
      tierOrder: parseInt(tierForm.tierOrder),
      departmentId: parseInt(tierForm.departmentId),
      description: tierForm.description?.trim() || null
    };

    setIsMutating(true);
    try {
      await tierAPI.createTier(payload);
      await refreshData();
      setIsAddTierOpen(false);
      toast({ title: "Success", description: "Tier created successfully" });
    } catch (err) {
      console.error('Error creating tier:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create tier",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name || '',
      tierOrder: tier.tierOrder?.toString() || '',
      departmentId: tier.departmentId?.toString() || '',
      description: tier.description || ''
    });
    setTimeout(() => setIsEditTierOpen(true), 0);
  };

  const handleEditTier = async () => {
    if (!tierForm.name?.trim() || !tierForm.tierOrder) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }

    const payload = {
      name: tierForm.name.trim(),
      tierOrder: parseInt(tierForm.tierOrder),
      description: tierForm.description?.trim() || null
    };

    setIsMutating(true);
    try {
      await tierAPI.updateTier(editingTier.id, payload);
      await refreshData();
      setIsEditTierOpen(false);
      toast({ title: "Success", description: "Tier updated successfully" });
    } catch (err) {
      console.error('Error updating tier:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update tier",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTier = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tier?")) return;

    setIsMutating(true);
    try {
      await tierAPI.deleteTier(id);
      await refreshData();
      toast({ title: "Success", description: "Tier deleted successfully" });
    } catch (err) {
      console.error('Error deleting tier:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete tier",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  // Designation Management
  const handleOpenAddDesignation = () => {
    setDesignationForm({ name: '', levelOrder: '', departmentId: '', tierId: '', description: '' });
    setTimeout(() => setIsAddDesignationOpen(true), 0);
  };

  const handleAddDesignation = async () => {
    if (!designationForm.name?.trim() || !designationForm.levelOrder || !designationForm.departmentId || !designationForm.tierId) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }

    const payload = {
      name: designationForm.name.trim(),
      levelOrder: parseInt(designationForm.levelOrder),
      departmentId: parseInt(designationForm.departmentId),
      tierId: parseInt(designationForm.tierId),
      description: designationForm.description?.trim() || null
    };

    setIsMutating(true);
    try {
      await designationAPI.createDesignation(payload);
      await refreshData();
      setIsAddDesignationOpen(false);
      toast({ title: "Success", description: "Designation created successfully" });
    } catch (err) {
      console.error('Error creating designation:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create designation",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenEditDesignation = (des) => {
    setEditingDesignation(des);
    setDesignationForm({
      name: des.name || '',
      levelOrder: des.levelOrder?.toString() || '',
      departmentId: des.departmentId?.toString() || '',
      tierId: des.tierId?.toString() || '',
      description: des.description || ''
    });
    setTimeout(() => setIsEditDesignationOpen(true), 0);
  };

  const handleEditDesignation = async () => {
    if (!designationForm.name?.trim() || !designationForm.levelOrder) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }

    const payload = {
      name: designationForm.name.trim(),
      levelOrder: parseInt(designationForm.levelOrder),
      tierId: designationForm.tierId ? parseInt(designationForm.tierId) : null,
      description: designationForm.description?.trim() || null
    };

    setIsMutating(true);
    try {
      await designationAPI.updateDesignation(editingDesignation.id, payload);
      await refreshData();
      setIsEditDesignationOpen(false);
      toast({ title: "Success", description: "Designation updated successfully" });
    } catch (err) {
      console.error('Error updating designation:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update designation",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteDesignation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this designation?")) return;

    setIsMutating(true);
    try {
      await designationAPI.deleteDesignation(id);
      await refreshData();
      toast({ title: "Success", description: "Designation deleted successfully" });
    } catch (err) {
      console.error('Error deleting designation:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete designation",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleMoveDesignation = async (tierId, index, direction) => {
    const group = designations
      .filter(d => d.tierId === tierId)
      .sort((a, b) => a.levelOrder - b.levelOrder);
    
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === group.length - 1)) {
      return;
    }

    const current = group[index];
    const target = direction === 'up' ? group[index - 1] : group[index + 1];

    const tempLevel = current.levelOrder;
    const updateCurrent = { levelOrder: target.levelOrder };
    const updateTarget = { levelOrder: tempLevel };

    setIsMutating(true);
    try {
      await Promise.all([
        designationAPI.updateDesignation(current.id, updateCurrent),
        designationAPI.updateDesignation(target.id, updateTarget)
      ]);
      await refreshData();
      toast({ title: "Success", description: "Order updated successfully" });
    } catch (err) {
      console.error('Error reordering:', err);
      toast({ 
        title: "Error", 
        description: "Failed to reorder designations",
        variant: "destructive" 
      });
    } finally {
      setIsMutating(false);
    }
  };

  const filteredTiers = selectedDepartment === 'all' 
    ? tiers 
    : tiers.filter(t => t.departmentId === parseInt(selectedDepartment));

  const filteredDesignationCount = selectedDepartment === 'all'
    ? designations.length
    : designations.filter((d) => {
        const tier = tiers.find((t) => t.id === d.tierId);
        return tier?.departmentId === parseInt(selectedDepartment);
      }).length;

  const availableTiersForForm = designationForm.departmentId
    ? tiers.filter(t => t.departmentId === parseInt(designationForm.departmentId))
    : [];

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
            <h1 className="text-3xl font-bold tracking-tight">Designations & Tiers</h1>
            <p className="text-muted-foreground mt-1">Manage organizational hierarchy with tiers and designations</p>
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">Filter by Department:</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <AdminSectionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'tiers', label: 'Tiers', icon: Layers, count: filteredTiers.length },
            { value: 'designations', label: 'Designations', icon: Building2, count: filteredDesignationCount },
          ]}
        />

        {activeTab === 'tiers' ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleOpenAddTier} disabled={isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tier
              </Button>
            </div>

            {filteredTiers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tiers found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTiers
                  .sort((a, b) => a.tierOrder - b.tierOrder)
                  .map((tier) => (
                    <Card key={tier.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge className={getTierColor(tier.tierOrder)}>
                              Tier {tier.tierOrder}
                            </Badge>
                            <div>
                              <h3 className="font-semibold">{tier.name}</h3>
                              {tier.description && (
                                <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {tier.departmentName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleOpenEditTier(tier)}
                              disabled={isMutating}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleDeleteTier(tier.id)}
                              disabled={isMutating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleOpenAddDesignation} disabled={isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Add Designation
              </Button>
            </div>

            {filteredTiers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tiers available. Please create tiers first.</p>
                </CardContent>
              </Card>
            ) : (
              filteredTiers
                .sort((a, b) => a.tierOrder - b.tierOrder)
                .map((tier) => {
                  const tierDesignations = designations
                    .filter(d => d.tierId === tier.id)
                    .sort((a, b) => a.levelOrder - b.levelOrder);

                  return (
                    <Card key={tier.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5" />
                          {tier.name} - {tier.departmentName} ({tierDesignations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {tierDesignations.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No designations in this tier
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {tierDesignations.map((des, idx, arr) => (
                              <Card key={des.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <Badge className={getLevelColor(des.levelOrder)}>
                                      Level {des.levelOrder}
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-semibold truncate">{des.name}</h3>
                                      {des.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                          {des.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      onClick={() => handleOpenEditDesignation(des)}
                                      disabled={isMutating}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      onClick={() => handleDeleteDesignation(des.id)}
                                      disabled={isMutating}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    {idx > 0 && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleMoveDesignation(tier.id, idx, 'up')}
                                        disabled={isMutating}
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {idx < arr.length - 1 && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleMoveDesignation(tier.id, idx, 'down')}
                                        disabled={isMutating}
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        )}

        {/* Add Tier Dialog */}
        <Dialog open={isAddTierOpen} onOpenChange={setIsAddTierOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tier</DialogTitle>
              <DialogDescription>Create a new tier for organizational hierarchy</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tier-name">Tier Name *</Label>
                <Input 
                  id="tier-name"
                  value={tierForm.name} 
                  onChange={e => setTierForm({...tierForm, name: e.target.value})}
                  placeholder="e.g., Senior Level"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-department">Department *</Label>
                <Select 
                  value={tierForm.departmentId} 
                  onValueChange={v => setTierForm({...tierForm, departmentId: v})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="tier-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-order">Tier Order *</Label>
                <Input 
                  id="tier-order"
                  type="number" 
                  min="1"
                  value={tierForm.tierOrder}
                  onChange={e => setTierForm({...tierForm, tierOrder: e.target.value})}
                  placeholder="1, 2, 3..."
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-description">Description</Label>
                <Textarea 
                  id="tier-description"
                  value={tierForm.description} 
                  onChange={e => setTierForm({...tierForm, description: e.target.value})}
                  placeholder="Brief description..."
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTierOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleAddTier} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Tier Dialog */}
        <Dialog open={isEditTierOpen} onOpenChange={setIsEditTierOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tier</DialogTitle>
              <DialogDescription>Update tier details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tier-name">Tier Name *</Label>
                <Input 
                  id="edit-tier-name"
                  value={tierForm.name} 
                  onChange={e => setTierForm({...tierForm, name: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <div className="py-2 px-3 bg-muted rounded-md text-sm font-medium">
                  {editingTier?.departmentName || 'N/A'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier-order">Tier Order *</Label>
                <Input 
                  id="edit-tier-order"
                  type="number" 
                  min="1"
                  value={tierForm.tierOrder}
                  onChange={e => setTierForm({...tierForm, tierOrder: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier-description">Description</Label>
                <Textarea 
                  id="edit-tier-description"
                  value={tierForm.description} 
                  onChange={e => setTierForm({...tierForm, description: e.target.value})}
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditTierOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleEditTier} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Designation Dialog */}
        <Dialog open={isAddDesignationOpen} onOpenChange={setIsAddDesignationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Designation</DialogTitle>
              <DialogDescription>Create a new designation within a tier</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-des-name">Designation Name *</Label>
                <Input 
                  id="add-des-name"
                  value={designationForm.name} 
                  onChange={e => setDesignationForm({...designationForm, name: e.target.value})}
                  placeholder="e.g., Senior Manager"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-des-department">Department *</Label>
                <Select 
                  value={designationForm.departmentId} 
                  onValueChange={v => setDesignationForm({...designationForm, departmentId: v, tierId: ''})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="add-des-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-des-tier">Tier *</Label>
                <Select 
                  value={designationForm.tierId} 
                  onValueChange={v => setDesignationForm({...designationForm, tierId: v})}
                  disabled={isMutating || !designationForm.departmentId}
                >
                  <SelectTrigger id="add-des-tier">
                    <SelectValue placeholder={!designationForm.departmentId ? "Select department first" : "Select a tier"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTiersForForm.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} (Tier {t.tierOrder})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-des-level">Level Order *</Label>
                <Input 
                  id="add-des-level"
                  type="number" 
                  min="1"
                  value={designationForm.levelOrder}
                  onChange={e => setDesignationForm({...designationForm, levelOrder: e.target.value})}
                  placeholder="1, 2, 3..."
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-des-description">Description</Label>
                <Textarea 
                  id="add-des-description"
                  value={designationForm.description} 
                  onChange={e => setDesignationForm({...designationForm, description: e.target.value})}
                  placeholder="Brief description..."
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDesignationOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleAddDesignation} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Designation Dialog */}
        <Dialog open={isEditDesignationOpen} onOpenChange={setIsEditDesignationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Designation</DialogTitle>
              <DialogDescription>Update designation details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-des-name">Designation Name *</Label>
                <Input 
                  id="edit-des-name"
                  value={designationForm.name} 
                  onChange={e => setDesignationForm({...designationForm, name: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <div className="py-2 px-3 bg-muted rounded-md text-sm font-medium">
                  {editingDesignation?.departmentName || 'N/A'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-des-tier">Tier</Label>
                <Select 
                  value={designationForm.tierId} 
                  onValueChange={v => setDesignationForm({...designationForm, tierId: v})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="edit-des-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers
                      .filter(t => t.departmentId === editingDesignation?.departmentId)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name} (Tier {t.tierOrder})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-des-level">Level Order *</Label>
                <Input 
                  id="edit-des-level"
                  type="number" 
                  min="1"
                  value={designationForm.levelOrder}
                  onChange={e => setDesignationForm({...designationForm, levelOrder: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-des-description">Description</Label>
                <Textarea 
                  id="edit-des-description"
                  value={designationForm.description} 
                  onChange={e => setDesignationForm({...designationForm, description: e.target.value})}
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDesignationOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleEditDesignation} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default DesignationsPage;