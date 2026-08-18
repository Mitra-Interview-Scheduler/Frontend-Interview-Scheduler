import React, { useState, useEffect, useMemo } from 'react';
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
import { Plus, Edit, Trash2, Building2, ArrowUp, ArrowDown, Layers, Briefcase, Search, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { designationAPI } from '@/services/designationAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { tierAPI } from '@/services/tierAPI';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';
import { LoadingState, useTabTransition } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ActiveStatusFilter } from '@/components/ui/active-status-filter';
import { DEFAULT_ACTIVE_STATUS, filterByActiveStatus, isRecordActive } from '@/lib/activeStatusFilter';
import { AnimatePresence, motion } from 'framer-motion';

import { getNormalizedRoles } from '@/lib/roleHelpers';

const DesignationsPage = () => {
  const { user } = useAuth();
  const userRoles = getNormalizedRoles(user);
  const isAdmin = userRoles.includes('ADMIN');
  const canCreateMasterData = userRoles.some((role) => ['ADMIN', 'HR', 'INTERVIEWER'].includes(role));
  const tabMotion = useTabTransition();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'designations'
    ? 'designations'
    : tabParam === 'tiers'
      ? 'tiers'
      : 'departments';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [designationSearch, setDesignationSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_ACTIVE_STATUS);
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, label, action }
  const [isAddDesignationOpen, setIsAddDesignationOpen] = useState(false);
  const [isEditDesignationOpen, setIsEditDesignationOpen] = useState(false);
  const [isAddTierOpen, setIsAddTierOpen] = useState(false);
  const [isEditTierOpen, setIsEditTierOpen] = useState(false);
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
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

  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [designationsData, departmentsData, tiersData] = await Promise.all([
        designationAPI.getAllDesignationsIncludingInactive(),
        departmentAPI.getAllDepartmentsIncludingInactive(),
        tierAPI.getAllTiersIncludingInactive()
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

  const refreshData = async () => {
    await loadData();
  };

  const activeDepartments = useMemo(
    () => departments.filter(isRecordActive),
    [departments],
  );

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

  const getTierBorder = (order) => {
    const borders = {
      1: 'border-emerald-400 dark:border-emerald-500',
      2: 'border-sky-400 dark:border-sky-500',
      3: 'border-violet-400 dark:border-violet-500',
      4: 'border-rose-400 dark:border-rose-500',
    };
    return borders[order] || 'border-gray-300 dark:border-gray-600';
  };

  // Department Management
  const handleOpenAddDepartment = () => {
    setDepartmentForm({ name: '', code: '' });
    setTimeout(() => setIsAddDepartmentOpen(true), 0);
  };

  const handleAddDepartment = async () => {
    if (!departmentForm.name?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Department name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsMutating(true);
    try {
      await departmentAPI.createDepartment({
        name: departmentForm.name.trim(),
        code: departmentForm.code?.trim() || null,
      });
      await refreshData();
      setIsAddDepartmentOpen(false);
      toast({ title: 'Success', description: 'Department created successfully' });
    } catch (err) {
      console.error('Error creating department:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create department',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
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

  const handleDeleteTier = (tier) => {
    setConfirmAction({ type: 'tier', id: tier.id, label: tier.name, action: 'deactivate' });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setIsMutating(true);
    try {
      if (confirmAction.action === 'reactivate') {
        if (confirmAction.type === 'tier') {
          await tierAPI.updateTier(confirmAction.id, { isActive: true });
        } else if (confirmAction.type === 'department') {
          await departmentAPI.updateDepartment(confirmAction.id, { isActive: true });
        } else {
          await designationAPI.updateDesignation(confirmAction.id, { isActive: true });
        }
        toast({ title: 'Success', description: `${confirmAction.type === 'department' ? 'Department' : confirmAction.type === 'tier' ? 'Tier' : 'Designation'} reactivated` });
      } else if (confirmAction.type === 'tier') {
        await tierAPI.deleteTier(confirmAction.id);
        toast({ title: 'Success', description: 'Tier deactivated successfully' });
      } else if (confirmAction.type === 'department') {
        await departmentAPI.deleteDepartment(confirmAction.id);
        toast({ title: 'Success', description: 'Department deactivated successfully' });
      } else {
        await designationAPI.deleteDesignation(confirmAction.id);
        toast({ title: 'Success', description: 'Designation deactivated successfully' });
      }
      setConfirmAction(null);
      await refreshData();
    } catch (err) {
      console.error('Error deleting:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

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

  const handleDeleteDesignation = (des) => {
    setConfirmAction({ type: 'designation', id: des.id, label: des.name, action: 'deactivate' });
  };

  const handleMoveDesignation = async (tierId, index, direction) => {
    const group = designations
      .filter((d) => d.tierId === tierId && isRecordActive(d))
      .sort((a, b) => a.levelOrder - b.levelOrder);
    
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === group.length - 1)) {
      return;
    }

    const current = group[index];
    const target = direction === 'up' ? group[index - 1] : group[index + 1];

    // Do a safe sequential swap to avoid unique-constraint conflicts on levelOrder
    const origCurrentLevel = current.levelOrder;
    const origTargetLevel = target.levelOrder;
    const tempLevel = 9999;

    setIsMutating(true);
    try {
      // set current to temporary level
      await designationAPI.updateDesignation(current.id, {
        name: current.name,
        levelOrder: tempLevel,
        tierId: current.tierId,
        description: current.description || null,
      });

      // set target to current's original level
      await designationAPI.updateDesignation(target.id, {
        name: target.name,
        levelOrder: origCurrentLevel,
        tierId: target.tierId,
        description: target.description || null,
      });

      // set current to target's original level
      await designationAPI.updateDesignation(current.id, {
        name: current.name,
        levelOrder: origTargetLevel,
        tierId: current.tierId,
        description: current.description || null,
      });

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

  const filteredTiers = useMemo(() => {
    const byDept = selectedDepartment === 'all'
      ? tiers
      : tiers.filter((t) => t.departmentId === parseInt(selectedDepartment, 10));
    return filterByActiveStatus(byDept, statusFilter);
  }, [tiers, selectedDepartment, statusFilter]);

  const filteredDepartments = useMemo(() => {
    const term = departmentSearch.trim().toLowerCase();
    const searched = !term
      ? departments
      : departments.filter((department) => (
        department.name?.toLowerCase().includes(term)
        || department.code?.toLowerCase().includes(term)
      ));
    return filterByActiveStatus(searched, statusFilter);
  }, [departments, departmentSearch, statusFilter]);

  const filteredDesignations = useMemo(() => {
    const term = designationSearch.trim().toLowerCase();
    const byDept = selectedDepartment === 'all'
      ? designations
      : designations.filter((des) => des.departmentId === parseInt(selectedDepartment, 10));
    const searched = !term
      ? byDept
      : byDept.filter((des) => (
        des.name?.toLowerCase().includes(term)
        || des.description?.toLowerCase().includes(term)
      ));
    return filterByActiveStatus(searched, statusFilter);
  }, [designations, designationSearch, selectedDepartment, statusFilter]);

  const groupedTiers = filteredTiers.reduce((acc, tier) => {
    const id = tier.departmentId || 0;
    if (!acc[id]) acc[id] = { departmentId: id, departmentName: tier.departmentName || 'Unassigned', tiers: [] };
    acc[id].tiers.push(tier);
    return acc;
  }, {});

  const availableTiersForForm = designationForm.departmentId
    ? tiers.filter((t) => t.departmentId === parseInt(designationForm.departmentId, 10) && isRecordActive(t))
    : [];

  const departmentFilterCard = (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Label className="whitespace-nowrap">Filter by Department:</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name}{!isRecordActive(d) ? ' (Inactive)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ActiveStatusFilter value={statusFilter} onValueChange={setStatusFilter} />
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'tiers' && canCreateMasterData && (
              <Button onClick={handleOpenAddTier} disabled={isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tier
              </Button>
            )}
            {activeTab === 'designations' && canCreateMasterData && (
              <Button onClick={handleOpenAddDesignation} disabled={isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Add Designation
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 overflow-hidden">
          <PageHeader
            title="Designations & Tiers"
            description={
              canCreateMasterData && !isAdmin
                ? 'Add departments, tiers, and designations for your profile and interviews'
                : 'Manage organizational hierarchy with departments, tiers, and designations'
            }
          />

          <AdminSectionTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              { value: 'departments', label: 'Departments', icon: Building2 },
              { value: 'tiers', label: 'Tiers', icon: Layers },
              { value: 'designations', label: 'Designations', icon: Briefcase },
            ]}
          />

          <LoadingState label="Loading…" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 overflow-hidden">
        <PageHeader
          title="Designations & Tiers"
          description={
            canCreateMasterData && !isAdmin
              ? 'Add departments, tiers, and designations for your profile and interviews'
              : 'Manage organizational hierarchy with departments, tiers, and designations'
          }
        />

        <AdminSectionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'departments', label: 'Departments', icon: Building2 },
            { value: 'tiers', label: 'Tiers', icon: Layers },
            { value: 'designations', label: 'Designations', icon: Briefcase },
          ]}
        />

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'departments' ? (
          <motion.div key="departments" className="space-y-4" {...tabMotion}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Departments</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organizational departments used for tiers and designations
                  </p>
                </div>
                {canCreateMasterData && (
                  <Button onClick={handleOpenAddDepartment} disabled={isMutating}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Department
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={departmentSearch}
                      onChange={(e) => setDepartmentSearch(e.target.value)}
                      placeholder="Search departments..."
                      className="pl-10"
                    />
                  </div>
                  <ActiveStatusFilter value={statusFilter} onValueChange={setStatusFilter} />
                </div>
                {departments.length === 0 ? (
                  <EmptyState icon={Building2} title="No departments found" compact />
                ) : filteredDepartments.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title={departmentSearch.trim() ? `No departments match "${departmentSearch.trim()}"` : 'No departments for this status'}
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredDepartments.map((department) => {
                      const inactive = !isRecordActive(department);
                      return (
                      <div
                        key={department.id}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                          inactive ? 'opacity-70' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{department.name}</span>
                            {department.code && (
                              <Badge variant="outline" className="text-[10px]">{department.code}</Badge>
                            )}
                            {inactive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                          </div>
                          {department.code && (
                            <p className="text-xs text-muted-foreground mt-1">Code: {department.code}</p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex shrink-0 gap-1">
                            {inactive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction({
                                  type: 'department',
                                  id: department.id,
                                  label: department.name,
                                  action: 'reactivate',
                                })}
                                disabled={isMutating}
                                className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction({
                                  type: 'department',
                                  id: department.id,
                                  label: department.name,
                                  action: 'deactivate',
                                })}
                                disabled={isMutating}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === 'tiers' ? (
          <motion.div key="tiers" className="space-y-4" {...tabMotion}>
            {departmentFilterCard}

            {/* Add Tier button moved into department filter card */}

            {filteredTiers.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState icon={Layers} title="No tiers found" />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-auto">
                {Object.values(groupedTiers).map((group) => (
                  <Card key={group.departmentId}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4" />
                          <span className="font-semibold">{group.departmentName} ({group.tiers.length})</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {group.tiers.sort((a, b) => a.tierOrder - b.tierOrder).map((tier) => {
                          const inactive = !isRecordActive(tier);
                          return (
                          <Card key={tier.id} className={inactive ? 'opacity-70' : ''}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Badge className={getTierColor(tier.tierOrder)}>
                                    Tier {tier.tierOrder}
                                  </Badge>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-semibold">{tier.name}</h3>
                                      {inactive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                                    </div>
                                    {tier.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  {isAdmin && (
                                    inactive ? (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setConfirmAction({
                                          type: 'tier',
                                          id: tier.id,
                                          label: tier.name,
                                          action: 'reactivate',
                                        })}
                                        disabled={isMutating}
                                        className="text-emerald-600 hover:text-emerald-700"
                                        title="Reactivate"
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                    <>
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
                                        onClick={() => handleDeleteTier(tier)}
                                        disabled={isMutating}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                    )
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="designations" className="space-y-4" {...tabMotion}>
            {departmentFilterCard}

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={designationSearch}
                onChange={(e) => setDesignationSearch(e.target.value)}
                placeholder="Search designations..."
                className="pl-10 bg-card"
              />
            </div>

            {designations.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Briefcase}
                    title="No designations available"
                    description="Please create designations first."
                  />
                </CardContent>
              </Card>
            ) : filteredDesignations.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Briefcase}
                    title={designationSearch.trim() ? `No designations match "${designationSearch.trim()}"` : 'No designations for this status'}
                    compact
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-auto">
                {(selectedDepartment === 'all' ? departments : departments.filter(d => d.id === parseInt(selectedDepartment))).map((dept) => {
                  const deptTiers = tiers.filter(t => t.departmentId === dept.id).sort((a, b) => a.tierOrder - b.tierOrder);
                  const deptHasItems = deptTiers.some(t => filteredDesignations.some(d => d.tierId === t.id));
                  if (!deptHasItems) return null;
                  return (
                    <Card key={dept.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-4 h-4" />
                            <span className="font-semibold">{dept.name}</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {deptTiers.map((tier) => {
                            const tierDesignations = filteredDesignations.filter(d => d.tierId === tier.id).sort((a, b) => a.levelOrder - b.levelOrder);
                            if (tierDesignations.length === 0) return null;
                            return (
                              <div key={tier.id} className={`space-y-6 border-l-4 pl-4 ${getTierBorder(tier.tierOrder)}`}>
                                <div className="flex items-center gap-3">
                                  <Badge className={getTierColor(tier.tierOrder)}>Tier {tier.tierOrder}</Badge>
                                  <h4 className="font-medium">{tier.name} ({tierDesignations.length})</h4>
                                </div>
                                <div className="space-y-6">
                                  {tierDesignations.map((des, idx, arr) => {
                                    const inactive = !isRecordActive(des);
                                    return (
                                    <Card key={des.id} className={`hover:shadow-md transition-shadow ${inactive ? 'opacity-70' : ''}`}>
                                      <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                          <Badge className={getLevelColor(des.levelOrder)}>Level {des.levelOrder}</Badge>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <h3 className="font-semibold truncate">{des.name}</h3>
                                              {inactive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                                            </div>
                                            {des.description && (
                                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{des.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                          {isAdmin && (
                                            inactive ? (
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setConfirmAction({
                                                  type: 'designation',
                                                  id: des.id,
                                                  label: des.name,
                                                  action: 'reactivate',
                                                })}
                                                disabled={isMutating}
                                                className="text-emerald-600 hover:text-emerald-700"
                                                title="Reactivate"
                                              >
                                                <RotateCcw className="h-4 w-4" />
                                              </Button>
                                            ) : (
                                            <>
                                              <Button variant="outline" size="icon" onClick={() => handleOpenEditDesignation(des)} disabled={isMutating}>
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button variant="outline" size="icon" onClick={() => handleDeleteDesignation(des)} disabled={isMutating}>
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                              {idx > 0 && !designationSearch.trim() && (
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                  const fullGroup = designations
                                                    .filter((d) => d.tierId === tier.id && isRecordActive(d))
                                                    .sort((a, b) => a.levelOrder - b.levelOrder);
                                                  const fullIdx = fullGroup.findIndex((d) => d.id === des.id);
                                                  if (fullIdx > 0) handleMoveDesignation(tier.id, fullIdx, 'up');
                                                }} disabled={isMutating}>
                                                  <ArrowUp className="h-4 w-4" />
                                                </Button>
                                              )}
                                              {idx < arr.length - 1 && !designationSearch.trim() && (
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                  const fullGroup = designations
                                                    .filter((d) => d.tierId === tier.id && isRecordActive(d))
                                                    .sort((a, b) => a.levelOrder - b.levelOrder);
                                                  const fullIdx = fullGroup.findIndex((d) => d.id === des.id);
                                                  if (fullIdx >= 0 && fullIdx < fullGroup.length - 1) {
                                                    handleMoveDesignation(tier.id, fullIdx, 'down');
                                                  }
                                                }} disabled={isMutating}>
                                                  <ArrowDown className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </>
                                            )
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Add Department Dialog */}
        <Dialog open={isAddDepartmentOpen} onOpenChange={setIsAddDepartmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
              <DialogDescription>Create a department for tiers and designations</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                                <div className="space-y-4">
                <Label htmlFor="department-name">Department Name *</Label>
                <Input
                  id="department-name"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  placeholder="e.g., Engineering"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-code">Code (optional)</Label>
                <Input
                  id="department-code"
                  value={departmentForm.code}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                  placeholder="e.g., ENG"
                  disabled={isMutating}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-generate a unique code from the department name.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDepartmentOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleAddDepartment} loading={isMutating}>
                Create Department
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    {activeDepartments.map(d => (
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
              <Button onClick={handleAddTier} loading={isMutating}>
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
              <Button onClick={handleEditTier} loading={isMutating}>
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
                    {activeDepartments.map(d => (
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
              <Button onClick={handleAddDesignation} loading={isMutating}>
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
              <Button onClick={handleEditDesignation} loading={isMutating}>
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => { if (!open && !isMutating) setConfirmAction(null); }}
        title={
          confirmAction?.action === 'reactivate'
            ? `Reactivate ${confirmAction.type}?`
            : `Deactivate ${confirmAction?.type || 'item'}?`
        }
        description={
          confirmAction
            ? confirmAction.action === 'reactivate'
              ? `Reactivate "${confirmAction.label}"? It will be available again.`
              : `Deactivate "${confirmAction.label}"? It will be moved to inactive.`
            : undefined
        }
        confirmLabel={confirmAction?.action === 'reactivate' ? 'Reactivate' : 'Deactivate'}
        destructive={confirmAction?.action !== 'reactivate'}
        onConfirm={executeConfirmAction}
        loading={isMutating}
      />
    </Layout>
  );
};

export default DesignationsPage;