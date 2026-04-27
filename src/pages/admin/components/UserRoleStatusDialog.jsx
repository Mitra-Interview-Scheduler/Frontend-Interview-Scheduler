import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { usersAPI } from '@/services/api';

const ROLE_OPTIONS = ['ADMIN', 'HR', 'INTERVIEWER'];

function UserRoleStatusDialog({ open, user, onOpenChange, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ role: 'INTERVIEWER', active: true });

  useEffect(() => {
    if (!open || !user) return;
    setEditing(false);
    setSaving(false);
    setError('');
    setForm({
      role: user.role ?? 'INTERVIEWER',
      active: user.active !== false,
    });
  }, [open, user]);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const roleChanged = form.role !== user.role;
    const statusChanged = form.active !== (user.active !== false);

    if (!roleChanged && !statusChanged) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError('');

    try {
      let updatedUser = { ...user };

      if (roleChanged) {
        const roleResponse = await usersAPI.updateRole(user.id, form.role);
        updatedUser = { ...updatedUser, ...roleResponse, role: roleResponse?.role ?? form.role };
      }

      if (statusChanged) {
        const statusResponse = await usersAPI.toggleStatus(user.id);
        updatedUser = {
          ...updatedUser,
          ...statusResponse,
          active: statusResponse?.active ?? form.active,
        };
      }

      onSave(updatedUser);
      setEditing(false);
      toast({ title: 'User updated', description: 'Role and status saved successfully.' });
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b bg-muted/40 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-base font-semibold">User Details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Admin can edit only role and status.
            </DialogDescription>
          </div>
          <Button
            size="sm"
            variant={editing ? 'secondary' : 'outline'}
            onClick={() => setEditing((v) => !v)}
            disabled={saving || !user}
          >
            {editing ? 'Cancel Edit' : 'Edit'}
          </Button>
        </div>

        {!user ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">No user selected.</div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">First Name</Label>
                <Input value={user.firstName ?? ''} disabled className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Name</Label>
                <Input value={user.lastName ?? ''} disabled className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input type="email" value={user.email ?? ''} disabled className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</Label>
                <Select value={form.role} onValueChange={set('role')} disabled={!editing || saving}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
                <Select
                  value={form.active ? 'ACTIVE' : 'INACTIVE'}
                  onValueChange={(v) => set('active')(v === 'ACTIVE')}
                  disabled={!editing || saving}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
        )}

        <DialogFooter className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!editing || saving || !user} className="min-w-[110px]">
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserRoleStatusDialog;
