import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, LayoutList, ListTree, Loader2, Table2 } from 'lucide-react';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { buildCandidateActivityHistory } from '@/lib/candidateSteps';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import '@/styles/ProfileActivityTab.css';

const VIEW_MODES = [
  { id: 'timeline', label: 'Timeline', icon: ListTree },
  { id: 'feed', label: 'Feed', icon: LayoutList },
  { id: 'table', label: 'Table', icon: Table2 },
];

const isInterviewActivity = (entry) => entry.kind === 'INTERVIEW_PRELUDE';


const InterviewActivityPrelude = ({ entry, formatDateTime, formatDateTimeRange }) => {
  const request = entry.interviewRequest;
  const interviewer = request?.assignedInterviewerName || entry.detail;
  const start = request?.scheduledStartDateTime || request?.preferredStartDateTime || entry.timestamp;
  const end = request?.scheduledEndDateTime || request?.preferredEndDateTime || entry.endTimestamp;

  return (
    <p className="mt-0.5 text-xs text-slate-600">
      {interviewer ? `With ${interviewer}` : 'Interview scheduled'}
      {start ? ` · ${end ? formatDateTimeRange(start, end) : formatDateTime(start)}` : ''}
    </p>
  );
};

const formatActivityWhen = (entry, formatDateTime, formatDateTimeRange) => {
  if (isInterviewActivity(entry) && entry.timestamp && entry.endTimestamp) {
    return formatDateTimeRange(entry.timestamp, entry.endTimestamp);
  }
  if (entry.timestamp) return formatDateTime(entry.timestamp);
  return 'Date unavailable';
};

const ActivityEntryDetails = ({ entry, formatDateTime, formatDateTimeRange }) => (
  <>
    {entry.detail && (
      <p className="mt-0.5 text-xs text-slate-600">{entry.detail}</p>
    )}
    <p className="mt-1 text-xs text-slate-500">
      {formatActivityWhen(entry, formatDateTime, formatDateTimeRange)}
    </p>
  </>
);

const ActivityBadges = ({ entry }) => {
  const isPipelineCurrent = entry.kind === 'PIPELINE' && entry.stepStatus === 'CURRENT';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className={`rounded-full text-[10px] font-semibold ${entry.statusBadgeClass}`}
      >
        {entry.actionLabel}
      </Badge>
      {isPipelineCurrent && (
        <Badge className="rounded-full bg-blue-600 text-[10px] hover:bg-blue-600">
          Active
        </Badge>
      )}
      {isInterviewActivity(entry) && entry.stepStatus === 'SCHEDULED' && (
        <Badge variant="outline" className="rounded-full text-[10px] border-sky-200 text-sky-700 bg-sky-50">
          Interview
        </Badge>
      )}
    </div>
  );
};

const ActivityEmpty = () => (
  <p className="text-sm text-slate-500">No activity recorded yet.</p>
);

const ActivityTimeline = ({ activities, formatDateTime, formatDateTimeRange }) => (
  <ol className="profile-activity-timeline">
    {activities.map((entry, index) => {
      const isLast = index === activities.length - 1;

      if (entry.kind === 'INTERVIEW_PRELUDE') {
        return (
          <li key={entry.id} className="profile-activity-timeline-prelude">
            {!isLast && <span className="profile-activity-timeline-line" aria-hidden="true" />}
            <span className="profile-activity-timeline-spacer" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.stepLabel}</p>
              <InterviewActivityPrelude
                entry={entry}
                formatDateTime={formatDateTime}
                formatDateTimeRange={formatDateTimeRange}
              />
            </div>
          </li>
        );
      }

      return (
        <li key={entry.id} className="profile-activity-timeline-item">
          {!isLast && <span className="profile-activity-timeline-line" aria-hidden="true" />}

          <span
            className="profile-activity-dot"
            style={{ backgroundColor: entry.bgColor || '#6366f1' }}
            aria-hidden="true"
          >
            <span className="profile-activity-dot-inner" />
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">{entry.stepLabel}</p>
              <ActivityBadges entry={entry} />
            </div>
            <ActivityEntryDetails
              entry={entry}
              formatDateTime={formatDateTime}
              formatDateTimeRange={formatDateTimeRange}
            />
          </div>
        </li>
      );
    })}
  </ol>
);

const ActivityFeed = ({ activities, formatDateTime, formatDateTimeRange }) => {
  const feedItems = [...activities].reverse();

  return (
    <div className="profile-activity-feed">
      {feedItems.map((entry) => {
        const isPipelineCurrent = entry.kind === 'PIPELINE' && entry.stepStatus === 'CURRENT';

        if (entry.kind === 'INTERVIEW_PRELUDE') {
          return (
            <div key={entry.id} className="profile-activity-feed-prelude">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.stepLabel}</p>
              <InterviewActivityPrelude
                entry={entry}
                formatDateTime={formatDateTime}
                formatDateTimeRange={formatDateTimeRange}
              />
            </div>
          );
        }

        return (
          <article
            key={entry.id}
            className={`profile-activity-feed-card ${isPipelineCurrent ? 'is-current' : ''}`}
            style={{ '--activity-color': entry.bgColor || '#6366f1' }}
          >
            <div className="profile-activity-feed-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{entry.stepLabel}</p>
                  <ActivityEntryDetails
                    entry={entry}
                    formatDateTime={formatDateTime}
                    formatDateTimeRange={formatDateTimeRange}
                  />
                </div>
                <ActivityBadges entry={entry} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const ActivityTable = ({ activities, formatDateTime, formatDateTimeRange }) => (
  <div className="profile-activity-table-wrap">
    <table className="profile-activity-table">
      <thead>
        <tr>
          <th>Activity</th>
          <th>Status</th>
          <th>When</th>
        </tr>
      </thead>
      <tbody>
        {[...activities].reverse().map((entry) => {
          if (entry.kind === 'INTERVIEW_PRELUDE') {
            return (
              <tr key={entry.id} className="profile-activity-table-prelude">
                <td colSpan={3}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.stepLabel}</p>
                  <InterviewActivityPrelude
                    entry={entry}
                    formatDateTime={formatDateTime}
                    formatDateTimeRange={formatDateTimeRange}
                  />
                </td>
              </tr>
            );
          }

          return (
          <tr
            key={entry.id}
            className={entry.kind === 'PIPELINE' && entry.stepStatus === 'CURRENT' ? 'is-current' : ''}
          >
            <td>
              <div className="flex items-start gap-2">
                <span
                  className="profile-activity-table-dot mt-1.5"
                  style={{ backgroundColor: entry.bgColor || '#6366f1' }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{entry.stepLabel}</span>
                    {entry.kind === 'PIPELINE' && entry.stepStatus === 'CURRENT' && (
                      <Badge className="rounded-full bg-blue-600 text-[10px] hover:bg-blue-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  <ActivityEntryDetails
                    entry={entry}
                    formatDateTime={formatDateTime}
                    formatDateTimeRange={formatDateTimeRange}
                  />
                </div>
              </div>
            </td>
            <td>
              <Badge
                variant="outline"
                className={`rounded-full text-[10px] font-semibold ${entry.statusBadgeClass}`}
              >
                {entry.actionLabel}
              </Badge>
            </td>
            <td className="text-slate-500 whitespace-nowrap">
              {formatActivityWhen(entry, formatDateTime, formatDateTimeRange)}
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const ProfileActivityTab = ({ candidate, steps = [], stepsLoading = false, isActive = true }) => {
  const { formatDateTime, formatDateTimeRange } = useFormattedDateTime();
  const [viewMode, setViewMode] = useState('feed');
  const [interviews, setInterviews] = useState([]);
  const [panels, setPanels] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  useEffect(() => {
    if (!candidate?.id) {
      setInterviews([]);
      setPanels([]);
      return undefined;
    }

    if (!isActive) {
      return undefined;
    }

    let active = true;
    setInterviewsLoading(true);

    Promise.all([
      hrAvailabilityAPI.getInterviewsForCandidate(candidate.id),
      hrAvailabilityAPI.getPanelsByCandidateId(candidate.id),
    ])
      .then(([interviewData, panelData]) => {
        if (!active) return;
        setInterviews(Array.isArray(interviewData) ? interviewData : []);
        setPanels(Array.isArray(panelData) ? panelData : []);
      })
      .catch((error) => {
        console.error('Failed to load candidate interview activity:', error);
        if (!active) return;
        setInterviews([]);
        setPanels([]);
      })
      .finally(() => {
        if (active) setInterviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isActive, candidate?.id, candidate?.status, steps]);

  const activities = useMemo(
    () => buildCandidateActivityHistory(steps, candidate, interviews, panels),
    [steps, candidate, interviews, panels],
  );

  const loading = stepsLoading || interviewsLoading;

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Activity History
              </p>
              <Badge variant="outline" className="rounded-full text-[11px]">
                {activities.length}
              </Badge>
            </div>

            <div className="profile-activity-view-toggle" role="group" aria-label="Activity view mode">
              {VIEW_MODES.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={viewMode === id ? 'default' : 'outline'}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  onClick={() => setViewMode(id)}
                  aria-pressed={viewMode === id}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="profile-activity-view-label">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && activities.length === 0 && <ActivityEmpty />}

          {!loading && activities.length > 0 && viewMode === 'timeline' && (
            <ActivityTimeline
              activities={activities}
              formatDateTime={formatDateTime}
              formatDateTimeRange={formatDateTimeRange}
            />
          )}

          {!loading && activities.length > 0 && viewMode === 'feed' && (
            <ActivityFeed
              activities={activities}
              formatDateTime={formatDateTime}
              formatDateTimeRange={formatDateTimeRange}
            />
          )}

          {!loading && activities.length > 0 && viewMode === 'table' && (
            <ActivityTable
              activities={activities}
              formatDateTime={formatDateTime}
              formatDateTimeRange={formatDateTimeRange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileActivityTab;
