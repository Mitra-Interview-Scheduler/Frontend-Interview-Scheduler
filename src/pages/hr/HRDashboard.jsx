import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingState } from '@/components/ui/loading';
import { StatCardsSkeleton } from '@/components/ui/page-skeletons';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  ClipboardList,
  ExternalLink,
  FileWarning,
  Gift,
  MessageSquareWarning,
  RefreshCw,
  Timer,
  Users,
  Video,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { isToday, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { useAuth } from '@/context/AuthContext';
import { dashboardAPI } from '@/services/dashboardAPI';
import { getNormalizedRoles, hasRole } from '@/lib/roleHelpers';
import {
  ActionQueueCard,
  DashboardSection,
  EmptyWidget,
  PaginatedWidgetList,
  StatPill,
  UpcomingRangeToggle,
  asCountedList,
} from '@/pages/shared/dashboard';
import AssessmentsWaitingBoard from '@/pages/hr/AssessmentsWaitingBoard';

const safeArray = (v) => (Array.isArray(v) ? v : []);
const bucket = (v) => ({ count: v?.count ?? 0, items: safeArray(v?.items) });

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488', '#64748b'];

const formatAge = (hours) => {
  if (hours == null || Number.isNaN(Number(hours))) return '—';
  const h = Number(hours);
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
};

const HRDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatDateTime, formatTime, formatDate } = useFormattedDateTime();
  const reduceMotion = useReducedMotion();

  const canViewAll = hasRole(getNormalizedRoles(user), 'ADMIN');
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [stalledDays, setStalledDays] = useState('7');
  const [upcomingDays, setUpcomingDays] = useState(7);
  const [upcomingRefreshing, setUpcomingRefreshing] = useState(false);
  const [pingingId, setPingingId] = useState(null);
  const upcomingDaysRef = useRef(upcomingDays);
  upcomingDaysRef.current = upcomingDays;

  const effectiveMineOnly = canViewAll ? mineOnly : true;

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await dashboardAPI.getHrDashboard({
          mineOnly: effectiveMineOnly,
          stalledDays: Number(stalledDays),
          feedbackOverdueHours: 24,
          capacityDays: 14,
          trendDays: 30,
          previewSize: 5,
          upcomingDays: upcomingDaysRef.current,
        });
        setData(res);
      } catch (err) {
        console.error(err);
        const message =
          err.response?.data?.message || err.message || 'Failed to load dashboard data.';
        setError(message);
        toast({
          title: 'Dashboard error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveMineOnly, stalledDays]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const hrItemParams = useMemo(
    () => ({
      mineOnly: effectiveMineOnly,
      stalledDays: Number(stalledDays),
      feedbackOverdueHours: 24,
      upcomingDays,
    }),
    [effectiveMineOnly, stalledDays, upcomingDays]
  );

  const loadHrSection = useCallback(
    (section) => (page, size) =>
      dashboardAPI.getHrDashboardItems(section, { ...hrItemParams, page, size }),
    [hrItemParams]
  );

  const handleUpcomingDaysChange = async (days) => {
    if (days === upcomingDays) return;
    setUpcomingDays(days);
    setUpcomingRefreshing(true);
    try {
      const res = await dashboardAPI.getHrDashboardItems('upcomingInterviews', {
        mineOnly: effectiveMineOnly,
        stalledDays: Number(stalledDays),
        feedbackOverdueHours: 24,
        upcomingDays: days,
        page: 0,
        size: 5,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              liveStatus: {
                ...prev.liveStatus,
                upcomingInterviews: asCountedList(res),
              },
            }
          : prev
      );
    } catch (err) {
      toast({
        title: 'Could not load upcoming interviews',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setUpcomingRefreshing(false);
    }
  };

  const handlePing = async (scheduleId) => {
    setPingingId(scheduleId);
    try {
      const res = await dashboardAPI.nudgeFeedback(scheduleId);
      toast({
        title: 'Ping sent',
        description: res?.message || 'Interviewer notified to submit feedback.',
      });
      await loadDashboard({ silent: true });
    } catch (err) {
      toast({
        title: 'Ping failed',
        description: err.response?.data?.message || err.message || 'Could not send ping.',
        variant: 'destructive',
      });
    } finally {
      setPingingId(null);
    }
  };

  const actionQueue = data?.actionQueue || {};
  const liveStatus = data?.liveStatus || {};

  const postpone = bucket(actionQueue.postponeRequests);
  const feedbackOverdue = bucket(actionQueue.feedbackOverdue);
  const stalled = bucket(actionQueue.candidatesStalled);
  const offersPending = bucket(actionQueue.offersPending);
  const screening = bucket(actionQueue.screeningBacklog);
  const assessments = actionQueue.assessmentsWaiting || {};
  const awaitingReceived = bucket(assessments.awaitingReceived);
  const awaitingReviewer = bucket(assessments.awaitingReviewer);
  const reviewIncomplete = bucket(assessments.reviewIncomplete);
  const assessmentTotal =
    awaitingReceived.count + awaitingReviewer.count + reviewIncomplete.count;

  const upcoming = bucket(liveStatus.upcomingInterviews);
  const funnel = safeArray(liveStatus.pipelineFunnel).sort(
    (a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0)
  );
  const capacity = safeArray(liveStatus.interviewerCapacity);

  const capacityByDay = useMemo(() => {
    const map = new Map();
    capacity.forEach((row) => {
      const key = row.date || '—';
      const existing = map.get(key) || { date: key, availableSlots: 0, bookedSlots: 0 };
      existing.availableSlots += row.availableSlots ?? 0;
      existing.bookedSlots += row.bookedSlots ?? 0;
      map.set(key, existing);
    });
    return [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [capacity]);

  const capacityDepts = useMemo(() => {
    const names = new Set();
    capacity.forEach((row) => {
      if (row.departmentName) names.add(row.departmentName);
    });
    return [...names].sort();
  }, [capacity]);

  const containerVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
      };
  const itemVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

  const formatInterviewWhen = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return `Today, ${formatTime(d)}`;
      return formatDateTime(d);
    } catch {
      return dateStr || '—';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Pipeline Cockpit</h1>
            <p className="text-muted-foreground text-lg">
              Action queue, live pipeline status, and hiring health
            </p>
          </div>
          <StatCardsSkeleton count={4} />
          <LoadingState label="Loading pipeline cockpit…" minHeight="sm" />
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
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-4xl font-bold text-foreground mb-2">Pipeline Cockpit</h1>
            <p className="text-muted-foreground text-lg">
              Prioritize blockers, watch live interviews, and track pipeline health
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <StatPill label="Upcoming" value={upcoming.count} tone="primary" />
              <StatPill
                label="Action items"
                value={
                  postpone.count +
                  feedbackOverdue.count +
                  stalled.count +
                  assessmentTotal +
                  offersPending.count +
                  screening.count
                }
                tone="warning"
              />
              {data?.generatedAt ? (
                <span className="text-xs text-muted-foreground">
                  Updated {formatDateTime(data.generatedAt)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canViewAll ? (
              <RadioGroup
                value={mineOnly ? 'mine' : 'all'}
                onValueChange={(value) => setMineOnly(value === 'mine')}
                className="flex flex-row items-center gap-4 rounded-lg border bg-card px-3 py-2"
                aria-label="Dashboard scope"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="text-sm font-medium cursor-pointer">
                    All
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mine" id="scope-mine" />
                  <Label htmlFor="scope-mine" className="text-sm font-medium cursor-pointer">
                    Mine
                  </Label>
                </div>
              </RadioGroup>
            ) : null}

            <Select value={stalledDays} onValueChange={setStalledDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Stalled days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Stalled 3d</SelectItem>
                <SelectItem value="7">Stalled 7d</SelectItem>
                <SelectItem value="14">Stalled 14d</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => loadDashboard({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {error ? (
          <motion.div variants={itemVariants}>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button
                  variant="link"
                  className="text-destructive p-0 h-auto text-sm"
                  onClick={() => loadDashboard()}
                >
                  Try again
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Action Queue */}
        <motion.div variants={itemVariants}>
          <DashboardSection
            noCard
            title="Action Queue"
            description="What needs attention today"
            hint="Work that is blocked or overdue — clear these first so candidates keep moving."
            icon={ClipboardList}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <ActionQueueCard
                title="Postpone requests"
                hint="Interviewers asked to move a slot. Approve or decline so the schedule stays accurate."
                count={postpone.count}
                severity="warning"
                icon={Timer}
                defaultOpen={postpone.count > 0}
                items={postpone.items}
                onLoadPage={loadHrSection('postponeRequests')}
                emptyMessage="No postpone requests"
                emptyDescription="Pending time-change requests will appear here."
                getItemKey={(item) => item.id}
                renderItem={(item) => (
                  <div className="rounded-lg border bg-card p-2.5 text-sm space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium truncate">{item.candidateName}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {formatAge(item.ageHours)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.interviewerName || '—'} · proposed{' '}
                      {item.proposedStart ? formatDateTime(item.proposedStart) : '—'}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => navigate('/hr/availability')}
                    >
                      Review on availability <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              />

              <ActionQueueCard
                title="Feedback overdue"
                hint="Interviews finished but feedback is still missing. Ping so hiring decisions are not delayed."
                count={feedbackOverdue.count}
                severity="critical"
                icon={MessageSquareWarning}
                defaultOpen={feedbackOverdue.count > 0}
                items={feedbackOverdue.items}
                onLoadPage={loadHrSection('feedbackOverdue')}
                emptyMessage="No overdue feedback"
                emptyDescription="Completed interviews waiting on feedback will appear here."
                getItemKey={(item) => `${item.scheduleId}-${item.interviewerId}`}
                renderItem={(item) => (
                  <div className="rounded-lg border bg-card p-2.5 text-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.candidateName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.interviewerName} · {formatAge(item.hoursOverdue)} overdue
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={pingingId === item.scheduleId}
                        onClick={() => handlePing(item.scheduleId)}
                      >
                        {pingingId === item.scheduleId ? 'Sending…' : 'Ping'}
                      </Button>
                    </div>
                    {(item.nudgeCount > 0 || item.lastNudgedAt) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200"
                        >
                          Pinged {item.nudgeCount ?? 0}×
                        </Badge>
                        {item.lastNudgedAt ? (
                          <span className="text-[10px] text-muted-foreground truncate">
                            Last: {formatDateTime(item.lastNudgedAt)}
                            {item.lastNudgedByName ? ` by ${item.lastNudgedByName}` : ''}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              />

              <ActionQueueCard
                title="Candidates stalled"
                hint="No pipeline progress for the selected number of days. Follow up before candidates go cold."
                count={stalled.count}
                severity="warning"
                icon={Users}
                defaultOpen={false}
                items={stalled.items}
                onLoadPage={loadHrSection('candidatesStalled')}
                emptyMessage="No stalled candidates"
                emptyDescription="Candidates with no status change for too long will appear here."
                getItemKey={(item) => item.candidateId}
                renderItem={(item) => (
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border bg-card p-2.5 text-sm hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/hr/candidates/${item.candidateId}/details`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium truncate">{item.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.daysStalled}d
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.statusLabel || item.statusKey} · {item.departmentName || '—'}
                    </p>
                  </button>
                )}
              />

              <ActionQueueCard
                title="Offers pending"
                hint="Candidates waiting on an offer decision. Track aging so offers do not sit unanswered."
                count={offersPending.count}
                severity={offersPending.count > 0 ? 'info' : 'default'}
                icon={Gift}
                items={offersPending.items}
                onLoadPage={loadHrSection('offersPending')}
                emptyMessage="No offers pending"
                emptyDescription="Candidates in Make Offer / offer-pending will appear here."
                getItemKey={(item) => item.candidateId}
                renderItem={(item) => (
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border bg-card p-2.5 text-sm hover:bg-accent/50"
                    onClick={() => navigate(`/hr/candidates/${item.candidateId}/details`)}
                  >
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.daysInOffer ?? 0}d in offer · {item.coordinatedHrName || 'Unassigned'}
                    </p>
                  </button>
                )}
              />

              <ActionQueueCard
                title={effectiveMineOnly ? 'Screening backlog (mine)' : 'Screening backlog'}
                hint="New candidates still waiting to be screened into the pipeline."
                count={screening.count}
                severity={screening.count > 0 ? 'info' : 'default'}
                icon={ClipboardList}
                items={screening.items}
                onLoadPage={loadHrSection('screeningBacklog')}
                emptyMessage="No screening backlog"
                emptyDescription="New candidates waiting to be screened will appear here."
                getItemKey={(item) => item.candidateId}
                renderItem={(item) => (
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border bg-card p-2.5 text-sm hover:bg-accent/50"
                    onClick={() => navigate(`/hr/candidates/${item.candidateId}/details`)}
                  >
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Waiting {item.daysWaiting ?? 0}d · {item.statusKey || '—'}
                    </p>
                  </button>
                )}
              />
            </div>
          </DashboardSection>
        </motion.div>

        {/* Assessments waiting — stage board */}
        <motion.div variants={itemVariants}>
          <DashboardSection
            title="Assessments waiting"
            description="Pipeline from sent → received → review"
            hint="Take-home assessments stuck between sent, received, and review. Advance each stage so reviews stay timely."
            icon={FileWarning}
            actions={
              assessmentTotal > 0 ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 border tabular-nums">
                  {assessmentTotal} open
                </Badge>
              ) : null
            }
          >
            <AssessmentsWaitingBoard
              awaitingReceived={awaitingReceived}
              awaitingReviewer={awaitingReviewer}
              reviewIncomplete={reviewIncomplete}
              total={assessmentTotal}
              formatDateTime={formatDateTime}
              onOpenCandidate={(candidateId) =>
                navigate(`/hr/candidates/${candidateId}/details`)
              }
              onLoadPage={(section, page, size) =>
                dashboardAPI.getHrDashboardItems(section, { ...hrItemParams, page, size })
              }
            />
          </DashboardSection>
        </motion.div>

        {/* Live Status */}
        <motion.div variants={itemVariants}>
          <DashboardSection
            noCard
            title="Live Status"
            description="Interviews, funnel, and capacity"
            hint="Snapshot of what is happening now — schedule load, pipeline shape, and interviewer coverage."
            icon={Calendar}
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <DashboardSection
                title="Upcoming interviews"
                hint="Next interviews on the calendar so you can prepare and catch conflicts early. The range is calendar days and includes weekends."
                description={`${upcoming.count} scheduled in the next ${upcomingDays} days, including weekends`}
                icon={Video}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <UpcomingRangeToggle
                      value={upcomingDays}
                      onChange={handleUpcomingDaysChange}
                      disabled={upcomingRefreshing}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => navigate('/hr/availability')}
                    >
                      Calendar <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                }
              >
                {upcomingRefreshing ? (
                  <LoadingState label="Loading upcoming interviews…" size="sm" minHeight="sm" />
                ) : (
                <PaginatedWidgetList
                  items={upcoming.items}
                  count={upcoming.count}
                  pageSize={5}
                  onLoadPage={loadHrSection('upcomingInterviews')}
                  emptyTitle="No upcoming interviews"
                  emptyDescription={`Scheduled interviews for the next ${upcomingDays} days appear here`}
                  getItemKey={(item) => `${item.scheduleId || item.requestId}-${item.start}`}
                  renderItem={(item) => (
                    <div
                      className={`rounded-xl border p-3 ${
                        item.isPanel
                          ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-border bg-accent/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{item.candidateName}</p>
                          <p className="text-xs text-primary font-medium mt-0.5">
                            {formatInterviewWhen(item.start)}
                            {item.end ? ` – ${formatTime(parseISO(item.end))}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {(safeArray(item.interviewerNames).join(', ') || '—') +
                              (item.interviewType ? ` · ${item.interviewType}` : '')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {item.isPanel ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">
                              Panel
                            </Badge>
                          ) : null}
                          {item.meetingLink ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-xs"
                              asChild
                            >
                              <a href={item.meetingLink} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-3 h-3" /> Join
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                />
                )}
              </DashboardSection>

              <DashboardSection
                title="Pipeline funnel"
                hint="How many candidates sit in each stage. Click a stage to open that filtered list."
                description="Click a stage to filter candidates"
                icon={Users}
              >
                {funnel.length === 0 ? (
                  <EmptyWidget title="No pipeline data" />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={funnel}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={110}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          radius={[0, 4, 4, 0]}
                          cursor="pointer"
                          onClick={(entry) => {
                            const status = entry?.statusKey || entry?.payload?.statusKey;
                            if (status) navigate(`/hr/candidates?status=${encodeURIComponent(status)}`);
                          }}
                        >
                          {funnel.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {funnel.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {funnel.map((stage) => (
                      <Button
                        key={stage.statusKey}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          navigate(`/hr/candidates?status=${encodeURIComponent(stage.statusKey)}`)
                        }
                      >
                        {stage.label} ({stage.count})
                      </Button>
                    ))}
                  </div>
                ) : null}
              </DashboardSection>

              <DashboardSection
                title="Interviewer capacity"
                hint="Available vs booked slots by day — spot bottlenecks before you try to schedule."
                description="Available vs booked slots"
                icon={Calendar}
              >
                {capacityByDay.length === 0 ? (
                  <EmptyWidget title="No capacity data" description="Slot coverage will appear here" />
                ) : (
                  <>
                    {capacityDepts.length > 0 ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        Depts: {capacityDepts.slice(0, 6).join(', ')}
                        {capacityDepts.length > 6 ? ` +${capacityDepts.length - 6}` : ''}
                      </p>
                    ) : null}
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={capacityByDay}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => {
                              try {
                                return formatDate(v);
                              } catch {
                                return String(v).slice(5);
                              }
                            }}
                          />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="availableSlots" name="Available" fill="#059669" stackId="a" />
                          <Bar dataKey="bookedSlots" name="Booked" fill="#d97706" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </DashboardSection>
            </div>
          </DashboardSection>
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default HRDashboard;
