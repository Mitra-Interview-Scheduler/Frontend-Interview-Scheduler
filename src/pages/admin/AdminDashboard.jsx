import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Mail,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading';
import { StatCardsSkeleton } from '@/components/ui/page-skeletons';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { sortRoles } from '@/lib/roleHelpers';
import { dashboardAPI } from '@/services/dashboardAPI';
import {
  ActionQueueCard,
  DashboardSection,
  EmptyWidget,
  StatPill,
} from '@/pages/shared/dashboard';

const safeArray = (v) => (Array.isArray(v) ? v : []);
const bucket = (v) => ({ count: v?.count ?? 0, items: safeArray(v?.items) });
const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488'];

const roleColor = (role) => {
  const map = {
    ADMIN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    HR: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    INTERVIEWER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  };
  return map[role] ?? 'bg-muted text-muted-foreground';
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { formatDateTime } = useFormattedDateTime();
  const reduceMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [trendDays, setTrendDays] = useState('30');

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await dashboardAPI.getAdminDashboard({
          trendDays: Number(trendDays),
          previewSize: 5,
        });
        setData(res);
      } catch (err) {
        console.error(err);
        const message =
          err.response?.data?.message || err.message || 'Failed to load admin dashboard.';
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
    [trendDays]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const loadSection = useCallback(
    (section) => (page, size) => dashboardAPI.getAdminDashboardItems(section, { page, size }),
    []
  );

  const alerts = data?.alerts || {};
  const liveStatus = data?.liveStatus || {};
  const trends = data?.trends || {};

  const noCalendar = bucket(alerts.interviewersWithoutCalendar);
  const noAvailability = bucket(alerts.interviewersNoAvailability);
  const noRoles = bucket(alerts.usersNoRoles);
  const inactiveCoordinators = bucket(alerts.inactiveCoordinatorsOnActiveCandidates);
  const emailFailures = alerts.emailFailuresLast24h?.count ?? 0;
  const catalogGaps = alerts.catalogGaps || {};
  const catalogGapCount =
    safeArray(catalogGaps.designationsWithoutInterviewers).length +
    safeArray(catalogGaps.orphanCandidateTechnologies).length +
    safeArray(catalogGaps.unusedDomains).length;

  const activity = liveStatus.activityToday || {};
  const usersByRole = liveStatus.usersByRole || {};
  const feedbackForms = safeArray(liveStatus.feedbackFormUsage);
  const recentlyAdded = safeArray(usersByRole.recentlyAdded);

  const departmentFunnel = safeArray(trends.departmentFunnel);

  const totalUsers =
    (usersByRole.adminActive ?? 0) +
    (usersByRole.adminInactive ?? 0) +
    (usersByRole.hrActive ?? 0) +
    (usersByRole.hrInactive ?? 0) +
    (usersByRole.interviewerActive ?? 0) +
    (usersByRole.interviewerInactive ?? 0);

  const containerVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System & Org Health</h1>
            <p className="text-muted-foreground">Operational alerts and org metrics</p>
          </div>
          <StatCardsSkeleton count={4} />
          <LoadingState label="Loading admin dashboard…" minHeight="sm" />
        </div>
      </>
    );
  }

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">System & Org Health</h1>
            <p className="text-muted-foreground">
              Alerts, live activity, and organizational trends
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatPill
                label="Alerts"
                value={
                  noCalendar.length +
                  noAvailability.length +
                  noRoles.length +
                  inactiveCoordinators.length +
                  (emailFailures > 0 ? 1 : 0) +
                  (catalogGapCount > 0 ? 1 : 0)
                }
                tone="danger"
              />
              <StatPill
                label="Interviews today"
                value={activity.interviewsToday ?? 0}
                tone="primary"
              />
              <StatPill label="Users" value={totalUsers} />
              {data?.generatedAt ? (
                <span className="text-xs text-muted-foreground self-center">
                  Updated {formatDateTime(data.generatedAt)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={trendDays} onValueChange={setTrendDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Trend window" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadDashboard({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {error ? (
          <motion.div variants={itemVariants}>
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p>{error}</p>
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

        {/* Alerts */}
        <motion.div variants={itemVariants}>
          <DashboardSection
            noCard
            title="Alerts / action queue"
            description="Configuration and operational risks"
            hint="Org health risks that block scheduling or hiring — fix these before they become outages."
            icon={AlertTriangle}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <ActionQueueCard
                title="No calendar connected"
                hint="Interviewers without Google Calendar cannot sync availability or Meet links."
                count={noCalendar.count}
                severity={noCalendar.count ? 'warning' : 'default'}
                icon={Calendar}
                items={noCalendar.items}
                onLoadPage={loadSection('interviewersWithoutCalendar')}
                emptyMessage="All interviewers connected"
                emptyDescription="No interviewers are missing Google Calendar."
                getItemKey={(u) => u.userId}
                renderItem={(u) => (
                  <div className="rounded-lg border p-2.5 text-sm">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                )}
              />

              <ActionQueueCard
                title="No availability published"
                hint="Interviewers with no upcoming slots — HR will struggle to book them."
                count={noAvailability.count}
                severity={noAvailability.count ? 'warning' : 'default'}
                icon={Clock}
                items={noAvailability.items}
                onLoadPage={loadSection('interviewersNoAvailability')}
                emptyMessage="Availability looks healthy"
                emptyDescription="Interviewers have published slots for the next 14 days."
                getItemKey={(u) => u.userId}
                renderItem={(u) => (
                  <div className="rounded-lg border p-2.5 text-sm">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                )}
              />

              <ActionQueueCard
                title="Users with no roles"
                hint="Accounts that cannot access the app correctly until a role is assigned."
                count={noRoles.count}
                severity={noRoles.count ? 'critical' : 'default'}
                icon={Users}
                items={noRoles.items}
                onLoadPage={loadSection('usersNoRoles')}
                emptyMessage="No role gaps"
                emptyDescription="Every user has at least one role assigned."
                getItemKey={(u) => u.userId}
                renderItem={(u) => (
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border p-2.5 text-sm hover:bg-accent/50"
                    onClick={() => navigate('/admin/users')}
                  >
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </button>
                )}
              />

              <ActionQueueCard
                title="Inactive coordinators"
                hint="Active candidates still assigned to deactivated coordinators — reassign ownership."
                count={inactiveCoordinators.count}
                severity={inactiveCoordinators.count ? 'warning' : 'default'}
                icon={Shield}
                items={inactiveCoordinators.items}
                onLoadPage={loadSection('inactiveCoordinators')}
                emptyMessage="No inactive coordinators"
                emptyDescription="Active candidates are not assigned to inactive users."
                getItemKey={(u) => u.userId}
                renderItem={(u) => (
                  <div className="rounded-lg border p-2.5 text-sm">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.activeCandidateCount ?? 0} active candidate
                      {(u.activeCandidateCount ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                )}
              />

              <ActionQueueCard
                title="Email failures (24h)"
                hint="Outbound emails that failed recently — candidates or interviewers may have missed notices."
                count={emailFailures}
                severity={emailFailures > 0 ? 'critical' : 'default'}
                icon={Mail}
                items={
                  emailFailures > 0
                    ? [
                        {
                          id: 'email-failures-24h',
                          count: emailFailures,
                        },
                      ]
                    : []
                }
                emptyMessage="No email failures"
                emptyDescription="No failed deliveries in the last 24 hours."
                getItemKey={(item) => item.id}
                renderItem={(item) => (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm space-y-2">
                    <p>
                      <span className="font-semibold tabular-nums">{item.count}</span> failed
                      deliveries in the last 24 hours.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/admin/email-logs')}
                    >
                      Open Email Logs
                    </Button>
                  </div>
                )}
              />

              <ActionQueueCard
                title="Catalog gaps"
                hint="Missing designations, orphan technologies, or unused domains that break matching."
                count={catalogGapCount}
                severity={catalogGapCount ? 'info' : 'default'}
                icon={AlertTriangle}
                className="sm:col-span-2 xl:col-span-1"
                items={[
                  ...safeArray(catalogGaps.designationsWithoutInterviewers).map((item, i) => ({
                    id: `desig-${i}`,
                    group: 'Designations without interviewers',
                    label:
                      typeof item === 'string'
                        ? item
                        : item.name || item.label || item.code || String(item),
                  })),
                  ...safeArray(catalogGaps.orphanCandidateTechnologies).map((item, i) => ({
                    id: `tech-${i}`,
                    group: 'Orphan candidate technologies',
                    label:
                      typeof item === 'string'
                        ? item
                        : item.name || item.label || item.code || String(item),
                  })),
                  ...safeArray(catalogGaps.unusedDomains).map((item, i) => ({
                    id: `domain-${i}`,
                    group: 'Unused domains',
                    label:
                      typeof item === 'string'
                        ? item
                        : item.name || item.label || item.code || String(item),
                  })),
                ]}
                onLoadPage={loadSection('catalogGaps')}
                emptyMessage="No catalog gaps"
                emptyDescription="Designations, technologies, and domains look consistent."
                getItemKey={(item) => item.id}
                renderItem={(item) => (
                  <div className="rounded-lg border p-2.5 text-sm space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      {item.group}
                    </p>
                    <p className="text-sm">{item.label}</p>
                  </div>
                )}
              />
            </div>
          </DashboardSection>
        </motion.div>

        {/* Live status */}
        <motion.div variants={itemVariants}>
          <DashboardSection
            noCard
            title="Live status"
            description="Today’s activity and org composition"
            hint="Current org pulse — who is active today and how the user base is split."
            icon={Users}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Interviews today', value: activity.interviewsToday ?? 0 },
                { label: 'Feedback today', value: activity.feedbackSubmittedToday ?? 0 },
                { label: 'Candidates added', value: activity.candidatesAddedToday ?? 0 },
                { label: 'Notifications sent', value: activity.notificationsSentToday ?? 0 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border p-4 bg-card">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DashboardSection
                title="Users by role"
                hint="Active vs inactive headcount per role — spot imbalance or unused accounts."
                description="Active vs inactive"
              >
                <div className="space-y-3">
                  {[
                    {
                      label: 'Admins',
                      active: usersByRole.adminActive ?? 0,
                      inactive: usersByRole.adminInactive ?? 0,
                      color: 'bg-slate-500',
                    },
                    {
                      label: 'HR',
                      active: usersByRole.hrActive ?? 0,
                      inactive: usersByRole.hrInactive ?? 0,
                      color: 'bg-blue-500',
                    },
                    {
                      label: 'Interviewers',
                      active: usersByRole.interviewerActive ?? 0,
                      inactive: usersByRole.interviewerInactive ?? 0,
                      color: 'bg-emerald-500',
                    },
                  ].map((row) => {
                    const total = row.active + row.inactive;
                    const pct = total ? (row.active / total) * 100 : 0;
                    return (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-medium tabular-nums">
                            {row.active} active · {row.inactive} inactive
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">
                    Multi-role users: {usersByRole.multiRoleCount ?? 0} · Email opt-out rate:{' '}
                    {liveStatus.emailOptOutRate != null
                      ? `${Number(liveStatus.emailOptOutRate).toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
              </DashboardSection>

              <DashboardSection
                title="Quick actions"
                hint="Shortcuts to the admin pages you use most for day-to-day fixes."
                description="Common admin tasks"
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Manage Users', icon: Users, path: '/admin/users' },
                    { label: 'Technologies', icon: Shield, path: '/admin/technologies' },
                    { label: 'Domains', icon: Shield, path: '/admin/domains' },
                    { label: 'Designations', icon: Calendar, path: '/admin/designations' },
                    { label: 'Interview Types', icon: Calendar, path: '/admin/interview-types' },
                    { label: 'Email Logs', icon: Mail, path: '/admin/email-logs' },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => navigate(action.path)}
                      >
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </DashboardSection>

              <DashboardSection
                title="Feedback form usage"
                hint="Which forms are getting submissions — useful when retiring or updating templates."
              >
                {feedbackForms.length === 0 ? (
                  <EmptyWidget title="No feedback form usage data" />
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 px-2 font-medium">Form</th>
                          <th className="text-right py-2 px-2 font-medium">Ver</th>
                          <th className="text-right py-2 px-2 font-medium">Subs</th>
                          <th className="text-right py-2 px-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedbackForms.map((form) => (
                          <tr key={form.formId} className="border-b last:border-0">
                            <td className="py-2 px-2 font-medium">{form.name}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{form.version}</td>
                            <td className="py-2 px-2 text-right tabular-nums">
                              {form.submissionCount ?? 0}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Badge
                                variant="outline"
                                className={
                                  form.active
                                    ? 'text-emerald-700 border-emerald-200'
                                    : 'text-muted-foreground'
                                }
                              >
                                {form.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardSection>

              {recentlyAdded.length > 0 ? (
                <DashboardSection
                  title="Recently added users"
                  hint="Newest accounts so you can verify roles and onboarding quickly."
                  className="lg:col-span-2"
                >
                  <div className="space-y-3">
                    {recentlyAdded.slice(0, 6).map((user, i) => (
                      <div key={user.id || user.userId || i} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {(user.firstName?.[0] ?? user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                            {user.lastName?.[0]?.toUpperCase() ?? ''}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.name ||
                              `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                              user.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {sortRoles(
                            user.roles || (user.role ? [user.role] : [])
                          ).map((role) => (
                            <Badge key={role} className={`text-xs shrink-0 ${roleColor(role)}`}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </DashboardSection>
              ) : null}
            </div>
          </DashboardSection>
        </motion.div>

        {/* Trends */}
        <motion.div variants={itemVariants}>
          <DashboardSection
            noCard
            title="Trends"
            description={`Last ${trendDays} days`}
            hint="Longer-range patterns — hiring flow by department."
            icon={Calendar}
          >
            <div className="grid grid-cols-1 gap-4">
              <DashboardSection
                title="Department funnel"
                hint="Candidates, interviews, offers, and accepts by department over the selected period."
              >
                {departmentFunnel.length === 0 ? (
                  <EmptyWidget title="No department funnel data" />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentFunnel}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="candidates" name="Candidates" fill={CHART_COLORS[0]} />
                        <Bar dataKey="interviews" name="Interviews" fill={CHART_COLORS[1]} />
                        <Bar dataKey="offers" name="Offers" fill={CHART_COLORS[2]} />
                        <Bar dataKey="accepted" name="Accepted" fill={CHART_COLORS[3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </DashboardSection>
            </div>
          </DashboardSection>
        </motion.div>
      </motion.div>
    </>
  );
};

export default AdminDashboard;
