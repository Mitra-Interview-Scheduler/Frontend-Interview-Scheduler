import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  Settings,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading';
import { StatCardsSkeleton } from '@/components/ui/page-skeletons';
import { toast } from '@/hooks/use-toast';
import { handleGoogleCalendarOAuthResult } from '@/lib/googleCalendarRedirect';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { dashboardAPI } from '@/services/dashboardAPI';
import {
  ActionQueueCard,
  DashboardSection,
  PaginatedWidgetList,
  StatPill,
  UpcomingRangeToggle,
  asCountedList,
} from '@/pages/shared/dashboard';
import FeedbackDueBoard from '@/pages/interviewer/components/FeedbackDueBoard';

const safeArray = (v) => (Array.isArray(v) ? v : []);
const bucket = (v) => ({ count: v?.count ?? 0, items: safeArray(v?.items) });

const skillOverlap = (candidateSkills = [], myCore = [], myCanDo = []) => {
  const mine = new Set(
    [...safeArray(myCore), ...safeArray(myCanDo)].map((s) =>
      String(s?.name || s).toLowerCase()
    )
  );
  return safeArray(candidateSkills).filter((s) => mine.has(String(s?.name || s).toLowerCase()));
};

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const { formatDate, formatTime, formatDateTime } = useFormattedDateTime();
  const reduceMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [upcomingDays, setUpcomingDays] = useState(7);
  const [upcomingRefreshing, setUpcomingRefreshing] = useState(false);
  const upcomingDaysRef = useRef(upcomingDays);
  upcomingDaysRef.current = upcomingDays;
  const [coverageDays, setCoverageDays] = useState(14);
  const [coverageRefreshing, setCoverageRefreshing] = useState(false);
  const coverageDaysRef = useRef(coverageDays);
  coverageDaysRef.current = coverageDays;

  useEffect(() => {
    handleGoogleCalendarOAuthResult({ navigate, toast });
  }, [navigate]);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await dashboardAPI.getInterviewerDashboard({
        previewSize: 5,
        upcomingDays: upcomingDaysRef.current,
        coverageDays: coverageDaysRef.current,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load interviewer dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      toast({
        title: 'Could not load dashboard',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSection = useCallback(
    (section) => (page, size) =>
      dashboardAPI.getInterviewerDashboardItems(section, {
        page,
        size,
        upcomingDays: upcomingDaysRef.current,
      }),
    []
  );

  const handleUpcomingDaysChange = async (days) => {
    if (days === upcomingDays) return;
    setUpcomingDays(days);
    setUpcomingRefreshing(true);
    try {
      const res = await dashboardAPI.getInterviewerDashboardItems('upcomingInterviews', {
        page: 0,
        size: 5,
        upcomingDays: days,
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

  const handleCoverageDaysChange = async (days) => {
    if (days === coverageDays) return;
    setCoverageDays(days);
    setCoverageRefreshing(true);
    try {
      const res = await dashboardAPI.getInterviewerCoverage({ coverageDays: days });
      setData((prev) =>
        prev
          ? {
              ...prev,
              liveStatus: {
                ...prev.liveStatus,
                availabilityCoverage: res,
              },
            }
          : prev
      );
    } catch (err) {
      toast({
        title: 'Could not load availability coverage',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setCoverageRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const actionQueue = data?.actionQueue || {};
  const liveStatus = data?.liveStatus || {};
  const trends = data?.trends || {};

  const feedbackDue = bucket(actionQueue.feedbackDue);
  const assessments = bucket(actionQueue.assessmentsToReview);
  const postpone = bucket(actionQueue.myPostponeProposals);

  const upcoming = bucket(liveStatus.upcomingInterviews);
  const availability = liveStatus.availabilityCoverage || {};
  const conducted = trends.interviewsConducted || {};

  const containerVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Week</h1>
            <p className="text-muted-foreground">Your interviews, feedback, and prep</p>
          </div>
          <StatCardsSkeleton count={3} />
          <LoadingState label="Loading your week…" minHeight="sm" />
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
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Week</h1>
            <p className="text-muted-foreground">
              Feedback due, upcoming interviews with prep, and your coverage
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatPill label="Feedback due" value={feedbackDue.count} tone="danger" />
              <StatPill label="Assessments" value={assessments.count} tone="warning" />
              <StatPill label="Upcoming" value={upcoming.count} tone="primary" />
              {data?.generatedAt ? (
                <span className="text-xs text-muted-foreground self-center">
                  Updated {formatDateTime(data.generatedAt)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/interviewer/availability')}
            >
              <Calendar className="w-4 h-4" />
              Availability
            </Button>
            <Button className="gap-2" onClick={() => navigate('/interviewer/profile')}>
              <Settings className="w-4 h-4" />
              Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => loadDashboard({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
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

          <motion.div variants={itemVariants}>
            <DashboardSection
              noCard
              title="Activity"
              description="Interview volume this period"
              hint="How many interviews you completed recently — a quick pulse of your load."
            >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-4 bg-card">
                <p className="text-xs text-muted-foreground">This month</p>
                <p className="text-2xl font-bold">{conducted.thisMonth ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4 bg-card">
                <p className="text-xs text-muted-foreground">This quarter</p>
                <p className="text-2xl font-bold">{conducted.thisQuarter ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4 bg-card">
                <p className="text-xs text-muted-foreground">Reschedules initiated</p>
                <p className="text-2xl font-bold">{trends.reschedulesInitiated ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4 bg-card">
                <p className="text-xs text-muted-foreground">Interviews conducted</p>
                <p className="text-2xl font-bold">{conducted.interviewsConducted ?? 0}</p>
              </div>
            </div>
          </DashboardSection>
        </motion.div>
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <DashboardSection
                title="Upcoming interviews"
                hint="Your next interviews with skill overlap so you can prep for what the candidate needs. The range is calendar days and includes weekends."
                description={`${upcoming.count} in the next ${upcomingDays} days, including weekends`}
                actions={
                  <UpcomingRangeToggle
                    value={upcomingDays}
                    onChange={handleUpcomingDaysChange}
                    disabled={upcomingRefreshing}
                    ariaLabel="Upcoming interviews range"
                  />
                }
              >
                {upcomingRefreshing ? (
                  <LoadingState label="Loading upcoming interviews…" size="sm" minHeight="sm" />
                ) : (
                <PaginatedWidgetList
                  items={upcoming.items}
                  count={upcoming.count}
                  pageSize={5}
                  onLoadPage={loadSection('upcomingInterviews')}
                  emptyTitle={`No interviews in the next ${upcomingDays} days`}
                  emptyDescription="Scheduled interviews will show here with skill prep"
                  getItemKey={(item, index) => item.scheduleId || item.requestId || index}
                  renderItem={(item) => {
                    const overlap = skillOverlap(
                      item.candidateSkills,
                      item.myCoreSkills,
                      item.myCanDoSkills
                    );
                    return (
                      <div className="rounded-xl border p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{item.candidateName}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5" />
                              {item.start
                                ? `${formatDate(item.start)} · ${formatTime(new Date(item.start))}`
                                : '—'}
                              {item.interviewType ? ` · ${item.interviewType}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {safeArray(item.panelMembers).length > 0 ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border text-xs">
                                Panel · {item.panelMembers.length}
                              </Badge>
                            ) : (
                              <Badge className="bg-success-light text-success border-success/20 text-xs">
                                Scheduled
                              </Badge>
                            )}
                            {item.meetingLink ? (
                              <a
                                href={item.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                              >
                                Join Meet <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : null}
                          </div>
                        </div>

                        {overlap.length > 0 ? (
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Why you matched
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {overlap.map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {skill?.name || skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {safeArray(item.candidateDomains).length > 0 ? (
                            <span>
                              Domains:{' '}
                              {item.candidateDomains.map((d) => d?.name || d).join(', ')}
                            </span>
                          ) : null}
                          {safeArray(item.panelMembers).length > 0 ? (
                            <p className="w-full">
                              Panel: {item.panelMembers.map((m) => m?.name || m).join(', ')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  }}
                />
                )}
              </DashboardSection>
            </div>

            <div className="space-y-4">
              <DashboardSection
                title="Availability coverage"
                hint="Open slots HR can still book, and slots already booked, in the selected calendar range. Weekends are included."
                description={`Your slots for the next ${coverageDays} days, including weekends`}
                actions={
                  <UpcomingRangeToggle
                    value={coverageDays}
                    onChange={handleCoverageDaysChange}
                    disabled={coverageRefreshing}
                    ariaLabel="Availability coverage range"
                  />
                }
              >
                {coverageRefreshing ? (
                  <LoadingState label="Loading coverage…" size="sm" minHeight="sm" />
                ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Open</p>
                      <p className="text-2xl font-bold">{availability.myOpenSlots ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Booked</p>
                      <p className="text-2xl font-bold">{availability.myBookedSlots ?? 0}</p>
                    </div>
                  </div>
                  {availability.lastPublishedSlotEnd ? (
                    <p className="text-xs text-muted-foreground">
                      Last published slot ends{' '}
                      {formatDateTime(availability.lastPublishedSlotEnd)}
                    </p>
                  ) : null}
                  {availability.nudgeMessage ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-sm text-amber-900 dark:text-amber-100">
                      {availability.nudgeMessage}
                    </div>
                  ) : null}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/interviewer/availability')}
                  >
                    Manage availability
                  </Button>
                </div>
                )}
              </DashboardSection>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <FeedbackDueBoard
            items={feedbackDue.items}
            count={feedbackDue.count}
            onLoadPage={loadSection('feedbackDue')}
            onOpen={(scheduleId) => navigate(`/interviewer/feedback/${scheduleId}`)}
            formatDateTime={formatDateTime}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <DashboardSection
            noCard
            title="Action queue"
            description="Assessments and postpone updates"
            hint="Reviews and time-change requests that still need your attention."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ActionQueueCard
                title="Assessments to review"
                hint="Take-home work assigned to you that still needs a review decision."
                count={assessments.count}
                severity={assessments.count > 0 ? 'warning' : 'default'}
                defaultOpen={assessments.count > 0}
                items={assessments.items}
                onLoadPage={loadSection('assessmentsToReview')}
                emptyMessage="No assessments to review"
                emptyDescription="Assessments assigned to you will appear here."
                getItemKey={(item, idx) => item.scheduleId || item.id || idx}
                renderItem={(item) => (
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border p-2.5 text-sm hover:bg-accent/50"
                    onClick={() => navigate('/interviewer/assessments')}
                  >
                    <p className="font-medium truncate">
                      {item.candidateName || item.name || 'Assessment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.interviewType || item.status || 'Awaiting review'}
                    </p>
                  </button>
                )}
              />

              <ActionQueueCard
                title="My postpone proposals"
                hint="Time-change requests you raised — track whether HR has approved them."
                count={postpone.count}
                severity="info"
                items={postpone.items}
                onLoadPage={loadSection('myPostponeProposals')}
                emptyMessage="No postpone proposals"
                emptyDescription="Time-change requests you raised will appear here."
                getItemKey={(item) => item.id}
                renderItem={(item) => (
                  <div className="rounded-lg border p-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium truncate">{item.candidateName}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.status || '—'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.createdAt ? formatDateTime(item.createdAt) : '—'}
                    </p>
                  </div>
                )}
              />
            </div>
          </DashboardSection>
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default InterviewerDashboard;
