import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Mail, Phone, Edit, Trash2, Loader2, FileText, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { designationAPI } from '@/services/designationAPI';

const CANDIDATE_STATUSES = [
  'APPLIED', 'SCREENING', 'SCHEDULED', 'INTERVIEWED', 
  'TECHNICAL_ROUND', 'HR_ROUND', 'SELECTED', 'REJECTED', 
  'WITHDRAWN', 'ON_HOLD'
];

const CandidatesPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    targetDesignationId: '',
    yearsOfExperience: '',
    resumeUrl: '',
    notes: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [filterDepartment, filterStatus, searchTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [candidatesData, departmentsData, designationsData] = await Promise.all([
        candidateAPI.getAllCandidates(),
        departmentAPI.getAllDepartments(),
        designationAPI.getAllDesignations()
      ]);
      setCandidates(candidatesData || []);
      setDepartments(departmentsData || []);
      setDesignations(designationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const filters = {};
      
      // Only add filters if they have actual values
      if (filterDepartment && filterDepartment !== 'ALL') {
        filters.departmentId = parseInt(filterDepartment);
      }
      if (filterStatus && filterStatus !== 'ALL') {
        filters.status = filterStatus;
      }
      if (searchTerm && searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const data = await candidateAPI.getAllCandidates(filters);
      setCandidates(data || []);
    } catch (error) {
      console.error('Error applying filters:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to filter candidates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const availableDesignations = candidateForm.departmentId
    ? designations.filter(d => d.departmentId === parseInt(candidateForm.departmentId))
    : [];

  const handleOpenAddDialog = () => {
    setCandidateForm({
      name: '',
      email: '',
      phone: '',
      departmentId: '',
      targetDesignationId: '',
      yearsOfExperience: '',
      resumeUrl: '',
      notes: ''
    });
    setTimeout(() => setIsAddDialogOpen(true), 0);
  };

  const handleAddCandidate = async () => {
    if (!candidateForm.name?.trim() || !candidateForm.email?.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    const payload = {
      name: candidateForm.name.trim(),
      email: candidateForm.email.trim(),
      phone: candidateForm.phone?.trim() || null,
      departmentId: candidateForm.departmentId ? parseInt(candidateForm.departmentId) : null,
      targetDesignationId: candidateForm.targetDesignationId ? parseInt(candidateForm.targetDesignationId) : null,
      yearsOfExperience: candidateForm.yearsOfExperience ? parseInt(candidateForm.yearsOfExperience) : null,
      resumeUrl: candidateForm.resumeUrl?.trim() || null,
      notes: candidateForm.notes?.trim() || null
    };

    setIsMutating(true);
    try {
      await candidateAPI.createCandidate(payload);
      await applyFilters();
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Candidate added successfully" });
    } catch (err) {
      console.error('Error creating candidate:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to add candidate",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenEditDialog = (candidate) => {
    setEditingCandidate(candidate);
    setCandidateForm({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      departmentId: candidate.departmentId?.toString() || '',
      targetDesignationId: candidate.targetDesignationId?.toString() || '',
      yearsOfExperience: candidate.yearsOfExperience?.toString() || '',
      resumeUrl: candidate.resumeUrl || '',
      notes: candidate.notes || '',
      status: candidate.status
    });
    setTimeout(() => setIsEditDialogOpen(true), 0);
  };

  const handleEditCandidate = async () => {
    if (!candidateForm.name?.trim() || !candidateForm.email?.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    const payload = {
      name: candidateForm.name.trim(),
      email: candidateForm.email.trim(),
      phone: candidateForm.phone?.trim() || null,
      departmentId: candidateForm.departmentId ? parseInt(candidateForm.departmentId) : null,
      targetDesignationId: candidateForm.targetDesignationId ? parseInt(candidateForm.targetDesignationId) : null,
      status: candidateForm.status,
      yearsOfExperience: candidateForm.yearsOfExperience ? parseInt(candidateForm.yearsOfExperience) : null,
      resumeUrl: candidateForm.resumeUrl?.trim() || null,
      notes: candidateForm.notes?.trim() || null
    };

    setIsMutating(true);
    try {
      await candidateAPI.updateCandidate(editingCandidate.id, payload);
      await applyFilters();
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Candidate updated successfully" });
    } catch (err) {
      console.error('Error updating candidate:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update candidate",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;

    setIsMutating(true);
    try {
      await candidateAPI.deleteCandidate(id);
      await applyFilters();
      toast({ title: "Success", description: "Candidate deleted successfully" });
    } catch (err) {
      console.error('Error deleting candidate:', err);
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive"
      });
    } finally {
      setIsMutating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      APPLIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      SCREENING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      INTERVIEWED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      TECHNICAL_ROUND: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      HR_ROUND: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      SELECTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      WITHDRAWN: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && candidates.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading candidates...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
            <p className="text-muted-foreground">Manage and track all candidates</p>
          </div>
          <Button onClick={handleOpenAddDialog} disabled={isMutating} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Candidate
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  {CANDIDATE_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No candidates found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-4">
                          {/* Name and Status - Fixed width */}
                          <div className="w-48 shrink-0">
                            <h3 className="font-semibold text-base truncate">{candidate.name}</h3>
                            <Badge className={`${getStatusColor(candidate.status)} text-xs mt-1`}>
                              {candidate.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          {/* Contact Info */}
                          <div className="flex-1 min-w-0 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{candidate.email}</span>
                            </div>
                            {candidate.phone && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{candidate.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Position & Department Info */}
                          <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
                            {candidate.targetDesignationName && (
                              <div className="whitespace-nowrap">
                                <span className="font-medium text-foreground">
                                  {candidate.targetDesignationName}
                                </span>
                                {candidate.tierName && <span className="ml-1">({candidate.tierName})</span>}
                              </div>
                            )}
                            {candidate.departmentName && (
                              <div className="whitespace-nowrap">
                                {candidate.departmentName}
                              </div>
                            )}
                            {candidate.yearsOfExperience && (
                              <div className="whitespace-nowrap">
                                {candidate.yearsOfExperience}y exp
                              </div>
                            )}
                          </div>

                          {/* Applied Date */}
                          <div className="hidden xl:block text-xs text-muted-foreground whitespace-nowrap w-24 text-right">
                            {new Date(candidate.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1.5 shrink-0">
                            {/* {candidate.resumeUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(candidate.resumeUrl, '_blank')}
                                title="View Resume"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Button>
                            )} */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEditDialog(candidate)}
                              disabled={isMutating}
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>


{/* delete button is hidden temporaily */}

                            {/* <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteCandidate(candidate.id)}
                              disabled={isMutating}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button> */}
                          </div>
                        </div>

                        {/* Mobile: Additional Info Row */}
                        <div className="lg:hidden mt-2 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {candidate.targetDesignationName && (
                            <span>
                              <span className="font-medium text-foreground">Target:</span> {candidate.targetDesignationName}
                              {candidate.tierName && ` (${candidate.tierName})`}
                            </span>
                          )}
                          {candidate.departmentName && (
                            <span>
                              <span className="font-medium text-foreground">Dept:</span> {candidate.departmentName}
                            </span>
                          )}
                          {candidate.yearsOfExperience && (
                            <span>
                              <span className="font-medium text-foreground">Exp:</span> {candidate.yearsOfExperience} years
                            </span>
                          )}
                          <span>
                            <span className="font-medium text-foreground">Applied:</span> {new Date(candidate.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Candidate Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({...candidateForm, name: e.target.value})}
                  placeholder="Full name"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                  placeholder="email@example.com"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                  placeholder="+1234567890"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-experience">Years of Experience</Label>
                <Input
                  id="add-experience"
                  type="number"
                  min="0"
                  value={candidateForm.yearsOfExperience}
                  onChange={(e) => setCandidateForm({...candidateForm, yearsOfExperience: e.target.value})}
                  placeholder="5"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-department">Department</Label>
                <Select
                  value={candidateForm.departmentId}
                  onValueChange={(v) => setCandidateForm({...candidateForm, departmentId: v, targetDesignationId: ''})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="add-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-designation">Target Designation</Label>
                <Select
                  value={candidateForm.targetDesignationId}
                  onValueChange={(v) => setCandidateForm({...candidateForm, targetDesignationId: v})}
                  disabled={isMutating || !candidateForm.departmentId}
                >
                  <SelectTrigger id="add-designation">
                    <SelectValue placeholder={!candidateForm.departmentId ? "Select department first" : "Select designation"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDesignations.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name} {d.tierName && `(${d.tierName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="add-resume">Resume URL</Label>
                <Input
                  id="add-resume"
                  value={candidateForm.resumeUrl}
                  onChange={(e) => setCandidateForm({...candidateForm, resumeUrl: e.target.value})}
                  placeholder="https://..."
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  value={candidateForm.notes}
                  onChange={(e) => setCandidateForm({...candidateForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleAddCandidate} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Candidate Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Candidate</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({...candidateForm, name: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-experience">Years of Experience</Label>
                <Input
                  id="edit-experience"
                  type="number"
                  min="0"
                  value={candidateForm.yearsOfExperience}
                  onChange={(e) => setCandidateForm({...candidateForm, yearsOfExperience: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={candidateForm.status}
                  onValueChange={(v) => setCandidateForm({...candidateForm, status: v})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={candidateForm.departmentId}
                  onValueChange={(v) => setCandidateForm({...candidateForm, departmentId: v, targetDesignationId: ''})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="edit-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-designation">Target Designation</Label>
                <Select
                  value={candidateForm.targetDesignationId}
                  onValueChange={(v) => setCandidateForm({...candidateForm, targetDesignationId: v})}
                  disabled={isMutating}
                >
                  <SelectTrigger id="edit-designation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {designations
                      .filter(d => !candidateForm.departmentId || d.departmentId === parseInt(candidateForm.departmentId))
                      .map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name} {d.tierName && `(${d.tierName})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-resume">Resume URL</Label>
                <Input
                  id="edit-resume"
                  value={candidateForm.resumeUrl}
                  onChange={(e) => setCandidateForm({...candidateForm, resumeUrl: e.target.value})}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={candidateForm.notes}
                  onChange={(e) => setCandidateForm({...candidateForm, notes: e.target.value})}
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleEditCandidate} disabled={isMutating}>
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

export default CandidatesPage;