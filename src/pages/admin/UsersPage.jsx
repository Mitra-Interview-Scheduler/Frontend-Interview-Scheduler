import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Plus, Search, Trash2, UserX, UserCheck,
  Loader2, RefreshCw, ShieldAlert, User, Mail, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { authAPI, usersAPI } from '@/services/api'; 
import UserRoleStatusDialog from './components/UserRoleStatusDialog';
// ─── constants ───────────────────────────────────────────────────────────────

const ROOT_KEY = import.meta.env.VITE_ROOT_KEY ?? "root"; 

const ROLE_META = {
  ADMIN:       { label: 'Admin',       dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  HR:          { label: 'HR',          dot: 'bg-sky-500',    badge: 'bg-sky-100 text-sky-700 border-sky-200'          },
  INTERVIEWER: { label: 'Interviewer', dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const roleBadge = (r) => ROLE_META[r]?.badge ?? 'bg-muted text-muted-foreground';
const activeBadge = (a) => a !== false
  ? 'bg-green-100 text-green-700 border-green-200'
  : 'bg-gray-100 text-gray-400 border-gray-200';

const initials = (u) =>
  `${u.firstName?.[0] ?? u.email[0]}${u.lastName?.[0] ?? ''}`.toUpperCase();

// ─── Admin-delete guard ───────────────────────────────────────────────────────

function AdminDeleteGuard({ open, userName, onClose, onConfirm }) {
  const [key, setKey]     = useState('');
  const [err, setErr]     = useState('');

  const reset = () => { setKey(''); setErr(''); };

  const handleClose = () => { reset(); onClose(); };

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
              <DialogTitle className="text-base leading-tight">Delete Admin Account</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 leading-snug">
                <span className="font-medium text-foreground">{userName}</span> has admin privileges
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            Admin accounts are protected. Enter the root key to permanently delete this account.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="root-key" className="text-sm">Root Key</Label>
            <Input
              id="root-key"
              type="password"
              placeholder="Enter root key…"
              value={key}
              onChange={(e) => { setKey(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              className={err ? 'border-red-400 focus-visible:ring-red-300' : ''}
              autoFocus
            />
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={!key}>
            Delete Admin
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
      await authAPI.register({ email, password, firstName, lastName, role });
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
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="min-w-[120px]">
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Registering…</>
              : 'Register User'}
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [guardTarget, setGuardTarget] = useState(null); // user pending admin-delete guard
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await usersAPI.getAll());
    } catch (err) {
      toast({ title: 'Failed to load users', description: err.response?.data?.message ?? err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
    const q    = search.toLowerCase();
    return (name.includes(q) || u.email.toLowerCase().includes(q))
        && (roleFilter === 'ALL' || u.role === roleFilter);
  });

  const handleToggle = async (user) => {
    setActionId(user.id);
    try {
      await usersAPI.toggleStatus(user.id);
      setUsers((p) => p.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
      toast({ title: 'Status updated' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message ?? err.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  const initiateDelete = (user) => {
    if (user.role === 'ADMIN') { setGuardTarget(user); }
    else                        { executeDelete(user.id); }
  };

  const executeDelete = async (id) => {
    setGuardTarget(null);
    setActionId(id);
    try {
      await usersAPI.delete(id);
      setUsers((p) => p.filter((u) => u.id !== id));
      toast({ title: 'User deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message ?? err.message, variant: 'destructive' });
    } finally { setActionId(null); }
  };

  const openDetails = (user) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const handleUserSaved = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)));
    setSelectedUser((prev) => (prev?.id === updatedUser.id ? { ...prev, ...updatedUser } : prev));
  };

  const counts = {
    ALL:         users.length,
    ADMIN:       users.filter((u) => u.role === 'ADMIN').length,
    HR:          users.filter((u) => u.role === 'HR').length,
    INTERVIEWER: users.filter((u) => u.role === 'INTERVIEWER').length,
  };

  const FILTERS = [
    { label: 'All',         value: 'ALL' },
    { label: 'Admin',       value: 'ADMIN' },
    { label: 'HR',          value: 'HR' },
    { label: 'Interviewer', value: 'INTERVIEWER' },
  ];

  return (
    <Layout>
      <div className="space-y-5 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {counts.ALL} total · {users.filter((u) => u.active !== false).length} active
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Add User
            </Button>
          </div>
        </div>

        {/* Filter pills + search row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setRoleFilter(f.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-all
                  ${roleFilter === f.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'}`}
              >
                {f.label}
                <span className="ml-1.5 opacity-60 text-xs">{counts[f.value]}</span>
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm w-52"
            />
          </div>
        </div>

        {/* List */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">No users found.</p>
            ) : (
              <div className="divide-y">
                {filtered.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => openDetails(user)}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">{initials(user)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 h-4 border font-medium ${roleBadge(user.role)}`}>
                          {ROLE_META[user.role]?.label ?? user.role}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${activeBadge(user.active)}`}>
                          {user.active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>

                    {/* Actions — visible on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        disabled={actionId === user.id}
                        onClick={(e) => { e.stopPropagation(); handleToggle(user); }}
                        title={user.active !== false ? 'Deactivate' : 'Activate'}
                      >
                        {actionId === user.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : user.active !== false
                            ? <UserX className="w-3.5 h-3.5" />
                            : <UserCheck className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-red-500"
                        disabled={actionId === user.id}
                        onClick={(e) => { e.stopPropagation(); initiateDelete(user); }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RegisterDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchUsers} />

      <UserRoleStatusDialog
        open={detailsOpen}
        user={selectedUser}
        onOpenChange={setDetailsOpen}
        onSave={handleUserSaved}
      />

      <AdminDeleteGuard
        open={!!guardTarget}
        userName={guardTarget ? `${guardTarget.firstName} ${guardTarget.lastName}` : ''}
        onClose={() => setGuardTarget(null)}
        onConfirm={() => executeDelete(guardTarget?.id)}
      />
    </Layout>
  );
}