import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import DepartmentAPI from '@/services/departmentAPI';
import { tierAPI } from '@/services/tierAPI';
import { departmentUsersAPI } from '@/services/departmentUsersAPI';
import { assessmentAPI } from '@/services/assessmentAPI';
import { toast } from '@/hooks/use-toast';

const AssignAssessmentReviewersDialog = ({
  open,
  onOpenChange,
  scheduleId,
  alreadyAssignedIds = [],
  onAssigned,
}) => {
  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [minTierId, setMinTierId] = useState('');
  const [people, setPeople] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setDepartmentId('');
    setMinTierId('');
    setPeople([]);
    setSelectedIds([]);
    setTiers([]);
    let active = true;
    DepartmentAPI.getAllDepartments()
      .then((data) => {
        if (active) setDepartments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setDepartments([]);
      });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!departmentId) {
      setTiers([]);
      setMinTierId('');
      return undefined;
    }
    let active = true;
    tierAPI.getTiersByDepartment(departmentId)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data)
          ? [...data].sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
          : [];
        setTiers(list);
      })
      .catch(() => {
        if (active) setTiers([]);
      });
    return () => { active = false; };
  }, [departmentId]);

  const minTierOrder = useMemo(() => {
    if (!minTierId) return null;
    const tier = tiers.find((t) => String(t.id) === String(minTierId));
    return tier?.tierOrder ?? null;
  }, [minTierId, tiers]);

  useEffect(() => {
    if (!open || !departmentId) {
      setPeople([]);
      return undefined;
    }
    let active = true;
    setLoadingPeople(true);
    departmentUsersAPI.getUsers({
      departmentId,
      role: 'INTERVIEWER',
      minTierOrder: minTierOrder ?? undefined,
    })
      .then((data) => {
        if (active) setPeople(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setPeople([]);
      })
      .finally(() => {
        if (active) setLoadingPeople(false);
      });
    return () => { active = false; };
  }, [open, departmentId, minTierOrder]);

  const assignedSet = useMemo(
    () => new Set((alreadyAssignedIds || []).map(Number)),
    [alreadyAssignedIds],
  );

  const togglePerson = (id) => {
    const num = Number(id);
    if (assignedSet.has(num)) return;
    setSelectedIds((prev) => (
      prev.includes(num) ? prev.filter((x) => x !== num) : [...prev, num]
    ));
  };

  const handleAssign = async () => {
    if (!scheduleId || selectedIds.length === 0) return;
    setSaving(true);
    try {
      const nextIds = [...new Set([...alreadyAssignedIds.map(Number), ...selectedIds])];
      await assessmentAPI.assignReviewers(scheduleId, nextIds);
      toast({
        title: 'Reviewers assigned',
        description: `${selectedIds.length} reviewer${selectedIds.length === 1 ? '' : 's'} notified by email and inbox.`,
      });
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign reviewers',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-700" />
            Assign reviewers
          </DialogTitle>
          <DialogDescription>
            Pick people across departments and tiers. Newly assigned reviewers get an email and an internal notification.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={departmentId || undefined} onValueChange={setDepartmentId} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Min. tier (optional)</Label>
              <Select
                value={minTierId || 'ANY'}
                onValueChange={(v) => setMinTierId(v === 'ANY' ? '' : v)}
                disabled={saving || !departmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any tier</SelectItem>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      Tier {t.tierOrder}: {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border max-h-64 overflow-y-auto p-2 space-y-1">
            {!departmentId && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                Select a department to list interviewers.
              </p>
            )}
            {departmentId && loadingPeople && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading people…
              </div>
            )}
            {departmentId && !loadingPeople && people.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                No interviewers match these filters.
              </p>
            )}
            {people.map((person) => {
              const id = Number(person.id);
              const already = assignedSet.has(id);
              const checked = already || selectedIds.includes(id);
              return (
                <label
                  key={person.id}
                  className={`flex items-start gap-2 rounded-lg px-2 py-2 text-sm ${
                    already ? 'opacity-60 cursor-default' : 'cursor-pointer hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={already || saving}
                    onCheckedChange={() => togglePerson(id)}
                  />
                  <span className="min-w-0">
                    <span className="font-medium block truncate">{person.fullName}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {[person.designationName, person.tierName && `Tier ${person.tierOrder ?? ''}`.trim(), person.email]
                        .filter(Boolean)
                        .join(' · ')}
                      {already ? ' · Already assigned' : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={saving || selectedIds.length === 0} className="min-w-[130px]">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning…</>
            ) : (
              `Assign (${selectedIds.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignAssessmentReviewersDialog;
