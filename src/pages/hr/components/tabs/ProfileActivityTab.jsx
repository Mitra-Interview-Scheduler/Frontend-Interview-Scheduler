import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, LayoutList, ListTree, Table2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { buildCandidateActivityHistory, getCandidateStatusLabel } from '@/lib/candidateSteps';
import { InterviewScheduleStatus, PipelineStepStatus } from '@/lib/statusConstants';
import { candidatePipelineAPI } from '@/services/candidatePipelineApi';
import '@/styles/ProfileActivityTab.css';

const VIEW_MODES = [
  { id: 'timeline', label: 'Timeline', icon: ListTree },
  { id: 'feed', label: 'Feed', icon: LayoutList },
  { id: 'table', label: 'Table', icon: Table2 },
];

const formatStatusKeyLabel = (statusKey) => String(statusKey || '')
  .trim()
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const hasInterviewDetails = (entry) => (
  Boolean(entry.interviewRequest || entry.panel)
);

const InterviewActivityPrelude = ({ entry, formatDateTime, formatDateTimeRange }) => {
  const request = entry.interviewRequest;
  const interviewerDetail = entry.detail
    || request?.assignedInterviewerName
    || null;
  const start = entry.timestamp
    || request?.scheduledStartDateTime
    || request?.preferredStartDateTime
    || null;
  const end = entry.endTimestamp
    || request?.scheduledEndDateTime
    || request?.preferredEndDateTime
    || null;

  return (
    <p className="mt-0.5 text-xs text-slate-600">
      {interviewerDetail ? `With ${interviewerDetail}` : 'Interview scheduled'}
      {start ? ` · ${end ? formatDateTimeRange(start, end) : formatDateTime(start)}` : ''}
    </p>
  );
};

const formatActivityWhen = (entry, formatDateTime, formatDateTimeRange) => {
  const start = entry.timestamp;
  const end = entry.endTimestamp;

  if (hasInterviewDetails(entry)) {
    if (start && end) return formatDateTimeRange(start, end);
    if (start) return formatDateTime(start);
  }

  if (start) return formatDateTime(start);
  return 'Date unavailable';
};

const ActivityEntryDetails = ({ entry, formatDateTime, formatDateTimeRange }) => {
  if (entry.kind === 'STATUS_AUDIT') {
    return (
      <>
        {entry.detail && (
          <p className="mt-0.5 text-xs font-medium text-slate-700">{entry.detail}</p>
        )}
        {entry.previousStatusKey && (
          <p className="mt-0.5 text-xs text-slate-500">
            From {formatStatusKeyLabel(entry.previousStatusKey)}
          </p>
        )}
        {entry.notes && (
          <p className="mt-0.5 text-xs text-slate-600">{entry.notes}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {formatActivityWhen(entry, formatDateTime, formatDateTimeRange)}
        </p>
      </>
    );
  }

  if (entry.kind === 'PIPELINE' && hasInterviewDetails(entry)) {
    return (
      <>
        {entry.actorDetail && (
          <p className="mt-0.5 text-xs text-slate-600">{entry.actorDetail}</p>
        )}
        <InterviewActivityPrelude
          entry={entry}
          formatDateTime={formatDateTime}
          formatDateTimeRange={formatDateTimeRange}
        />
      </>
    );
  }

  if (hasInterviewDetails(entry)) {
    return (
      <InterviewActivityPrelude
        entry={entry}
        formatDateTime={formatDateTime}
        formatDateTimeRange={formatDateTimeRange}
      />
    );
  }

  return (
    <>
      {entry.detail && (
        <p className="mt-0.5 text-xs text-slate-600">{entry.detail}</p>
      )}
      <p className="mt-1 text-xs text-slate-500">
        {formatActivityWhen(entry, formatDateTime, formatDateTimeRange)}
      </p>
    </>
  );
};

const ActivityBadges = ({ entry }) => {
  const isPipelineCurrent = entry.kind === 'PIPELINE' && entry.stepStatus === PipelineStepStatus.CURRENT;

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
      {entry.cancelledInterview && (
        <Badge variant="outline" className="rounded-full text-[10px] border-red-200 text-red-700 bg-red-50">
          Interview cancelled
        </Badge>
      )}
      {entry.interviewScheduleStatus === InterviewScheduleStatus.SCHEDULED && (
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
        const isPipelineCurrent = entry.kind === 'PIPELINE' && entry.stepStatus === PipelineStepStatus.CURRENT;

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
        {[...activities].reverse().map((entry) => (
          <tr
            key={entry.id}
            className={entry.kind === 'PIPELINE' && entry.stepStatus === PipelineStepStatus.CURRENT ? 'is-current' : ''}
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
                    {entry.kind === 'PIPELINE' && entry.stepStatus === PipelineStepStatus.CURRENT && (
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
        ))}
      </tbody>
    </table>
  </div>
);

const ProfileActivityTab = ({ candidate, steps = [], stepsLoading = false, isActive = true }) => {
  const { formatDateTime, formatDateTimeRange } = useFormattedDateTime();
  const [viewMode, setViewMode] = useState('feed');
  const [statusEvents, setStatusEvents] = useState([]);
  const [statusEventsLoading, setStatusEventsLoading] = useState(false);

  useEffect(() => {
    if (!candidate?.id) {
      setStatusEvents([]);
      return undefined;
    }

    if (!isActive) {
      return undefined;
    }

    let active = true;
    setStatusEventsLoading(true);

    candidatePipelineAPI.getPipelineStatusEvents(candidate.id)
      .then((auditData) => {
        if (!active) return;
        setStatusEvents(Array.isArray(auditData) ? auditData : []);
      })
      .catch((error) => {
        console.error('Failed to load candidate activity audit events:', error);
        if (!active) return;
        setStatusEvents([]);
      })
      .finally(() => {
        if (active) setStatusEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isActive, candidate?.id, candidate?.status]);

  const activities = useMemo(
    () => buildCandidateActivityHistory(
      steps,
      candidate,
      [],
      [],
      statusEvents,
      (statusKey) => getCandidateStatusLabel(steps, statusKey),
    ),
    [steps, candidate, statusEvents],
  );

  const loading = stepsLoading || statusEventsLoading;

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
            <LoadingState minHeight="sm" size="sm" />
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
