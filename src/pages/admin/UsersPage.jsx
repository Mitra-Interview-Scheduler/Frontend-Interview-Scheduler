import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Trash2, UserCheck, Pencil,
  RefreshCw, ShieldAlert, User, Mail, Lock, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { authAPI, usersAPI } from '@/services/api'; 
import UserRoleStatusDialog from './components/UserRoleStatusDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner, LoadingSwap } from '@/components/ui/loading';
import { TableSkeleton } from '@/components/ui/page-skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getInitial } from '@/lib/personUtils';
import { sortRoles } from '@/lib/roleHelpers';
import { env } from '@/config/env';

// ─── constants ───────────────────────────────────────────────────────────────

const ROOT_KEY = env.ROOT_KEY;

const ROLE_META = {
  ADMIN:       { label: 'Admin',       dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  HR:          { label: 'HR',          dot: 'bg-sky-500',    badge: 'bg-sky-100 text-sky-700 border-sky-200'          },
  INTERVIEWER: { label: 'Interviewer', dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const roleBadge = (r) => ROLE_META[r]?.badge ?? 'bg-muted text-muted-foreground';
const activeBadge = (a) => a !== false
  ? 'bg-green-100 text-green-700 border-green-200'
  : 'bg-gray-100 text-gray-400 border-gray-200';
const USERS_PER_PAGE = 10;

const initials = (u) =>
  `${u.firstName?.[0] ?? u.email[0]}${u.lastName?.[0] ?? ''}`.toUpperCase();

// ─── Admin-delete guard ───────────────────────────────────────────────────────

function AdminDeactivateGuard({ open, userName, onClose, onConfirm, loading = false }) {
  const [key, setKey]     = useState('');
  const [err, setErr]     = useState('');

  const reset = () => { setKey(''); setErr(''); };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleConfirm = () => {
    if (key !== ROOT_KEY) { setErr('Incorrect root key.'); return; }
    reset();
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-base leading-tight">Deactivate Admin Account</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 leading-snug">
                <span className="font-medium text-foreground">{userName}</span> has admin privileges
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            Admin accounts are protected. Enter the root key to deactivate this account.
            You can reactivate them later from User Management.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="root-key" className="text-sm">Root Key</Label>
            <Input
              id="root-key"
              type="password"
              placeholder="Enter root key…"
              value={key}
              onChange={(e) => { setKey(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleConfirm()}
              className={err ? 'border-red-400 focus-visible:ring-red-300' : ''}
              disabled={loading}
              autoFocus
            />
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={!key || loading} loading={loading}>
            Deactivate Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Register dialog ──────────────────────────────────────────────────────────

const EMPTY = { firstName: '', lastName: '', email: '', password: '', role: '' };

function RegisterDialog({ open, onOpenChange, onSuccess }) {
  const [form, setForm]         = useState(EMPTY);
  const [error, setError]       = useState('');
  const [submitting, setSubmit] = useState(false);

  const set = (field) => (val) => { setForm((f) => ({ ...f, [field]: val })); setError(''); };

  const handleClose = () => { setForm(EMPTY); setError(''); onOpenChange(false); };

  const handleSubmit = async () => {
    const { firstName, lastName, email, password, role } = form;
    if (!firstName || !lastName || !email || !password || !role) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSubmit(true);
    try {
      const registered = await authAPI.register({ email, password, firstName, lastName });
      if (role && role !== 'INTERVIEWER' && registered?.id) {
        await usersAPI.updateRoles(registered.id, [role]);
      }
      toast({ title: 'User registered', description: `${firstName} ${lastName} added successfully.` });
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Registration failed.');
    } finally {
      setSubmit(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* 
        Use sm:max-w-lg to give the dialog a proper fixed width on desktop.
        The dialog itself handles centering — no display tricks needed.
      */}
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">

        {/* Header band */}
        <div className="px-6 py-5 border-b bg-muted/40">
          <DialogTitle className="text-base font-semibold">Register New User</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Creates an account immediately with the selected role.
          </DialogDescription>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-4">

          {/* Name row — two columns */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'firstName', label: 'First Name', placeholder: 'John',  Icon: User },
              { id: 'lastName',  label: 'Last Name',  placeholder: 'Smith', Icon: User },
            ].map(({ id, label, placeholder, Icon }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label} <span className="text-red-400 normal-case">*</span>
                </Label>
                <div className="relative">
                  <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id={id}
                    type="text"
                    placeholder={placeholder}
                    value={form[id]}
                    onChange={(e) => set(id)(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email <span className="text-red-400 normal-case">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="john@mitra.com"
                value={form.email}
                onChange={(e) => set('email')(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Password <span className="text-red-400 normal-case">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                autoComplete="new-password"
                onChange={(e) => set('password')(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Role <span className="text-red-400 normal-case">*</span>
            </Label>
            <Select value={form.role} onValueChange={set('role')}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_META).map(([value, { label, dot }]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quick-select chips under the dropdown */}
            <div className="flex gap-1.5 pt-0.5">
              {Object.entries(ROLE_META).map(([value, { label, badge }]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('role')(value)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all
                    ${form.role === value
                      ? badge + ' ring-2 ring-offset-1 ring-primary/20'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Inline error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting} className="min-w-[120px]">
            Register User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState(null);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  // { action: 'deactivate' | 'reactivate', user, viaDelete?: boolean }
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [guardTarget, setGuardTarget] = useState(null); // admin pending root-key deactivate
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isMutating, setIsMutating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersAPI.getAll(
        { page: currentPage - 1, size: USERS_PER_PAGE },
        { search, role: roleFilter, status: statusFilter }
      );
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(data.length);
        setTotalPages(1);
      } else {
        setUsers(data?.content || []);
        setTotalUsers(data?.totalElements ?? 0);
        setTotalPages(data?.totalPages || 1);
      }
    } catch (err) {
      toast({ title: 'Failed to load users', description: err.response?.data?.message ?? err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter, statusFilter]);

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') setSortDir('desc');
    else if (sortDir === 'desc') { setSortKey(null); setSortDir('asc'); }
    else setSortDir('asc');
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const startIndex = (currentPage - 1) * USERS_PER_PAGE;

  const displayedUsers = React.useMemo(() => {
    const list = (users || []).slice();
    if (sortKey) {
      list.sort((a, b) => {
        let va = '';
        let vb = '';
        switch (sortKey) {
          case 'name':
            va = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            vb = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
            break;
          case 'email':
            va = (a.email || '').toLowerCase();
            vb = (b.email || '').toLowerCase();
            break;
          case 'status':
            va = a.active !== false ? 'ACTIVE' : 'INACTIVE';
            vb = b.active !== false ? 'ACTIVE' : 'INACTIVE';
            break;
          case 'roles':
            va = (a.roles || [a.role]).join(',').toLowerCase();
            vb = (b.roles || [b.role]).join(',').toLowerCase();
            break;
          default:
            va = '';
            vb = '';
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [users, sortKey, sortDir]);

  const userDisplayName = (user) =>
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'this user';

  const isAdminUser = (user) => {
    const roles = user?.roles || (user?.role ? [user.role] : []);
    return roles.includes('ADMIN');
  };

  const applyUserUpdate = (updated) => {
    if (!updated?.id) return;
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    setSelectedUser((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const initiateStatusChange = (user, action) => {
    if (action === 'deactivate' && isAdminUser(user)) {
      setGuardTarget(user);
      return;
    }
    setConfirmTarget({ action, user });
  };

  const initiateDelete = (user) => {
    if (user.active === false) {
      toast({ title: 'User already inactive', description: 'This user is already deactivated.' });
      return;
    }
    if (isAdminUser(user)) {
      setGuardTarget(user);
      return;
    }
    setConfirmTarget({ action: 'deactivate', user, viaDelete: true });
  };

  const executeDeactivate = async (user) => {
    if (!user?.id) return;
    setIsMutating(true);
    setActionId(user.id);
    try {
      const updated = await usersAPI.delete(user.id);
      applyUserUpdate(updated ?? { ...user, active: false });
      toast({
        title: 'User deactivated',
        description: `${userDisplayName(user)} can no longer sign in. You can reactivate them anytime.`,
      });
      setConfirmTarget(null);
      setGuardTarget(null);
      await fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message ?? err.message, variant: 'destructive' });
    } finally {
      setActionId(null);
      setIsMutating(false);
    }
  };

  const executeReactivate = async (user) => {
    if (!user?.id) return;
    setIsMutating(true);
    setActionId(user.id);
    try {
      // Ensure we activate (toggle flips; only call when currently inactive)
      const updated = await usersAPI.toggleStatus(user.id);
      applyUserUpdate(updated ?? { ...user, active: true });
      toast({
        title: 'User reactivated',
        description: `${userDisplayName(user)} can sign in again.`,
      });
      setConfirmTarget(null);
      await fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message ?? err.message, variant: 'destructive' });
    } finally {
      setActionId(null);
      setIsMutating(false);
    }
  };

  const handleConfirm = async () => {
    const target = confirmTarget;
    if (!target?.user) return;
    if (target.action === 'reactivate') {
      await executeReactivate(target.user);
    } else {
      await executeDeactivate(target.user);
    }
  };

  const openDetails = (user) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const handleUserSaved = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)));
    setSelectedUser((prev) => (prev?.id === updatedUser.id ? { ...prev, ...updatedUser } : prev));
  };

  const counts = { ALL: totalUsers, ADMIN: null, HR: null, INTERVIEWER: null };

  const FILTERS = [
    { label: 'All',         value: 'ALL' },
    { label: 'Admin',       value: 'ADMIN' },
    { label: 'HR',          value: 'HR' },
    { label: 'Interviewer', value: 'INTERVIEWER' },
  ];

  return (
    <Layout>
      <div  className="space-y-6">

        <PageHeader
          title="User Management"
          description="Manage and track all users with access to the system, including their roles and activity status."
          actions={
            <>
              <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Add User
              </Button>
            </>
          }
        />

        {/* Filter pills + search row */}
        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Role Filter Select */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48 h-10">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    All Roles
                  </SelectItem>
                  {FILTERS.filter(f => f.value !== 'ALL').map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Status Filter Select */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          </Card>

          <div className="space-y-2 mt-2">
            <LoadingSwap
              loading={loading && users.length === 0}
              fallback={<TableSkeleton rows={6} columns={5} />}
            >
            {displayedUsers.length === 0 ? (
              <div className="rounded-lg border bg-card">
                <EmptyState icon={Users} title="No users found" compact />
              </div>
            ) : (
            <>
            <div className="hidden lg:block rounded-lg border bg-card">
              <Table className="table-fixed" wrapperClassName="max-h-[calc(100vh-24rem)] overflow-auto">
                <TableHeader sticky>
                  <TableRow>
                    <TableHead className="w-[30%] cursor-pointer" onClick={() => toggleSort('name')}>Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="w-[30%] cursor-pointer" onClick={() => toggleSort('email')}>Email {sortKey === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="w-[15%] cursor-pointer" onClick={() => toggleSort('status')}>Status {sortKey === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="w-[15%] cursor-pointer" onClick={() => toggleSort('roles')}>Roles {sortKey === 'roles' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group cursor-pointer hover:bg-muted/40"
                      onClick={() => openDetails(user)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 border shrink-0">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                              {getInitial(user.firstName, user.lastName, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-medium border ${activeBadge(user.active)}`}>
                            {user.active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sortRoles(user.roles || [user.role]).map((r) => (
                            <Badge key={r} variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium border ${ROLE_META[r]?.badge}`}>
                              {ROLE_META[r]?.label || r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); openDetails(user); }}
                            title="Edit User"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {user.active !== false ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              onClick={(e) => { e.stopPropagation(); initiateDelete(user); }}
                              disabled={actionId === user.id || isMutating}
                              title="Deactivate User"
                            >
                              {actionId === user.id ? <Spinner size="xs" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                initiateStatusChange(user, 'reactivate');
                              }}
                              disabled={actionId === user.id || isMutating}
                              title="Reactivate User"
                            >
                              {actionId === user.id ? <Spinner size="xs" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 lg:hidden">
              {displayedUsers.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group"
                >
                  <Card
                    className="hover:shadow-md transition-all cursor-pointer border border-border bg-card"
                    onClick={() => openDetails(user)}
                  >
                    <CardContent className="p-3">
                      <div className="grid grid-cols-12 gap-3 md:gap-4 items-center w-full">
                        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                          <Avatar className="h-9 w-9 border shrink-0">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                              {getInitial(user.firstName, user.lastName, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">{user.firstName} {user.lastName}</span>
                        </div>
                        <div className="col-span-12 md:col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="col-span-6 md:col-span-2 flex md:justify-center">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-medium border ${activeBadge(user.active)}`}>
                            {user.active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-wrap gap-1">
                          {sortRoles(user.roles || [user.role]).map((r) => (
                            <Badge key={r} variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium border ${ROLE_META[r]?.badge}`}>
                              {ROLE_META[r]?.label || r}
                            </Badge>
                          ))}
                        </div>
                        <div className="col-span-12 md:col-span-2 flex justify-end items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); openDetails(user); }}
                            title="Edit User"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {user.active !== false ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              onClick={(e) => { e.stopPropagation(); initiateDelete(user); }}
                              disabled={actionId === user.id || isMutating}
                              title="Deactivate User"
                            >
                              {actionId === user.id ? <Spinner size="xs" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                initiateStatusChange(user, 'reactivate');
                              }}
                              disabled={actionId === user.id || isMutating}
                              title="Reactivate User"
                            >
                              {actionId === user.id ? <Spinner size="xs" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            </>
            )}
            </LoadingSwap>
          </div>

        {!loading && totalUsers > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + USERS_PER_PAGE, totalUsers)} of {totalUsers}
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
      </div>

      <RegisterDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchUsers} />

      <UserRoleStatusDialog
        open={detailsOpen}
        user={selectedUser}
        onOpenChange={setDetailsOpen}
        onSave={handleUserSaved}
      />

      <AdminDeactivateGuard
        open={!!guardTarget}
        userName={guardTarget ? `${guardTarget.firstName} ${guardTarget.lastName}` : ''}
        onClose={() => setGuardTarget(null)}
        onConfirm={() => executeDeactivate(guardTarget)}
        loading={isMutating}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => { if (!open && !isMutating) setConfirmTarget(null); }}
        title={
          confirmTarget?.action === 'reactivate'
            ? 'Reactivate user?'
            : 'Deactivate user?'
        }
        description={
          confirmTarget?.user
            ? confirmTarget.action === 'reactivate'
              ? `Reactivate "${userDisplayName(confirmTarget.user)}"? They will be able to sign in again.`
              : `Deactivate "${userDisplayName(confirmTarget.user)}"? They will lose access until an admin reactivates them.`
            : undefined
        }
        confirmLabel={confirmTarget?.action === 'reactivate' ? 'Reactivate' : 'Deactivate'}
        destructive={confirmTarget?.action !== 'reactivate'}
        onConfirm={handleConfirm}
        loading={isMutating}
      />
    </Layout>
  );
}