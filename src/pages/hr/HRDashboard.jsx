// src/pages/hr/HRDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Briefcase,
  UserCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { candidateAPI } from '@/services/candidateAPI';

// ─────────────────────────────────────────────────────────────
// Safe array helper — prevents "x.filter is not a function"
// even if the API returns null, an error object, or undefined
// ─────────────────────────────────────────────────────────────
const safeArray = (value) => (Array.isArray(value) ? value : []);

const HRDashboard = () => {
  const navigate = useNavigate();

  // ── Data ────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [panels, setPanels] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  // ── UI State ────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Load Data ────────────────────────────────────────────────
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        candidateAPI.getAllCandidates(),
        hrAvailabilityAPI.getHRRequests(),
        hrAvailabilityAPI.getMyPanels(),
        hrAvailabilityAPI.getAllAvailability(),
      ]);

      // Use settled results so one failure doesn't kill the whole dashboard
      const [candidatesResult, requestsResult, panelsResult, slotsResult] = results;

      setCandidates(safeArray(candidatesResult.status === 'fulfilled' ? candidatesResult.value : []));
      setRequests(safeArray(requestsResult.status === 'fulfilled' ? requestsResult.value : []));
      setPanels(safeArray(panelsResult.status === 'fulfilled' ? panelsResult.value : []));
      setAvailabilitySlots(safeArray(slotsResult.status === 'fulfilled' ? slotsResult.value : []));

      // Report any individual failures as warnings (not full errors)
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('Some dashboard data failed to load:', failures.map(f => f.reason));
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ── Derived Stats ────────────────────────────────────────────

  // Candidates
  const totalCandidates = candidates.length;
  const candidatesByStatus = candidates.reduce((acc, c) => {
    const s = c.status || 'UNKNOWN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const scheduledCandidates = candidatesByStatus['SCHEDULED'] || 0;
  const appliedCandidates = candidatesByStatus['APPLIED'] || 0;
  const screeningCandidates = candidatesByStatus['SCREENING'] || 0;

  // Interviews (requests)
  const acceptedRequests = requests.filter(r => r.status === 'ACCEPTED');
  const totalInterviews = acceptedRequests.length;

  const todayInterviews = acceptedRequests.filter(r => {
    try { return isToday(parseISO(r.preferredStartDateTime)); } catch { return false; }
  });

  const tomorrowInterviews = acceptedRequests.filter(r => {
    try { return isTomorrow(parseISO(r.preferredStartDateTime)); } catch { return false; }
  });

  const thisWeekInterviews = acceptedRequests.filter(r => {
    try { return isThisWeek(parseISO(r.preferredStartDateTime), { weekStartsOn: 1 }); } catch { return false; }
  });

  // Panels
  const totalPanels = panels.length;
  const upcomingPanels = panels.filter(p => {
    try { return new Date(p.startDateTime) > new Date(); } catch { return false; }
  });

  // Availability
  const availableSlots = availabilitySlots.length;

  // Recent requests (last 5, sorted by created date)
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  // Upcoming interviews (next 5, sorted by start time)
  const upcomingInterviews = acceptedRequests
    .filter(r => {
      try { return new Date(r.preferredStartDateTime) > new Date(); } catch { return false; }
    })
    .sort((a, b) => new Date(a.preferredStartDateTime) - new Date(b.preferredStartDateTime))
    .slice(0, 5);

  // ── Helpers ──────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const variants = {
      ACCEPTED:  { label: 'Accepted',  class: 'bg-green-100 text-green-800 border-green-200' },
      PENDING:   { label: 'Pending',   class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      CANCELLED: { label: 'Cancelled', class: 'bg-red-100 text-red-800 border-red-200' },
      REJECTED:  { label: 'Rejected',  class: 'bg-gray-100 text-gray-700 border-gray-200' },
    };
    const v = variants[status] || { label: status, class: 'bg-gray-100 text-gray-700 border-gray-200' };
    return <Badge className={`${v.class} border text-xs font-medium`}>{v.label}</Badge>;
  };

  const getCandidateStatusBadge = (status) => {
    const variants = {
      APPLIED:     { label: 'Applied',     class: 'bg-blue-100 text-blue-800' },
      SCREENING:   { label: 'Screening',   class: 'bg-purple-100 text-purple-800' },
      SCHEDULED:   { label: 'Scheduled',   class: 'bg-green-100 text-green-800' },
      INTERVIEWED: { label: 'Interviewed', class: 'bg-teal-100 text-teal-800' },
      OFFERED:     { label: 'Offered',     class: 'bg-amber-100 text-amber-800' },
      HIRED:       { label: 'Hired',       class: 'bg-emerald-100 text-emerald-800' },
      REJECTED:    { label: 'Rejected',    class: 'bg-red-100 text-red-800' },
    };
    const v = variants[status] || { label: status, class: 'bg-gray-100 text-gray-700' };
    return <Badge className={`${v.class} text-xs font-medium`}>{v.label}</Badge>;
  };

  const formatInterviewTime = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
      if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
      return format(d, 'MMM d, h:mm a');
    } catch {
      return dateStr || '—';
    }
  };

  // ── Animation Variants ────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // ── Stats Cards Config ────────────────────────────────────────
  const statsCards = [
    {
      title: 'Total Candidates',
      value: totalCandidates,
      subtext: `${appliedCandidates} applied · ${screeningCandidates} screening`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      onClick: () => navigate('/hr/candidates'),
    },
    {
      title: 'Scheduled Interviews',
      value: scheduledCandidates,
      subtext: `${todayInterviews.length} today · ${tomorrowInterviews.length} tomorrow`,
      icon: Calendar,
      color: 'text-green-600',
      bg: 'bg-green-50',
      onClick: () => navigate('/hr/availability'),
    },
    {
      title: 'This Week',
      value: thisWeekInterviews.length,
      subtext: `${totalInterviews} total scheduled`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      onClick: () => navigate('/hr/availability'),
    },
    {
      title: 'Available Slots',
      value: availableSlots,
      subtext: `${totalPanels} panel interview${totalPanels !== 1 ? 's' : ''} created`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      onClick: () => navigate('/hr/availability'),
    },
  ];

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">Loading dashboard…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ── */}
        <motion.div variants={itemVariants} className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">HR Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Manage candidates, schedule interviews, and track your pipeline
            </p>
            {lastRefreshed && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {format(lastRefreshed, 'h:mm:ss a')}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboardData} className="gap-2 mt-1">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </motion.div>

        {/* ── Error Banner ── */}
        {error && (
          <motion.div variants={itemVariants}>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-800 font-medium text-sm">{error}</p>
                <Button variant="link" className="text-red-700 p-0 h-auto text-sm" onClick={loadDashboardData}>
                  Try again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Stats Cards ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border"
                onClick={card.onClick}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${card.bg}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 mt-1" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.subtext}</p>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1.5 items-center"
                  onClick={() => navigate('/hr/availability')}
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium">View Availability</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1.5 items-center"
                  onClick={() => navigate('/hr/candidates')}
                >
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium">Manage Candidates</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1.5 items-center"
                  onClick={() => navigate('/hr/availability')}
                >
                  <UserCheck className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium">Schedule Interview</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1.5 items-center"
                  onClick={() => navigate('/hr/candidates/add')}
                >
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium">Add Candidate</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Interviews */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Interviews
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/hr/availability')}
                    className="text-xs gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                <CardDescription>
                  {upcomingInterviews.length} upcoming interview{upcomingInterviews.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingInterviews.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No upcoming interviews scheduled</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 text-primary"
                      onClick={() => navigate('/hr/availability')}
                    >
                      Schedule one →
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingInterviews.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{req.candidateName}</p>
                          <p className="text-xs text-muted-foreground">
                            with {req.assignedInterviewerName || 'Unassigned'}
                          </p>
                          <p className="text-xs text-primary font-medium mt-0.5">
                            {formatInterviewTime(req.preferredStartDateTime)}
                            {req.preferredEndDateTime && ` – ${format(parseISO(req.preferredEndDateTime), 'h:mm a')}`}
                          </p>
                          {req.panelId && (
                            <Badge className="mt-1 text-xs bg-emerald-100 text-emerald-800">
                              Panel Interview
                            </Badge>
                          )}
                        </div>
                        {getStatusBadge(req.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Candidates */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Recent Candidates
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/hr/candidates')}
                    className="text-xs gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                <CardDescription>{totalCandidates} total candidates in pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                {candidates.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No candidates in the system yet</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 text-primary"
                      onClick={() => navigate('/hr/candidates/add')}
                    >
                      Add first candidate →
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...candidates]
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .slice(0, 5)
                      .map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/hr/candidates/${candidate.id}`)}
                        >
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {(candidate.name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {candidate.targetDesignationName || candidate.departmentName || 'No designation'}
                            </p>
                          </div>
                          {getCandidateStatusBadge(candidate.status)}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Candidate Pipeline Overview */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Pipeline Overview
                </CardTitle>
                <CardDescription>Candidates by stage</CardDescription>
              </CardHeader>
              <CardContent>
                {totalCandidates === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No candidate data</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: 'Applied', key: 'APPLIED', color: 'bg-blue-500' },
                      { label: 'Screening', key: 'SCREENING', color: 'bg-purple-500' },
                      { label: 'Scheduled', key: 'SCHEDULED', color: 'bg-green-500' },
                      { label: 'Interviewed', key: 'INTERVIEWED', color: 'bg-teal-500' },
                      { label: 'Offered', key: 'OFFERED', color: 'bg-amber-500' },
                      { label: 'Hired', key: 'HIRED', color: 'bg-emerald-600' },
                      { label: 'Rejected', key: 'REJECTED', color: 'bg-red-400' },
                    ]
                      .filter(stage => (candidatesByStatus[stage.key] || 0) > 0)
                      .map(stage => {
                        const count = candidatesByStatus[stage.key] || 0;
                        const pct = Math.round((count / totalCandidates) * 100);
                        return (
                          <div key={stage.key} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{stage.label}</span>
                              <span className="font-semibold">{count} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${stage.color} transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Panel Interviews Summary */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Panel Interviews
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/hr/availability')}
                    className="text-xs gap-1"
                  >
                    Schedule <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                <CardDescription>
                  {upcomingPanels.length} upcoming · {totalPanels} total created
                </CardDescription>
              </CardHeader>
              <CardContent>
                {panels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm mb-2">No panel interviews scheduled yet</p>
                    <p className="text-xs text-muted-foreground/70 max-w-48 mx-auto">
                      Enable Panel Mode in the Availability Calendar to schedule multi-interviewer sessions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {panels
                      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
                      .slice(0, 4)
                      .map(panel => (
                        <div key={panel.id} className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-200">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{panel.candidateName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatInterviewTime(panel.startDateTime)}
                              </p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 shrink-0 text-xs">
                              {(panel.panelRequests || []).length} interviewer{(panel.panelRequests || []).length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {(panel.panelRequests || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {panel.panelRequests.map(req => (
                                <span
                                  key={req.id}
                                  className="text-xs bg-white border border-emerald-200 rounded px-1.5 py-0.5 text-emerald-800"
                                >
                                  {req.assignedInterviewerName || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    {panels.length > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => navigate('/hr/availability')}
                      >
                        +{panels.length - 4} more panels
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* ── Recent Requests (full width) ── */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Recent Interview Requests
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/hr/availability')}
                  className="text-xs gap-1"
                >
                  View calendar <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <CardDescription>{requests.length} total requests created by you</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No interview requests created yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Candidate</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Interviewer</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Time</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map(req => (
                        <tr key={req.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium">{req.candidateName}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{req.assignedInterviewerName || '—'}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {req.preferredStartDateTime
                              ? formatInterviewTime(req.preferredStartDateTime)
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3">{getStatusBadge(req.status)}</td>
                          <td className="py-2.5 px-3">
                            {req.panelId
                              ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border text-xs">Panel</Badge>
                              : <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">Single</Badge>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </Layout>
  );
};

export default HRDashboard;