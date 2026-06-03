// src/pages/hr/HRDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,DialogBody
} from '@/components/ui/dialog';
import {
  Calendar, Users, ClipboardList, TrendingUp, Clock, CheckCircle2,
  AlertCircle, ArrowRight, Briefcase, UserCheck, Building2, RefreshCw,
  Trash2, X, User, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { candidateAPI } from '@/services/candidateAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { tierAPI } from '@/services/tierAPI';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import HRFilters from './HRFilters';
import { useCandidateSteps } from '@/hooks/useCandidateSteps';
import {
  getCandidateStep,
  getCandidateStatusBadgeClass,
  getCandidateStatusLabel,
} from '@/lib/candidateSteps';

// ─── helpers ─────────────────────────────────────────────────────────────────

const safeArray = (v) => (Array.isArray(v) ? v : []);

// Panels that are cancelled must be excluded — this was the root cause of
// the item persisting after cancel (backend cancelled it but frontend
// re-added it from the refresh because there was no status guard).
const ACTIVE_PANEL_STATUSES = new Set(['SCHEDULED', 'ACCEPTED', 'CONFIRMED', undefined, null]);

const buildScheduleItems = (requests, panels) => {
  const items = [];

  safeArray(panels)
  .filter((p) => {
    const s = (p.status ?? '').toUpperCase();
    if (s === 'CANCELLED' || s === 'COMPLETED' || s === 'REJECTED') return false;

    // ← ADD THIS: if every child request is cancelled, the panel is effectively cancelled
    const reqs = safeArray(p.panelRequests);
    if (reqs.length > 0 && reqs.every((r) => r.status === 'CANCELLED')) return false;

    return true;
  })
    .forEach((panel) => {
      items.push({
        id: `panel-${panel.id}`,
        type: 'panel',
        panelId: panel.id,
        candidateName: panel.candidateName,
        candidateId: panel.candidate?.id ?? null,
        startDateTime: panel.startDateTime,
        endDateTime: panel.endDateTime,
        status: 'ACCEPTED',
        isUrgent: panel.isUrgent,
        notes: panel.notes,
        interviewers: safeArray(panel.panelRequests).map((r) => ({
          name: r.assignedInterviewerName || r.assignedInterviewer?.fullName || '—',
          requestId: r.id,
        })),
        requestIds: safeArray(panel.panelRequests).map((r) => r.id),
        technologies: safeArray(panel.panelRequests?.[0]?.requiredTechnologies),
      });
    });

  safeArray(requests)
    .filter((r) => !r.panelId && r.status !== 'CANCELLED' && r.status !== 'REJECTED')
    .forEach((req) => {
      items.push({
        id: `req-${req.id}`,
        type: 'single',
        requestId: req.id,
        candidateName: req.candidateName,
        candidateId: req.candidate?.id ?? null,
        startDateTime: req.preferredStartDateTime,
        endDateTime: req.preferredEndDateTime,
        status: req.status,
        isUrgent: req.isUrgent,
        notes: req.notes,
        interviewers: [{ name: req.assignedInterviewerName || '—', requestId: req.id }],
        technologies: safeArray(req.requiredTechnologies),
      });
    });

  return items.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
};

// ─── Component ────────────────────────────────────────────────────────────────

const HRDashboard = () => {
  const navigate = useNavigate();
  const { formatDateTime, formatTime } = useFormattedDateTime();
  const { candidateSteps } = useCandidateSteps();

  const [candidates, setCandidates]           = useState([]);
  const [requests, setRequests]               = useState([]);
  const [panels, setPanels]                   = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [departments, setDepartments]         = useState([]);
  const [tiersForDept, setTiersForDept]       = useState([]);
  const [selectedDept, setSelectedDept]       = useState('');
  const [selectedTier, setSelectedTier]       = useState('');
  const [tierFilterMode, setTierFilterMode]   = useState('min');
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [lastRefreshed, setLastRefreshed]     = useState(null);

  const [cancelTarget, setCancelTarget]       = useState(null);
  const [cancelling, setCancelling]           = useState(false);
  const [expandedItems, setExpandedItems]     = useState(new Set());
  // Locally dismissed items — persisted so they survive refresh
  const [dismissed, setDismissed]             = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hr_dismissed_items') || '[]')); }
    catch { return new Set(); }
  });

  const dismissItem = (itemId) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      localStorage.setItem('hr_dismissed_items', JSON.stringify([...next]));
      return next;
    });
  };

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadTiersForDept = async (deptId) => {
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId));
      setTiersForDept(data.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { console.error(e); }
  };

  const loadDashboardData = useCallback(async (filters = null) => {
    setLoading(true);
    setError(null);
    try {
      // Pass filters to all server endpoints that support them. If the server doesn't filter,
      // the client will still receive full lists (we keep no heavy client-side filtering here).
      const results = await Promise.allSettled([
        candidateAPI.getAllCandidates({ departmentId: filters?.departmentIds?.length > 0 ? filters.departmentIds[0] : null }),
        hrAvailabilityAPI.getHRRequests(filters, { size: 100 }),
        hrAvailabilityAPI.getMyPanels(filters, { size: 100 }),
        hrAvailabilityAPI.getAllAvailability(filters),
      ]);
      const [cRes, rRes, pRes, sRes] = results;
      const srvCandidates = safeArray(cRes.status === 'fulfilled' ? cRes.value : []);
      const srvRequests   = safeArray(rRes.status === 'fulfilled' ? rRes.value : []);
      const srvPanels     = safeArray(pRes.status === 'fulfilled' ? pRes.value : []);
      const srvSlots      = safeArray(sRes.status === 'fulfilled' ? sRes.value : []);

      // Client-side fallback: if backend doesn't apply department/tier filters
      // ensure the dashboard still respects selectedDept/selectedTier.
      let finalCandidates = srvCandidates;
      let finalRequests = srvRequests;
      let finalPanels = srvPanels;

      try {
        const deptId = filters?.departmentIds?.length > 0 ? filters.departmentIds[0] : null;
        const minTierId = filters?.minTierId ?? null;
        const exactTierId = filters?.exactTierId ?? null;

        const candidateMap = new Map(srvCandidates.map((c) => [c.id, c]));

        if (deptId) {
          finalCandidates = finalCandidates.filter((c) => c.departmentId === deptId || (c.department?.id === deptId));
          finalRequests = finalRequests.filter((r) => {
            const cand = candidateMap.get(r.candidateId);
            return cand ? (cand.departmentId === deptId || cand.department?.id === deptId) : true;
          });
          finalPanels = finalPanels.filter((p) => {
            const candId = p.candidate?.id ?? p.candidateId ?? null;
            const cand = candId ? candidateMap.get(candId) : null;
            return cand ? (cand.departmentId === deptId || cand.department?.id === deptId) : true;
          });
        }

        // Tier filtering uses tierOrder for comparisons. Find tierOrder from tiersForDept
        let targetTierOrder = null;
        if (minTierId || exactTierId) {
          const tid = minTierId || exactTierId;
          const tierObj = tiersForDept.find((t) => t.id === tid) || null;
          targetTierOrder = tierObj ? tierObj.tierOrder : null;
        }

        if (targetTierOrder != null) {
          if (minTierId) {
            finalCandidates = finalCandidates.filter((c) => {
              const candTier = c.targetDesignationTierOrder ?? c.tierOrder ?? c.currentDesignation?.tier?.tierOrder;
              return candTier == null ? true : (candTier >= targetTierOrder);
            });
            finalRequests = finalRequests.filter((r) => {
              const cand = candidateMap.get(r.candidateId);
              const candTier = cand ? (cand.targetDesignationTierOrder ?? cand.tierOrder ?? cand.currentDesignation?.tier?.tierOrder) : null;
              return candTier == null ? true : (candTier >= targetTierOrder);
            });
            finalPanels = finalPanels.filter((p) => {
              const candId = p.candidate?.id ?? p.candidateId ?? null;
              const cand = candId ? candidateMap.get(candId) : null;
              const candTier = cand ? (cand.targetDesignationTierOrder ?? cand.tierOrder ?? cand.currentDesignation?.tier?.tierOrder) : null;
              return candTier == null ? true : (candTier >= targetTierOrder);
            });
          } else if (exactTierId) {
            finalCandidates = finalCandidates.filter((c) => {
              const candTier = c.targetDesignationTierOrder ?? c.tierOrder ?? c.currentDesignation?.tier?.tierOrder;
              return candTier == null ? true : (candTier === targetTierOrder);
            });
            finalRequests = finalRequests.filter((r) => {
              const cand = candidateMap.get(r.candidateId);
              const candTier = cand ? (cand.targetDesignationTierOrder ?? cand.tierOrder ?? cand.currentDesignation?.tier?.tierOrder) : null;
              return candTier == null ? true : (candTier === targetTierOrder);
            });
            finalPanels = finalPanels.filter((p) => {
              const candId = p.candidate?.id ?? p.candidateId ?? null;
              const cand = candId ? candidateMap.get(candId) : null;
              const candTier = cand ? (cand.targetDesignationTierOrder ?? cand.tierOrder ?? cand.currentDesignation?.tier?.tierOrder) : null;
              return candTier == null ? true : (candTier === targetTierOrder);
            });
          }
        }
      } catch (e) {
        console.error('Client-side filter fallback failed', e);
      }

      setCandidates(finalCandidates);
      setRequests(finalRequests);
      setPanels(finalPanels);
      setAvailabilitySlots(srvSlots);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);
  useEffect(() => {
    // load departments for filter UI
    (async () => {
      try {
        const depts = await departmentAPI.getAllDepartments();
        setDepartments(depts || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (selectedDept) loadTiersForDept(selectedDept);
    else setTiersForDept([]);
  }, [selectedDept]);

  // reload availability when filters change
  useEffect(() => {
    // If user selected a specific tier, treat it as an exact-tier filter
    // scoped to the selected department (user expectation: "Selected Department and Selected Tier only").
    const filters = {
      departmentIds: selectedDept ? [parseInt(selectedDept)] : null,
      minTierId: null,
      exactTierId: null,
    };

    if (selectedTier) {
      filters.exactTierId = parseInt(selectedTier);
    } else {
      // no specific tier chosen — honor tierFilterMode when applicable
      filters.minTierId = tierFilterMode === 'min' && selectedTier ? parseInt(selectedTier) : null;
      filters.exactTierId = tierFilterMode === 'exact' && selectedTier ? parseInt(selectedTier) : null;
    }

    loadDashboardData(filters);
  }, [selectedDept, selectedTier, tierFilterMode]);

  // ── Cancel ──────────────────────────────────────────────────────────────────

  const openCancelDialog  = (item) => setCancelTarget(item);
  const closeCancelDialog = () => { if (!cancelling) setCancelTarget(null); };

  const handleCancelConfirm = async () => {
    if (!cancelling && cancelTarget) {
      setCancelling(true);

      // ── OPTIMISTIC REMOVAL ──────────────────────────────────────────────────
      // Remove the item from local state immediately so the UI updates at once,
      // without waiting for the refetch. The refetch below keeps things in sync.
      if (cancelTarget.type === 'panel') {
        setPanels((prev) => prev.filter((p) => p.id !== cancelTarget.panelId));
      } else {
        setRequests((prev) => prev.filter((r) => r.id !== cancelTarget.requestId));
      }
      setCancelTarget(null); // close dialog right away

      try {
        if (cancelTarget.type === 'panel') {
          await hrAvailabilityAPI.cancelPanelInterview(cancelTarget.panelId);
          toast({
            title: 'Panel interview cancelled',
            description: `All ${cancelTarget.interviewers.length} interviewer slots restored.`,
          });
        } else {
          await hrAvailabilityAPI.cancelInterviewRequest(cancelTarget.requestId);
          toast({
            title: 'Interview cancelled',
            description: `${cancelTarget.interviewers[0]?.name}'s slot has been restored.`,
          });
        }
        // Sync with server (runs silently in background)
        loadDashboardData();
      } catch (err) {
        // Rollback optimistic update on failure
        toast({
          title: 'Failed to cancel',
          description: err.response?.data?.message || err.message || 'Unknown error',
          variant: 'destructive',
        });
        // Reload to get true server state back
        loadDashboardData();
      } finally {
        setCancelling(false);
      }
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const totalCandidates = candidates.length;
  const candidatesByStatus = candidates.reduce((acc, c) => {
    const s = c.status || 'UNKNOWN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const acceptedRequests   = requests.filter((r) => r.status === 'ACCEPTED');
  const todayInterviews    = acceptedRequests.filter((r) => { try { return isToday(parseISO(r.preferredStartDateTime)); } catch { return false; } });
  const tomorrowInterviews = acceptedRequests.filter((r) => { try { return isTomorrow(parseISO(r.preferredStartDateTime)); } catch { return false; } });
  const thisWeekInterviews = acceptedRequests.filter((r) => { try { return isThisWeek(parseISO(r.preferredStartDateTime), { weekStartsOn: 1 }); } catch { return false; } });
  const upcomingPanels     = panels.filter((p) => { try { return new Date(p.startDateTime) > new Date(); } catch { return false; } });
  const availableSlots     = availabilitySlots.length;

  const scheduleItems    = buildScheduleItems(requests, panels);
  const upcomingSchedule = scheduleItems.filter((item) => {
    if (dismissed.has(item.id)) return false;
    // Use endDateTime so past interviews don't show; fall back to start + 1h
    const end = item.endDateTime
      ? new Date(item.endDateTime)
      : new Date(new Date(item.startDateTime).getTime() + 60 * 60 * 1000);
    return end > new Date() && item.status === 'ACCEPTED';
  }).slice(0, 10);
  const recentRequests   = [...requests]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  // ── Display helpers ──────────────────────────────────────────────────────────

  const formatInterviewTime = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return `Today, ${formatTime(d)}`;
      if (isTomorrow(d)) return `Tomorrow, ${formatTime(d)}`;
      return formatDateTime(d);
    } catch { return dateStr || '—'; }
  };

  const getStatusBadge = (status) => {
    const map = {
      ACCEPTED:  'bg-green-100 text-green-800 border-green-200',
      PENDING:   'bg-yellow-100 text-yellow-800 border-yellow-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      REJECTED:  'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
      <Badge className={`${map[status] || map.REJECTED} border text-xs font-medium`}>
        {status}
      </Badge>
    );
  };

  const getCandidateStatusBadge = (status) => {
    return (
      <Badge className={`${getCandidateStatusBadgeClass(candidateSteps, status)} text-xs font-medium`}>
        {getCandidateStatusLabel(candidateSteps, status)}
      </Badge>
    );
  };

  const toggleExpanded = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Stats cards ──────────────────────────────────────────────────────────────

  const statsCards = [
    {
      title: 'Total Candidates',
      value: totalCandidates,
      subtext: `${candidatesByStatus.NEW || 0} ${getCandidateStatusLabel(candidateSteps, 'NEW').toLowerCase()} · ${candidatesByStatus.SCREENING || 0} ${getCandidateStatusLabel(candidateSteps, 'SCREENING').toLowerCase()}`,
      icon: Users, color: 'text-blue-600', bg: 'bg-blue-50',
      onClick: () => navigate('/hr/candidates'),
    },
    {
      title: 'Scheduled Interviews',
      value: candidatesByStatus.SCHEDULED || 0,
      subtext: `${todayInterviews.length} today · ${tomorrowInterviews.length} tomorrow`,
      icon: Calendar, color: 'text-green-600', bg: 'bg-green-50',
      onClick: () => navigate('/hr/availability'),
    },
    {
      title: 'This Week',
      value: thisWeekInterviews.length,
      subtext: `${acceptedRequests.length} total scheduled`,
      icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50',
      onClick: () => navigate('/hr/availability'),
    },
    {
      title: 'Available Slots',
      value: availableSlots,
      subtext: `${upcomingPanels.length} panel interview${upcomingPanels.length !== 1 ? 's' : ''} upcoming`,
      icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50',
      onClick: () => navigate('/hr/availability'),
    },
  ];

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  // ── Loading ──────────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">HR Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Manage candidates, schedule interviews, and track your pipeline
            </p>
            <HRFilters
              departments={departments}
              tiersForDept={tiersForDept}
              selectedDept={selectedDept}
              setSelectedDept={setSelectedDept}
              selectedTier={selectedTier}
              setSelectedTier={setSelectedTier}
            />
            {lastRefreshed && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {formatTime(lastRefreshed)}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboardData} className="gap-2 mt-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div variants={itemVariants}>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-800 font-medium text-sm">{error}</p>
                <Button variant="link" className="text-red-700 p-0 h-auto text-sm" onClick={loadDashboardData}>Try again</Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border" onClick={card.onClick}>
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

        {/* Quick Actions */}
        {/* <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'View Availability', icon: Calendar,      path: '/hr/availability' },
                  { label: 'Manage Candidates', icon: Users,          path: '/hr/candidates' },
                  { label: 'Schedule Interview', icon: UserCheck,     path: '/hr/availability' },
                  { label: 'Add Candidate',      icon: ClipboardList, path: '/hr/candidates/add' },
                ].map(({ label, icon: Icon, path }) => (
                  <Button key={label} variant="outline" className="h-auto py-3 flex flex-col gap-1.5 items-center" onClick={() => navigate(path)}>
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium">{label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div> */}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Schedule */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Schedule
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/hr/availability')} className="text-xs gap-1">
                    View calendar <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                <CardDescription>
                  {upcomingSchedule.length} upcoming · click <Trash2 className="w-3 h-3 inline text-red-400" /> to cancel &amp; restore slot
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSchedule.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No upcoming interviews scheduled</p>
                    <Button variant="link" size="sm" className="mt-2 text-primary" onClick={() => navigate('/hr/availability')}>
                      Schedule one →
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    <AnimatePresence initial={false}>
                      {upcomingSchedule.map((item) => {
                        const isPanel    = item.type === 'panel';
                        const isExpanded = expandedItems.has(item.id);
                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`rounded-xl border-2 overflow-hidden ${
                              isPanel
                                ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                                : 'border-border bg-accent/20 hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-start gap-3 p-3">
                              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isPanel ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                                {isPanel
                                  ? <Users className="w-4 h-4 text-emerald-600" />
                                  : <User  className="w-4 h-4 text-primary" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{item.candidateName}</p>
                                    <p className="text-xs text-primary font-medium mt-0.5">
                                      {formatInterviewTime(item.startDateTime)}
                                      {item.endDateTime && ` - ${formatTime(parseISO(item.endDateTime))}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isPanel && (
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">
                                        Panel · {item.interviewers.length}
                                      </Badge>
                                    )}
                                    {item.isUrgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                                  </div>
                                </div>

                                <div className="mt-1.5">
                                  {isPanel ? (
                                    <button
                                      onClick={() => toggleExpanded(item.id)}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      {item.interviewers.map((i) => i.name).join(', ')}
                                    </button>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">with {item.interviewers[0]?.name}</p>
                                  )}
                                </div>

                                <AnimatePresence>
                                  {isPanel && isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.interviewers.map((iv, idx) => (
                                          <span key={idx} className="text-xs bg-white border border-emerald-200 rounded-md px-2 py-0.5 text-emerald-800">
                                            {iv.name}
                                          </span>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {item.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.technologies.slice(0, 3).map((t, i) => (
                                      <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{t.name || t}</Badge>
                                    ))}
                                    {item.technologies.length > 3 && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0">+{item.technologies.length - 3}</Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-0.5 ml-1 shrink-0">
                                <button
                                  onClick={() => openCancelDialog(item)}
                                  title="Cancel & restore slot"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {/* <button
                                  onClick={() => dismissItem(item.id)}
                                  title="Hide from this list"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-gray-600 hover:bg-gray-100 transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button> */}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
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
                    <Users className="w-5 h-5 text-primary" /> Recent Candidates
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/hr/candidates')} className="text-xs gap-1">
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
                    <Button variant="link" size="sm" className="mt-2 text-primary" onClick={() => navigate('/hr/candidates/add')}>
                      Add first candidate →
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...candidates]
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .slice(0, 6)
                      .map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors ">
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

          {/* Pipeline */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Candidate Info
                </CardTitle>
                <CardDescription>Candidates by stage</CardDescription>
              </CardHeader>
              <CardContent>
                {totalCandidates === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No candidate data</p>
                ) : (
                  <div className="space-y-3">
                    {candidateSteps
                      .filter((s) => (candidatesByStatus[s.key] || 0) > 0)
                      .map((stage) => {
                        const count = candidatesByStatus[stage.key] || 0;
                        const pct   = Math.round((count / totalCandidates) * 100);
                        const configuredStage = getCandidateStep(candidateSteps, stage.key);
                        return (
                          <div key={stage.key} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{stage.label}</span>
                              <span className="font-semibold">
                                {count} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: configuredStage?.bgColor || '#6b7280' }}
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

          {/* Recent Requests */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" /> Recent Requests
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/hr/availability')} className="text-xs gap-1">
                    View calendar <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                <CardDescription>{requests.length} total created by you</CardDescription>
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
                          {['Candidate', 'Interviewer', 'Time', 'Status', 'Type'].map((h) => (
                            <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentRequests.map((req) => (
                          <tr key={req.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors ">
                            <td className="py-2.5 px-3 font-medium">{req.candidateName}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{req.assignedInterviewerName || '—'}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {req.preferredStartDateTime ? formatInterviewTime(req.preferredStartDateTime) : '—'}
                            </td>
                            <td className="py-2.5 px-3">{getStatusBadge(req.status)}</td>
                            <td className="py-2.5 px-3">
                              {req.panelId
                                ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border text-xs">Panel</Badge>
                                : <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">Single</Badge>}
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
        </div>
      </motion.div>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={closeCancelDialog}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Cancel Interview
            </DialogTitle>
            <DialogDescription>
              This will cancel the interview and immediately restore the slot(s) to available.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
          {cancelTarget && (
            <div className={`rounded-xl border-2 p-4 ${
              cancelTarget.type === 'panel' ? 'border-emerald-200 bg-emerald-50' : 'border-red-100 bg-red-50'
            }`}>
              <p className="font-semibold text-sm mb-1">
                {cancelTarget.type === 'panel' ? '👥 Panel Interview' : '👤 Single Interview'}
              </p>
              <p className="text-sm font-medium">{cancelTarget.candidateName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatInterviewTime(cancelTarget.startDateTime)}
                {cancelTarget.endDateTime && ` - ${formatTime(parseISO(cancelTarget.endDateTime))}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {cancelTarget.type === 'panel'
                  ? `${cancelTarget.interviewers.length} interviewers: ${cancelTarget.interviewers.map((i) => i.name).join(', ')}`
                  : `with ${cancelTarget.interviewers[0]?.name}`}
              </p>
              {cancelTarget.type === 'panel' && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    All {cancelTarget.interviewers.length} interviewer slots will be restored to available.
                  </p>
                </div>
              )}
            </div>
          )}
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeCancelDialog} disabled={cancelling}>
              Keep Interview
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={cancelling} className="gap-2">
              {cancelling
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cancelling…</>
                : <><Trash2 className="w-4 h-4" /> Cancel & Restore Slot</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default HRDashboard;
