import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Award,
  Briefcase,
  Globe2,
  Mail,
  TrendingUp,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { usersAPI } from '@/services/api';
import profileAPI from '@/services/profileService';
import { domainAPI } from '@/services/domainAPI';
import DomainMultiSelect from '@/components/DomainMultiSelect';
import { getInitial } from '@/lib/personUtils';
import { getNormalizedRoles, sortRoles } from '@/lib/roleHelpers';

const ROLE_OPTIONS = ['ADMIN', 'HR', 'INTERVIEWER'];

const ROLE_META = {
  ADMIN: { label: 'Admin', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  HR: { label: 'HR', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
  INTERVIEWER: { label: 'Interviewer', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Full system access, manage users and settings',
  HR: 'Manage candidates and interview scheduling',
  INTERVIEWER: 'Manage availability and accept interviews',
};

const sectionLabelClass = 'text-[11px] uppercase tracking-wider font-semibold text-slate-500';
const fieldLabelClass = 'text-sm font-semibold text-slate-800';

function UserRoleStatusDialog({ open, user, onOpenChange, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    roles: [],
    active: true,
  });
  const [professionalForm, setProfessionalForm] = useState({
    departmentId: null,
    designationId: null,
    selectedTierId: null,
    yearsOfExperience: 0,
    domainIds: [],
  });
  const [departments, setDepartments] = useState([]);
  const [allDomains, setAllDomains] = useState([]);
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);

  const loadTiersForDepartment = async (departmentId) => {
    if (!departmentId) {
      setTiersForSelectedDept([]);
      return;
    }
    try {
      const tiersData = await profileAPI.getTiersByDepartment(departmentId);
      setTiersForSelectedDept(tiersData.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch {
      setTiersForSelectedDept([]);
    }
  };

  const loadDesignationsForTier = async (tierId) => {
    if (!tierId) {
      setDesignationsForSelectedTier([]);
      return;
    }
    try {
      const designationsData = await profileAPI.getDesignationsByTier(tierId);
      setDesignationsForSelectedTier(designationsData.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch {
      setDesignationsForSelectedTier([]);
    }
  };

  const resetProfessionalForm = async (selectedUser) => {
    const departmentId = selectedUser.departmentId ?? null;
    const designationId = selectedUser.designationId ?? null;
    const selectedTierId = selectedUser.tierId ?? null;

    setProfessionalForm({
      departmentId,
      designationId,
      selectedTierId,
      yearsOfExperience: selectedUser.yearsOfExperience ?? 0,
      domainIds: (selectedUser.domains || []).map((d) => d.id),
    });

    if (departmentId) {
      await loadTiersForDepartment(departmentId);
    } else {
      setTiersForSelectedDept([]);
    }

    if (selectedTierId) {
      await loadDesignationsForTier(selectedTierId);
    } else {
      setDesignationsForSelectedTier([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    profileAPI.getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
    domainAPI.getAllDomains()
      .then(setAllDomains)
      .catch(() => setAllDomains([]));
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    setEditing(false);
    setSaving(false);
    setError('');
    const userRoles = getNormalizedRoles(user);
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      roles: userRoles,
      active: user.active !== false,
    });
    resetProfessionalForm(user);
  }, [open, user]);

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,
      roles: sortRoles(
        prev.roles.includes(role)
          ? prev.roles.filter((r) => r !== role)
          : [...prev.roles, role],
      ),
    }));
    setError('');
  };

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const resetForm = () => {
    if (!user) return;
    const userRoles = getNormalizedRoles(user);
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      roles: userRoles,
      active: user.active !== false,
    });
    resetProfessionalForm(user);
    setError('');
  };

  const handleCancelEdit = () => {
    resetForm();
    setEditing(false);
  };

  const handleDepartmentChange = async (deptId) => {
    if (deptId === 'NONE') {
      setProfessionalForm({
        departmentId: null,
        designationId: null,
        selectedTierId: null,
        yearsOfExperience: professionalForm.yearsOfExperience,
        domainIds: professionalForm.domainIds,
      });
      setTiersForSelectedDept([]);
      setDesignationsForSelectedTier([]);
      return;
    }

    const departmentId = parseInt(deptId, 10);
    setProfessionalForm((prev) => ({
      ...prev,
      departmentId,
      designationId: null,
      selectedTierId: null,
    }));
    setDesignationsForSelectedTier([]);
    await loadTiersForDepartment(departmentId);
  };

  const handleTierChange = async (tierId) => {
    if (tierId === 'NONE' || !tierId) {
      setProfessionalForm((prev) => ({
        ...prev,
        selectedTierId: null,
        designationId: null,
      }));
      setDesignationsForSelectedTier([]);
      return;
    }

    const id = parseInt(tierId, 10);
    setProfessionalForm((prev) => ({
      ...prev,
      selectedTierId: id,
      designationId: prev.designationId && prev.selectedTierId === id ? prev.designationId : null,
    }));
    await loadDesignationsForTier(id);
  };

  const handleDesignationChange = (designationId) => {
    if (designationId === 'NONE') {
      setProfessionalForm((prev) => ({ ...prev, designationId: null }));
      return;
    }
    setProfessionalForm((prev) => ({
      ...prev,
      designationId: parseInt(designationId, 10),
    }));
  };

  const basicInfoChanged = () => {
    if (!user) return false;
    return (
      (form.firstName ?? '').trim() !== (user.firstName ?? '').trim()
      || (form.lastName ?? '').trim() !== (user.lastName ?? '').trim()
    );
  };

  const professionalDetailsChanged = () => {
    if (!user) return false;
    const userDomainIds = (user.domains || []).map((d) => d.id).sort();
    const formDomainIds = [...(professionalForm.domainIds || [])].sort();
    return (
      (professionalForm.departmentId ?? null) !== (user.departmentId ?? null)
      || (professionalForm.designationId ?? null) !== (user.designationId ?? null)
      || (professionalForm.yearsOfExperience ?? 0) !== (user.yearsOfExperience ?? 0)
      || JSON.stringify(formDomainIds) !== JSON.stringify(userDomainIds)
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const userRoles = getNormalizedRoles(user);
    const sortedFormRoles = sortRoles(form.roles);
    const rolesChanged =
      JSON.stringify(sortedFormRoles) !== JSON.stringify(userRoles);
    const statusChanged = form.active !== (user.active !== false);
    const basicChanged = basicInfoChanged();
    const professionalChanged = professionalDetailsChanged();

    if (!rolesChanged && !statusChanged && !basicChanged && !professionalChanged) {
      setEditing(false);
      return;
    }

    if (form.roles.length === 0) {
      setError('User must have at least one role.');
      return;
    }

    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      setError('First name and last name are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let updatedUser = { ...user };

      if (rolesChanged) {
        const rolesResponse = await usersAPI.updateRoles(user.id, sortedFormRoles);
        updatedUser = {
          ...updatedUser,
          ...rolesResponse,
          roles: sortRoles(rolesResponse?.roles ?? sortedFormRoles),
          role: sortRoles(rolesResponse?.roles ?? sortedFormRoles)[0],
        };
      }

      if (statusChanged) {
        const statusResponse = await usersAPI.toggleStatus(user.id);
        updatedUser = {
          ...updatedUser,
          ...statusResponse,
          active: statusResponse?.active ?? form.active,
        };
      }

      if (basicChanged) {
        const basicInfoResponse = await usersAPI.updateBasicInfo(user.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        });
        updatedUser = {
          ...updatedUser,
          ...basicInfoResponse,
        };
      }

      if (professionalChanged) {
        const professionalResponse = await usersAPI.updateProfessionalDetails(user.id, {
          departmentId: professionalForm.departmentId,
          designationId: professionalForm.designationId,
          yearsOfExperience: professionalForm.yearsOfExperience,
          domainIds: professionalForm.domainIds,
        });
        updatedUser = {
          ...updatedUser,
          ...professionalResponse,
        };
      }

      onSave(updatedUser);
      setEditing(false);
      onOpenChange(false);
      toast({
        title: 'User updated',
        description: 'User details saved successfully.',
      });
    } catch (err) {
      setError(
        err.response?.data?.message ?? err.message ?? 'Failed to update user.'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedDepartment = departments.find((d) => d.id === professionalForm.departmentId);
  const selectedDesignation = designationsForSelectedTier.find(
    (d) => d.id === professionalForm.designationId
  );
  const selectedTier = tiersForSelectedDept.find((t) => t.id === professionalForm.selectedTierId);
  const displayFirstName = editing ? form.firstName : user?.firstName;
  const displayLastName = editing ? form.lastName : user?.lastName;
  const displayRoles = editing ? sortRoles(form.roles) : getNormalizedRoles(user);
  const displayActive = editing ? form.active : (user?.active !== false);
  const displayDomains = editing ? [] : (user?.domains || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-xl">User Details</DialogTitle>
              <DialogDescription className="mt-1.5">
                {user
                  ? `Manage personal info, access, roles, and professional details for ${displayFirstName || ''} ${displayLastName || ''}`.trim()
                  : 'Review and update user information'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!user ? (
          <DialogBody className="px-6 py-8 text-sm text-muted-foreground">
            No user selected.
          </DialogBody>
        ) : (
          <DialogBody className="px-6 py-4 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <Avatar className="h-14 w-14 border shrink-0">
                  <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                    {getInitial(displayFirstName, displayLastName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 truncate">
                      {displayFirstName} {displayLastName}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 shrink-0" />
                      {user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0 h-5 font-medium border ${
                        displayActive
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}
                    >
                      {displayActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                    {displayRoles.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className={`text-[10px] px-2 py-0 h-5 font-medium border ${ROLE_META[role]?.badge || ''}`}
                      >
                        {ROLE_META[role]?.label || role}
                      </Badge>
                    ))}
                  </div>
                  {displayDomains.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <Globe2 className="w-3 h-3" />
                        Domains
                      </span>
                      {displayDomains.map((domain) => (
                        <Badge key={domain.id} variant="secondary" className="text-[10px] px-2 py-0 h-5 font-medium">
                          {domain.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className={sectionLabelClass}>Personal Information</p>
                <p className="text-xs text-muted-foreground mt-1">
                  User name details managed by admin
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-first-name" className={fieldLabelClass}>First Name</Label>
                    {editing ? (
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <Input
                          id="user-first-name"
                          value={form.firstName}
                          onChange={(e) => set('firstName')(e.target.value)}
                          disabled={saving}
                          className="h-10 pl-9"
                          placeholder="First name"
                        />
                      </div>
                    ) : (
                      <Input
                        value={user.firstName || '—'}
                        disabled
                        className="h-10 bg-muted"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-last-name" className={fieldLabelClass}>Last Name</Label>
                    {editing ? (
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <Input
                          id="user-last-name"
                          value={form.lastName}
                          onChange={(e) => set('lastName')(e.target.value)}
                          disabled={saving}
                          className="h-10 pl-9"
                          placeholder="Last name"
                        />
                      </div>
                    ) : (
                      <Input
                        value={user.lastName || '—'}
                        disabled
                        className="h-10 bg-muted"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <p className={sectionLabelClass}>Professional Details</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Department, tier, designation, experience, and domains
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={fieldLabelClass}>
                      <span className="inline-flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        Department
                      </span>
                    </Label>
                    {editing ? (
                      <Select
                        value={professionalForm.departmentId?.toString() || 'NONE'}
                        onValueChange={handleDepartmentChange}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={selectedDepartment?.name || user.departmentName || 'Not set'}
                        disabled
                        className="h-10 bg-muted"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={fieldLabelClass}>Years of Experience</Label>
                    <Input
                      type="number"
                      value={professionalForm.yearsOfExperience ?? 0}
                      onChange={(e) => setProfessionalForm((prev) => ({
                        ...prev,
                        yearsOfExperience: parseInt(e.target.value, 10) || 0,
                      }))}
                      disabled={!editing || saving}
                      min={0}
                      max={50}
                      className="h-10"
                    />
                  </div>
                </div>

                {professionalForm.departmentId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label className={fieldLabelClass}>
                        <span className="inline-flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-500" />
                          Tier
                        </span>
                      </Label>
                      {editing ? (
                        <Select
                          value={professionalForm.selectedTierId?.toString() || 'NONE'}
                          onValueChange={handleTierChange}
                          disabled={saving}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {tiersForSelectedDept.map((tier) => (
                              <SelectItem key={tier.id} value={tier.id.toString()}>
                                Tier {tier.tierOrder} - {tier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={selectedTier
                            ? `Tier ${selectedTier.tierOrder} - ${selectedTier.name}`
                            : 'Not set'}
                          disabled
                          className="h-10 bg-muted"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className={fieldLabelClass}>
                        <span className="inline-flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          Designation
                        </span>
                      </Label>
                      {editing ? (
                        <Select
                          value={professionalForm.designationId?.toString() || 'NONE'}
                          onValueChange={handleDesignationChange}
                          disabled={saving || !professionalForm.selectedTierId}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={
                              professionalForm.selectedTierId
                                ? 'Select designation'
                                : 'Select tier first'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {designationsForSelectedTier.map((des) => (
                              <SelectItem key={des.id} value={des.id.toString()}>
                                Level {des.levelOrder} - {des.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={selectedDesignation
                            ? `Level ${selectedDesignation.levelOrder} - ${selectedDesignation.name}`
                            : (user.designationName || 'Not set')}
                          disabled
                          className="h-10 bg-muted"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  {editing ? (
                    <DomainMultiSelect
                      label="Domains"
                      domains={allDomains}
                      selectedIds={professionalForm.domainIds}
                      onChange={(ids) => setProfessionalForm((prev) => ({ ...prev, domainIds: ids }))}
                      disabled={saving}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label className={fieldLabelClass}>
                        <span className="inline-flex items-center gap-2">
                          <Globe2 className="w-4 h-4 text-slate-400" />
                          Domains
                        </span>
                      </Label>
                      {displayDomains.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {displayDomains.map((d) => (
                            <Badge key={d.id} variant="secondary">{d.name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <Input value="Not set" disabled className="h-10 bg-muted" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <p className={sectionLabelClass}>Access & Roles</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Control system permissions and account status
                </p>
              </div>

              <div className={`rounded-xl border border-slate-200 p-5 space-y-4 ${editing ? 'bg-white' : 'bg-muted/40'}`}>
                <div className="space-y-3">
                  <Label className={fieldLabelClass}>Roles</Label>
                  <div className={`space-y-2 p-3 rounded-lg border ${
                    editing
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-muted border-slate-200 opacity-80'
                  }`}>
                    {ROLE_OPTIONS.map((role) => (
                      <div
                        key={role}
                        className={`flex items-start gap-3 ${!editing ? 'pointer-events-none' : ''}`}
                      >
                        <Checkbox
                          id={`user-role-${role}`}
                          checked={form.roles.includes(role)}
                          onCheckedChange={() => toggleRole(role)}
                          disabled={!editing || saving}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`user-role-${role}`}
                            className={`text-sm font-medium ${editing ? 'cursor-pointer' : 'text-muted-foreground cursor-default'}`}
                          >
                            {ROLE_META[role]?.label || role}
                          </Label>
                          <p className={`text-xs ${editing ? 'text-muted-foreground' : 'text-muted-foreground/80'}`}>
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={fieldLabelClass}>Account Status</Label>
                  {editing ? (
                    <Select
                      value={form.active ? 'ACTIVE' : 'INACTIVE'}
                      onValueChange={(v) => set('active')(v === 'ACTIVE')}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form.active ? 'Active' : 'Inactive'}
                      disabled
                      className="h-10 bg-muted"
                    />
                  )}
                </div>
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
          </DialogBody>
        )}

        <DialogFooter className="px-6 py-4 gap-2">
          {editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={saving || !user}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving || !user}
            >
              Close
            </Button>
          )}

          {editing ? (
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!user}
              className="min-w-[110px]"
            >
              Save Changes
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setEditing(true)}
              disabled={saving || !user}
              className="min-w-[110px]"
            >
              Edit User
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserRoleStatusDialog;
