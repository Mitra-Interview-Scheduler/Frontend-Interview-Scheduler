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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { candidateAPI } from '@/services/candidateAPI';
import { departmentAPI } from '@/services/departmentAPI';
import CandidateDialogPage from './components/CandidateDialogPage';
import CandidateInterviewSchedulePage from './components/CandidateInterviewSchedulePage';
import { getInitial } from '@/lib/personUtils';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

const CANDIDATE_STATUSES = [
  'APPLIED',
  'SCREENING',
  'SCHEDULED',
  'INTERVIEWED',
  'TECHNICAL_ROUND',
  'HR_ROUND',
  'SELECTED',
  'REJECTED',
  'WITHDRAWN',
  'ON_HOLD',
];

const CANDIDATES_PER_PAGE = 10;

const STATUS_COLORS = {
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

const getCandidateSubtitle = (candidate) => {
  return candidate.departmentName || candidate.email || '-';
};

const getTargetDesignation = (candidate) => {
  return candidate.targetDesignationName || '-';
};

const getRowTooltip = (candidate) => {
  if (!candidate) return '';
  const parts = [
    candidate.name || '-',
    candidate.email || '-',
    candidate.phone || '-',
    `RR: ${candidate.resourceRequestNumber || '-'}`,
    `Exp: ${candidate.yearsOfExperience ? `${candidate.yearsOfExperience}y` : '-'}`,
    `Target: ${candidate.targetDesignationName || '-'}`,
    `Status: ${candidate.status ? candidate.status.replace(/_/g, ' ') : '-'}`,
  ];
  return parts.join(' • ');
};

const CandidatesPage = () => {
  const navigate = useNavigate();
  const { formatDate } = useFormattedDateTime();
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
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
  }, [filterDepartment, filterStatus, searchTerm, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDepartment, filterStatus, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [cands, depts] = await Promise.all([
        candidateAPI.getAllCandidates({}, { page: 0, size: CANDIDATES_PER_PAGE }),
        departmentAPI.getAllDepartments(),
      ]);
      setCandidates(cands?.content || []);
      setTotalCandidatesCount(cands?.totalElements ?? (cands?.content?.length || 0));
      setTotalPages(cands?.totalPages || 1);
      setDepartments(depts || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load candidates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterDepartment !== 'ALL') filters.departmentId = parseInt(filterDepartment, 10);
      if (filterStatus !== 'ALL') filters.status = filterStatus;
      if (searchTerm.trim()) filters.search = searchTerm.trim();
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
                  {CANDIDATE_STATUSES.map((s) => (
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
              <div className="space-y-3">
                <div className="hidden lg:block rounded-lg border bg-card">
                  <Table className="table-fixed" wrapperClassName="max-h-[calc(100vh-24rem)] overflow-auto">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[18%]">Candidate</TableHead>
                        <TableHead className="w-[17%]">Email</TableHead>
                        <TableHead className="w-[14%]">Phone Number</TableHead>
                        <TableHead className="w-[14%]">RR Number</TableHead>
                        <TableHead className="w-[12%]">Experience</TableHead>
                        <TableHead className="w-[12%]">Target Designation</TableHead>
                        <TableHead className="w-[12%]">Status</TableHead>
                        <TableHead className="w-[13%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((candidate) => (
                        <TableRow key={candidate.id} className="cursor-pointer" onClick={() => handleOpenView(candidate)}>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar className="h-9 w-9 border border-border shrink-0">
                                    <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
                                      {getInitial(candidate.name)}
                                    </AvatarFallback>
                                  </Avatar>
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
                                <Badge className={`${STATUS_COLORS[candidate.status] || 'bg-gray-100 text-gray-800'} text-xs shrink-0`}>
                                  {candidate.status.replace(/_/g, ' ')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{candidate.status ? candidate.status.replace(/_/g, ' ') : '-'}</TooltipContent>
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
                                  <Avatar className="h-9 w-9 border border-border shrink-0">
                                    <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
                                      {getInitial(candidate.name)}
                                    </AvatarFallback>
                                  </Avatar>
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
                              <Badge className={`${STATUS_COLORS[candidate.status] || 'bg-gray-100 text-gray-800'} text-xs`}> 
                                {candidate.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span><span className="font-medium text-foreground">Email:</span> {candidate.email}</span>
                            <span><span className="font-medium text-foreground">Phone:</span> {candidate.phone || '-'}</span>
                            <span><span className="font-medium text-foreground">RR:</span> {candidate.resourceRequestNumber || '-'}</span>
                            <span><span className="font-medium text-foreground">Exp:</span> {candidate.yearsOfExperience ? `${candidate.yearsOfExperience} years` : '-'}</span>
                            <span><span className="font-medium text-foreground">Target:</span> {getTargetDesignation(candidate)}</span>
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
          onOpenChange={setIsAddOpen}
          onSaveSuccess={applyFilters}
          onSchedule={setIsInterviewSchedulePageOpen}
          mode="create"
        />

        <CandidateDialogPage
          open={isEditOpen}
          candidate={selectedCandidate}
          departments={departments}
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
