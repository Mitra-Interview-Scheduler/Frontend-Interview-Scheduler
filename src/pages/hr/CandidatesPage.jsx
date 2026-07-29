// src/pages/hr/CandidatesPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Manages candidates with:
//  • 3-level cascade: Department → Tier → Designation
//  • New fields: JD URL, Job Reference Code, Location
//  • Global email uniqueness validation
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CandidateAvatar } from '@/components/CandidateAvatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Edit,
  Loader2,
  Hash,
  Users,
  CalendarClockIcon,
  Eye,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import  candidateAPI from '@/services/candidateAPI';

import { departmentAPI } from '@/services/departmentAPI';
import CandidateDialogPage from './components/CandidateDialogPage';
import CandidateInterviewSchedulePage from './components/CandidateInterviewSchedulePage';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { useCandidateSteps } from '@/hooks/useCandidateSteps';
import { getCandidateStatusBadgeClass, getCandidateStatusLabel } from '@/lib/candidateSteps';
import { useAuth } from '@/context/AuthContext';

const CANDIDATES_PER_PAGE = 10;

const getCandidateSubtitle = (candidate) => {
  return candidate.departmentName || candidate.email || '-';
};

const getTargetDesignation = (candidate) => {
  return candidate.targetDesignationName || '-';
};

const CandidatesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatDate } = useFormattedDateTime();
  const { candidateSteps } = useCandidateSteps();
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isInterviewSchedulePageOpen, setIsInterviewSchedulePageOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const id = setTimeout(applyFilters, 300);
    return () => clearTimeout(id);
  }, [filterDepartment, filterStatus, searchTerm, assignedToMe, currentPage, user?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDepartment, filterStatus, searchTerm, assignedToMe]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadInitialData = async () => {
    try {
      const depts = await departmentAPI.getAllDepartments();
      setDepartments(depts || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load departments', variant: 'destructive' });
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterDepartment !== 'ALL') filters.departmentId = parseInt(filterDepartment, 10);
      if (filterStatus !== 'ALL') filters.status = filterStatus;
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (assignedToMe && user?.id) filters.coordinatedHrId = user.id;
      const data = await candidateAPI.getAllCandidates(filters, {
        page: currentPage - 1,
        size: CANDIDATES_PER_PAGE,
      });
      setCandidates(data?.content || []);
      setTotalCandidatesCount(data?.totalElements ?? (data?.content?.length || 0));
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to filter candidates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedCandidate(null);
    setIsReadOnly(false);
    setIsAddOpen(true);
  };

  const handleOpenView = async (candidate) => {
    try {
      const details = await candidateAPI.getCandidateById(candidate.id);
      setSelectedCandidate(details);
      setIsReadOnly(true);
      setIsEditOpen(true);
    } catch (err) {
      console.error('Failed to load candidate details:', err);
      toast({ title: 'Error', description: 'Failed to load candidate details', variant: 'destructive' });
    }
  };

  const handleOpenEdit = (candidate) => {
    setSelectedCandidate(candidate);
    setIsReadOnly(false);
    setIsEditOpen(true);
  };

  const handleViewToEdit = () => {
    setIsReadOnly(false);
  };

  const handleOpenInterviewSchedulePage = (candidate) => {
    setSelectedCandidate(candidate);
    setIsEditOpen(false);
    setIsInterviewSchedulePageOpen(true);
  };

  if (loading && candidates.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading candidates…</span>
        </div>
      </Layout>
    );
  }

  const startIndex = (currentPage - 1) * CANDIDATES_PER_PAGE;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
            <p className="text-muted-foreground">Manage and track all candidates</p>
          </div>
          <Button onClick={handleOpenAdd} disabled={loading} className="gap-2">
            <Plus className="w-4 h-4" /> Add Candidate
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or resource request number…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  {candidateSteps.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 sm:self-stretch">
                <Checkbox
                  id="assigned-to-me"
                  checked={assignedToMe}
                  onCheckedChange={(checked) => setAssignedToMe(checked === true)}
                />
                <Label htmlFor="assigned-to-me" className="cursor-pointer whitespace-nowrap text-sm font-medium">
                  Assigned to me
                </Label>
              </div>
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
              <div className="space-y-3">
                <div className="hidden lg:block rounded-lg border bg-card">
                  <Table className="table-fixed" wrapperClassName="max-h-[calc(100vh-24rem)] overflow-auto" style={{ minWidth: '1100px' }}>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: 170 }}>Candidate</TableHead>
                        <TableHead style={{ width: 170 }}>Email</TableHead>
                        <TableHead style={{ width: 120 }}>Phone Number</TableHead>
                        <TableHead style={{ width: 120 }}>RR Number</TableHead>
                        <TableHead style={{ width: 90 }}>Experience</TableHead>
                        <TableHead style={{ width: 150 }}>Target Designation</TableHead>
                        <TableHead style={{ width: 110 }}>Created On</TableHead>
                        <TableHead style={{ width: 130 }}>Created By</TableHead>
                        <TableHead style={{ width: 90 }}>Status</TableHead>
                        <TableHead style={{ width: 100 }} className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((candidate) => (
                        <TableRow key={candidate.id} className="cursor-pointer" onClick={() => handleOpenView(candidate)}>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 min-w-0">
                                  <CandidateAvatar
                                    candidate={candidate}
                                    className="h-9 w-9 border border-border shrink-0"
                                    fallbackClassName="bg-primary/15 text-primary font-semibold text-sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <p className="font-semibold truncate">{candidate.name}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {getCandidateSubtitle(candidate)}
                                    </p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.name || getCandidateSubtitle(candidate)}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 min-w-0">
                                  <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{candidate.email}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.email || '-'}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 min-w-0">
                                  <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{candidate.phone || '-'}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.phone || '-'}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 min-w-0">
                                  <Hash className="w-4 h-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{candidate.resourceRequestNumber || '-'}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.resourceRequestNumber || '-'}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate">{candidate.yearsOfExperience ? `${candidate.yearsOfExperience}y exp` : '-'}</span>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.yearsOfExperience ? `${candidate.yearsOfExperience} years experience` : '-'}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate">{getTargetDesignation(candidate)}</span>
                              </TooltipTrigger>
                              <TooltipContent>{getTargetDesignation(candidate)}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate">
                                  {candidate.createdAt ? formatDate(candidate.createdAt) : '-'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {candidate.createdAt ? formatDate(candidate.createdAt) : '-'}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate">{candidate.createdByName || '-'}</span>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.createdByName || '-'}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className={`${getCandidateStatusBadgeClass(candidateSteps, candidate.status)} text-xs shrink-0`}>
                                  {getCandidateStatusLabel(candidateSteps, candidate.status)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{getCandidateStatusLabel(candidateSteps, candidate.status)}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); handleOpenView(candidate); }}
                                disabled={loading}
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(candidate); }}
                                disabled={loading}
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); handleOpenInterviewSchedulePage(candidate); }}
                                disabled={loading}
                                title="Schedule"
                              >
                                <CalendarClockIcon className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 lg:hidden">
                  {candidates.map((candidate, index) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenView(candidate)}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-1 min-w-0 w-full">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 min-w-0 w-full">
                                  <CandidateAvatar
                                    candidate={candidate}
                                    className="h-9 w-9 border border-border shrink-0"
                                    fallbackClassName="bg-primary/15 text-primary font-semibold text-sm"
                                  />
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <h3 className="font-semibold text-base truncate">{candidate.name}</h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {getCandidateSubtitle(candidate)}
                                    </p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.name || getCandidateSubtitle(candidate)}</TooltipContent>
                            </Tooltip>
                            <div className="shrink-0 ml-2">
                              <Badge className={`${getCandidateStatusBadgeClass(candidateSteps, candidate.status)} text-xs`}> 
                                {getCandidateStatusLabel(candidateSteps, candidate.status)}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span><span className="font-medium text-foreground">Email:</span> {candidate.email}</span>
                            <span><span className="font-medium text-foreground">Phone:</span> {candidate.phone || '-'}</span>
                            <span><span className="font-medium text-foreground">RR:</span> {candidate.resourceRequestNumber || '-'}</span>
                            <span><span className="font-medium text-foreground">Exp:</span> {candidate.yearsOfExperience ? `${candidate.yearsOfExperience} years` : '-'}</span>
                            <span><span className="font-medium text-foreground">Target:</span> {getTargetDesignation(candidate)}</span>
                            <span><span className="font-medium text-foreground">Created On:</span> {candidate.createdAt ? formatDate(candidate.createdAt) : '-'}</span>
                            <span><span className="font-medium text-foreground">Created By:</span> {candidate.createdByName || '-'}</span>
                          </div>

                          <div className="mt-2 pt-2 border-t flex items-center justify-end gap-1.5">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); handleOpenView(candidate); }} disabled={loading} title="View Details">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(candidate); }} disabled={loading} title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); handleOpenInterviewSchedulePage(candidate); }} disabled={loading} title="Schedule">
                              <CalendarClockIcon className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {!loading && totalCandidatesCount > 0 && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + CANDIDATES_PER_PAGE, totalCandidatesCount)} of {totalCandidatesCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <CandidateDialogPage
          open={isAddOpen}
          candidate={null}
          departments={departments}
          candidateSteps={candidateSteps}
          onOpenChange={setIsAddOpen}
          onSaveSuccess={applyFilters}
          onSchedule={setIsInterviewSchedulePageOpen}
          mode="create"
        />

        <CandidateDialogPage
          open={isEditOpen}
          candidate={selectedCandidate}
          departments={departments}
          candidateSteps={candidateSteps}
          onOpenChange={setIsEditOpen}
          onSaveSuccess={applyFilters}
          readOnly={isReadOnly}
          onEdit={handleViewToEdit}
          onSchedule={() => {
            setIsEditOpen(false);
            setIsInterviewSchedulePageOpen(true);
          }}
        />

        <CandidateInterviewSchedulePage
          open={isInterviewSchedulePageOpen}
          candidate={selectedCandidate}
          onOpenChange={setIsInterviewSchedulePageOpen}
        />
      </div>
    </Layout>
  );
};

export default CandidatesPage;
