import React, { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2, Mail, RefreshCw, Search, Eye, Users, Clock, AlertCircle, Video, CalendarDays,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { emailLogsAPI } from '@/services/emailLogsAPI';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

const PAGE_SIZE = 20;

const statusBadge = (status) => {
  if (status === 'SENT') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'FAILED') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-muted text-muted-foreground';
};

const sourceBadge = (source) => {
  if (source === 'CALENDAR_INVITE') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-violet-100 text-violet-700 border-violet-200';
};

const sourceLabel = (source) => {
  if (source === 'CALENDAR_INVITE') return 'Calendar invite';
  if (source === 'NOTIFICATION') return 'Notification';
  return source || 'System';
};

const DETAIL_LABELS = new Set([
  'candidate',
  'when',
  'position',
  'interviewer',
  'reason',
  'preferred time',
  'interview type',
  'meeting link',
]);

const parseEmailBody = (message) => {
  const intro = [];
  const details = [];
  if (!message || !String(message).trim()) {
    return { intro, details };
  }

  let currentIntro = '';
  const flushIntro = () => {
    if (currentIntro.trim()) {
      intro.push(currentIntro.trim());
      currentIntro = '';
    }
  };

  for (const rawLine of String(message).replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushIntro();
      continue;
    }
    const colon = line.indexOf(':');
    if (colon > 0 && colon < line.length - 1) {
      const label = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      const normalized = label.toLowerCase();
      const isDetail =
        value &&
        label.length <= 40 &&
        (DETAIL_LABELS.has(normalized) || !label.includes(' '));
      if (isDetail && !normalized.startsWith('reminder')) {
        flushIntro();
        details.push({ label, value });
        continue;
      }
    }
    currentIntro = currentIntro ? `${currentIntro} ${line}` : line;
  }
  flushIntro();

  if (!intro.length && !details.length) {
    intro.push(String(message).trim());
  }
  return { intro, details };
};

const splitCsv = (value) =>
  (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const buildRecipientList = (log) => {
  const emails = splitCsv(log.recipients);
  const names = splitCsv(log.recipientName);
  return emails.map((email, index) => ({
    email,
    name: names[index] || (emails.length === 1 ? names[0] : null) || null,
  }));
};

const EmailLogsPage = () => {
  const { formatDateTime } = useFormattedDateTime();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [retentionDays, setRetentionDays] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const meta = await emailLogsAPI.getMeta();
      setRetentionDays(meta?.retentionDays ?? null);
    } catch {
      // Non-critical
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await emailLogsAPI.getAll({
        page,
        size: PAGE_SIZE,
        search: search || undefined,
        status: status !== 'ALL' ? status : undefined,
      });
      setLogs(data?.content || []);
      setTotalPages(data?.totalPages || 1);
      setTotalElements(data?.totalElements || 0);
    } catch (error) {
      console.error('Failed to load email logs', error);
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;
      const description = status === 401 || status === 403
        ? (serverMessage
          ? `${serverMessage} (${status}). Try signing out and back in.`
          : 'You do not have access to email logs. Stay signed in and ask an admin if this persists.')
        : (serverMessage || 'Failed to load email delivery logs');
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const previewBody = (body) => {
    if (!body) return '—';
    const flat = body.replace(/\s+/g, ' ').trim();
    return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              Email Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Outbound notification emails and calendar invitations
              {retentionDays != null && (
                <> · retained for {retentionDays} day{retentionDays === 1 ? '' : 's'}</>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search subject, recipient, body, or meeting link…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setPage(0);
                  setStatus(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={applySearch}>Search</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading email logs…
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No email logs found.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Sent at</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="hidden lg:table-cell">Preview</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(log)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {log.sentAt ? formatDateTime(log.sentAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sourceBadge(log.source)}>
                            {log.source === 'CALENDAR_INVITE' ? (
                              <CalendarDays className="w-3 h-3 mr-1" />
                            ) : (
                              <Mail className="w-3 h-3 mr-1" />
                            )}
                            {sourceLabel(log.source)}
                          </Badge>
                          {(log.hasMeetingLink || log.meetingLink) && (
                            <div className="mt-1 text-[11px] text-sky-700 inline-flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Meet link
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{log.recipients}</div>
                          {log.recipientName && (
                            <div className="text-xs text-muted-foreground">{log.recipientName}</div>
                          )}
                          {(log.recipientCount ?? 1) > 1 && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {log.recipientCount} recipients
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px] truncate">{log.subject}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[280px]">
                          {previewBody(log.body)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(log);
                            }}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && totalElements > 0 && (
              <div className="flex items-center justify-between gap-2 mt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4">
            <div className="flex items-start gap-3 pr-2">
              <div className="mt-0.5 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {selected?.source === 'CALENDAR_INVITE'
                  ? <CalendarDays className="w-5 h-5 text-primary" />
                  : <Mail className="w-5 h-5 text-primary" />}
              </div>
              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-lg leading-snug">
                  {selected?.subject || 'Email details'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Email delivery details for {selected?.subject || 'selected message'}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className={statusBadge(selected?.status)}>
                    {selected?.status || '—'}
                  </Badge>
                  <Badge variant="outline" className={sourceBadge(selected?.source)}>
                    {sourceLabel(selected?.source)}
                  </Badge>
                  {selected?.sentAt && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTime(selected.sentAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {selected && (() => {
            const recipients = buildRecipientList(selected);
            const { intro, details } = parseEmailBody(selected.body);
            const meetingLink = selected.meetingLink?.trim() || null;
            return (
              <DialogBody className="px-6 pb-6 space-y-5">
                <div className="rounded-xl border bg-slate-50/80 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-white/70">
                    <div className="flex items-start gap-3">
                      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground pt-1.5">
                        To
                      </span>
                      <div className="flex flex-wrap gap-2 min-w-0">
                        {recipients.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          recipients.map((recipient) => (
                            <div
                              key={recipient.email}
                              className="inline-flex items-center gap-2 rounded-full border bg-white px-2.5 py-1 max-w-full"
                            >
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                                {(recipient.name || recipient.email).charAt(0).toUpperCase()}
                              </span>
                              <span className="min-w-0">
                                {recipient.name && (
                                  <span className="block text-xs font-medium leading-tight truncate">
                                    {recipient.name}
                                  </span>
                                )}
                                <span className="block text-[11px] text-muted-foreground leading-tight truncate">
                                  {recipient.email}
                                </span>
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {(selected.recipientCount ?? recipients.length) > 1 && (
                      <p className="mt-2 ml-[3.25rem] text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {selected.recipientCount ?? recipients.length} recipients
                      </p>
                    )}
                  </div>

                  <div className="px-4 py-3 border-b bg-white/70">
                    <div className="flex items-start gap-3">
                      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">
                        Subject
                      </span>
                      <p className="text-sm font-medium leading-snug">{selected.subject}</p>
                    </div>
                  </div>

                  {meetingLink && (
                    <div className="px-4 py-3 border-b bg-sky-50/70">
                      <div className="flex items-start gap-3">
                        <span className="w-10 shrink-0 text-xs font-medium text-sky-700 pt-0.5 inline-flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-sky-800 mb-0.5">Meeting link</p>
                          <a
                            href={meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-sky-700 underline break-all hover:text-sky-900"
                          >
                            {meetingLink}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-5 bg-white">
                    <div className="space-y-4">
                      {intro.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-relaxed text-foreground/90">
                          {paragraph}
                        </p>
                      ))}

                      {details.length > 0 && (
                        <dl className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                          {details.map(({ label, value }) => (
                            <div
                              key={`${label}-${value}`}
                              className="grid grid-cols-[7.5rem_1fr] gap-3 px-3.5 py-2.5 bg-slate-50/60"
                            >
                              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground self-center">
                                {label}
                              </dt>
                              <dd className="text-sm font-medium text-foreground break-all">
                                {label.toLowerCase() === 'meeting link' ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sky-700 underline"
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  value
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {!intro.length && !details.length && (
                        <p className="text-sm text-muted-foreground">No message body.</p>
                      )}
                    </div>
                  </div>
                </div>

                {selected.errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">
                        Delivery error
                      </p>
                      <p className="text-sm text-red-700">{selected.errorMessage}</p>
                    </div>
                  </div>
                )}
              </DialogBody>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EmailLogsPage;
