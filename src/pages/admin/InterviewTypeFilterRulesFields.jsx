import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { tierAPI } from '@/services/tierAPI';
import { designationAPI } from '@/services/designationAPI';

export const FILTER_MODE = {
  SAME_AS_CANDIDATE: 'SAME_AS_CANDIDATE',
  FIXED: 'FIXED',
  NONE: 'NONE',
};

export const defaultFilterRules = () => ({
  departmentFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
  fixedDepartmentId: null,
  minYearsExperience: null,
  tierFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
  fixedMinTierId: null,
  designationFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
  fixedMinDesignationId: null,
  domainFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
  fixedDomainIds: [],
  categoryFilterMode: FILTER_MODE.NONE,
  fixedCategoryIds: [],
  technologyFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
  fixedTechnologyIds: [],
});

export const filterRulesFromType = (type) => {
  const rules = type?.filterRules;
  if (!rules) return defaultFilterRules();
  return {
    departmentFilterMode: rules.departmentFilterMode || FILTER_MODE.SAME_AS_CANDIDATE,
    fixedDepartmentId: rules.fixedDepartmentId ?? null,
    minYearsExperience: rules.minYearsExperience ?? null,
    tierFilterMode: rules.tierFilterMode || FILTER_MODE.SAME_AS_CANDIDATE,
    fixedMinTierId: rules.fixedMinTierId ?? null,
    designationFilterMode: rules.designationFilterMode || FILTER_MODE.SAME_AS_CANDIDATE,
    fixedMinDesignationId: rules.fixedMinDesignationId ?? null,
    domainFilterMode: rules.domainFilterMode || FILTER_MODE.SAME_AS_CANDIDATE,
    fixedDomainIds: Array.isArray(rules.fixedDomainIds) ? rules.fixedDomainIds : [],
    categoryFilterMode: rules.categoryFilterMode || FILTER_MODE.NONE,
    fixedCategoryIds: Array.isArray(rules.fixedCategoryIds) ? rules.fixedCategoryIds : [],
    technologyFilterMode: rules.technologyFilterMode || FILTER_MODE.SAME_AS_CANDIDATE,
    fixedTechnologyIds: Array.isArray(rules.fixedTechnologyIds) ? rules.fixedTechnologyIds : [],
  };
};

const ModeSelect = ({ value, onChange, disabled, includeNone = true }) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={FILTER_MODE.SAME_AS_CANDIDATE}>Same as candidate</SelectItem>
      <SelectItem value={FILTER_MODE.FIXED}>Fixed (choose below)</SelectItem>
      {includeNone && <SelectItem value={FILTER_MODE.NONE}>None (no filter)</SelectItem>}
    </SelectContent>
  </Select>
);

const IdCheckboxList = ({ items, selectedIds, onChange, disabled, labelKey = 'name', idKey = 'id', emptyMessage }) => (
  <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-1.5">
    {items.length === 0 ? (
      <p className="text-xs text-muted-foreground px-1 py-2">
        {emptyMessage || 'No options available.'}
      </p>
    ) : (
      items.map((item) => {
        const id = item[idKey];
        const checked = selectedIds.includes(id);
        return (
          <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(v) => {
                if (v === true) onChange([...selectedIds, id]);
                else onChange(selectedIds.filter((x) => x !== id));
              }}
            />
            <span className="truncate">{item[labelKey] || item.label || item.code || id}</span>
          </label>
        );
      })
    )}
  </div>
);

/**
 * Admin UI for interviewer matching requirements on an interview type.
 * Cascades like availability filters: department → tiers → designations;
 * categories → technologies.
 */
const InterviewTypeFilterRulesFields = ({
  rules,
  onChange,
  disabled,
  departments = [],
  domains = [],
  categories = [],
  technologies = [],
}) => {
  const set = (patch) => onChange({ ...rules, ...patch });

  const [tiersForDept, setTiersForDept] = useState([]);
  const [designationsForScope, setDesignationsForScope] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [loadingDesignations, setLoadingDesignations] = useState(false);

  const scopedDepartmentId =
    rules.departmentFilterMode === FILTER_MODE.FIXED ? rules.fixedDepartmentId : null;
  const isDepartmentDependent = rules.departmentFilterMode === FILTER_MODE.SAME_AS_CANDIDATE;

  useEffect(() => {
    if (!isDepartmentDependent) return;
    if (
      rules.tierFilterMode !== FILTER_MODE.SAME_AS_CANDIDATE
      || rules.designationFilterMode !== FILTER_MODE.SAME_AS_CANDIDATE
      || rules.fixedMinTierId != null
      || rules.fixedMinDesignationId != null
    ) {
      set({
        tierFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
        designationFilterMode: FILTER_MODE.SAME_AS_CANDIDATE,
        fixedMinTierId: null,
        fixedMinDesignationId: null,
      });
    }
  }, [isDepartmentDependent]);

  // Department → tiers (same as availability filters)
  useEffect(() => {
    let active = true;
    if (!scopedDepartmentId) {
      setTiersForDept([]);
      return undefined;
    }
    setLoadingTiers(true);
    tierAPI.getTiersByDepartment(scopedDepartmentId)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? [...data].sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0)) : [];
        setTiersForDept(list);
        if (
          rules.fixedMinTierId != null
          && !list.some((t) => t.id === rules.fixedMinTierId)
        ) {
          set({ fixedMinTierId: null, fixedMinDesignationId: null });
        }
      })
      .catch((err) => {
        console.error('Failed to load tiers for department:', err);
        if (active) setTiersForDept([]);
      })
      .finally(() => {
        if (active) setLoadingTiers(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when department scope changes
  }, [scopedDepartmentId]);

  const scopedTierId =
    rules.tierFilterMode === FILTER_MODE.FIXED ? rules.fixedMinTierId : null;

  // Designations are filtered by selected tier only (same cascade as availability filters)
  useEffect(() => {
    let active = true;
    if (!scopedTierId) {
      setDesignationsForScope([]);
      return undefined;
    }

    setLoadingDesignations(true);
    designationAPI.getDesignationsByTier(scopedTierId)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data)
          ? [...data].sort((a, b) => (a.levelOrder ?? 0) - (b.levelOrder ?? 0))
          : [];
        setDesignationsForScope(list);
        if (
          rules.fixedMinDesignationId != null
          && !list.some((d) => d.id === rules.fixedMinDesignationId)
        ) {
          set({ fixedMinDesignationId: null });
        }
      })
      .catch((err) => {
        console.error('Failed to load designations for tier:', err);
        if (active) setDesignationsForScope([]);
      })
      .finally(() => {
        if (active) setLoadingDesignations(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedTierId]);

  const filteredTechnologies = useMemo(() => {
    if (rules.categoryFilterMode !== FILTER_MODE.FIXED) {
      return technologies;
    }
    if (!rules.fixedCategoryIds?.length) {
      return [];
    }
    const categoryIdSet = new Set(rules.fixedCategoryIds.map(Number));
    return technologies.filter((tech) => {
      const categoryId = tech?.category?.id ?? tech?.categoryId;
      return categoryId != null && categoryIdSet.has(Number(categoryId));
    });
  }, [technologies, rules.categoryFilterMode, rules.fixedCategoryIds]);

  const needsFixedDepartment =
    (rules.tierFilterMode === FILTER_MODE.FIXED
      || rules.designationFilterMode === FILTER_MODE.FIXED)
    && !scopedDepartmentId;

  const needsFixedTier =
    rules.designationFilterMode === FILTER_MODE.FIXED && !scopedTierId;

  const handleDepartmentModeChange = (departmentFilterMode) => {
    const isSameAsCandidate = departmentFilterMode === FILTER_MODE.SAME_AS_CANDIDATE;
    set({
      departmentFilterMode,
      fixedDepartmentId: departmentFilterMode === FILTER_MODE.FIXED ? rules.fixedDepartmentId : null,
      tierFilterMode: isSameAsCandidate ? FILTER_MODE.SAME_AS_CANDIDATE : rules.tierFilterMode,
      designationFilterMode: isSameAsCandidate ? FILTER_MODE.SAME_AS_CANDIDATE : rules.designationFilterMode,
      fixedMinTierId: isSameAsCandidate ? null : rules.fixedMinTierId,
      fixedMinDesignationId: isSameAsCandidate ? null : rules.fixedMinDesignationId,
      ...(departmentFilterMode !== FILTER_MODE.FIXED
        ? { fixedMinTierId: null, fixedMinDesignationId: null }
        : {}),
    });
  };

  const handleDepartmentChange = (value) => {
    set({
      fixedDepartmentId: Number(value),
      fixedMinTierId: null,
      fixedMinDesignationId: null,
    });
  };

  const handleTierModeChange = (tierFilterMode) => {
    set({
      tierFilterMode,
      fixedMinTierId: tierFilterMode === FILTER_MODE.FIXED ? rules.fixedMinTierId : null,
      ...(tierFilterMode !== FILTER_MODE.FIXED ? { fixedMinDesignationId: null } : {}),
    });
  };

  const handleCategoryIdsChange = (fixedCategoryIds) => {
    const categoryIdSet = new Set(fixedCategoryIds.map(Number));
    const nextTechIds = (rules.fixedTechnologyIds || []).filter((techId) => {
      const tech = technologies.find((t) => t.id === techId);
      const categoryId = tech?.category?.id ?? tech?.categoryId;
      return categoryId != null && categoryIdSet.has(Number(categoryId));
    });
    set({ fixedCategoryIds, fixedTechnologyIds: nextTechIds });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-semibold">Interviewer matching requirements</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Controls how HR filters interviewers when scheduling this type. Cascade: department →
          tier → designation; categories → technologies.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <ModeSelect
          value={rules.departmentFilterMode}
          onChange={handleDepartmentModeChange}
          disabled={disabled}
        />
        {rules.departmentFilterMode === FILTER_MODE.FIXED && (
          <Select
            value={rules.fixedDepartmentId != null ? String(rules.fixedDepartmentId) : ''}
            onValueChange={handleDepartmentChange}
            disabled={disabled}
          >
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>Min. experience (years)</Label>
        <Input
          type="number"
          min={0}
          placeholder="None"
          value={rules.minYearsExperience ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            set({ minYearsExperience: raw === '' ? null : Number(raw) });
          }}
          disabled={disabled}
        />
        <p className="text-[11px] text-muted-foreground">Leave empty for no experience filter.</p>
      </div>

      <div className="space-y-2">
        <Label>Min. tier</Label>
        <ModeSelect
          value={isDepartmentDependent ? FILTER_MODE.SAME_AS_CANDIDATE : rules.tierFilterMode}
          onChange={handleTierModeChange}
          disabled={disabled || isDepartmentDependent}
        />
        {rules.tierFilterMode === FILTER_MODE.FIXED && (
          needsFixedDepartment ? (
            <p className="text-xs text-muted-foreground">
              Set Department to Fixed and choose a department to list tiers.
            </p>
          ) : (
            <Select
              value={rules.fixedMinTierId != null ? String(rules.fixedMinTierId) : ''}
              onValueChange={(v) => set({ fixedMinTierId: Number(v), fixedMinDesignationId: null })}
              disabled={disabled || isDepartmentDependent || loadingTiers || tiersForDept.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTiers ? 'Loading tiers…' : 'Select minimum tier'} />
              </SelectTrigger>
              <SelectContent>
                {tiersForDept.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}{t.tierOrder != null ? ` (order ${t.tierOrder})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        )}
      </div>

      <div className="space-y-2">
        <Label>Min. designation</Label>
        <ModeSelect
          value={isDepartmentDependent ? FILTER_MODE.SAME_AS_CANDIDATE : rules.designationFilterMode}
          onChange={(designationFilterMode) => set({
            designationFilterMode,
            fixedMinDesignationId:
              designationFilterMode === FILTER_MODE.FIXED ? rules.fixedMinDesignationId : null,
          })}
          disabled={disabled || isDepartmentDependent}
        />
        {rules.designationFilterMode === FILTER_MODE.FIXED && (
          needsFixedDepartment ? (
            <p className="text-xs text-muted-foreground">
              Set Department to Fixed and choose a department first.
            </p>
          ) : needsFixedTier ? (
            <p className="text-xs text-muted-foreground">
              Set Min. tier to Fixed and choose a tier to list designations.
            </p>
          ) : (
            <Select
              value={rules.fixedMinDesignationId != null ? String(rules.fixedMinDesignationId) : ''}
              onValueChange={(v) => set({ fixedMinDesignationId: Number(v) })}
              disabled={disabled || isDepartmentDependent || loadingDesignations || designationsForScope.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingDesignations ? 'Loading designations…' : 'Select minimum designation'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {designationsForScope.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}{d.levelOrder != null ? ` (level ${d.levelOrder})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        )}
      </div>

      <div className="space-y-2">
        <Label>Domains</Label>
        <ModeSelect
          value={rules.domainFilterMode}
          onChange={(domainFilterMode) => set({
            domainFilterMode,
            fixedDomainIds: domainFilterMode === FILTER_MODE.FIXED ? rules.fixedDomainIds : [],
          })}
          disabled={disabled}
        />
        {rules.domainFilterMode === FILTER_MODE.FIXED && (
          <IdCheckboxList
            items={domains}
            selectedIds={rules.fixedDomainIds}
            onChange={(fixedDomainIds) => set({ fixedDomainIds })}
            disabled={disabled}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <ModeSelect
          value={rules.categoryFilterMode}
          onChange={(categoryFilterMode) => set({
            categoryFilterMode,
            fixedCategoryIds: categoryFilterMode === FILTER_MODE.FIXED ? rules.fixedCategoryIds : [],
            ...(categoryFilterMode !== FILTER_MODE.FIXED ? {} : {}),
          })}
          disabled={disabled}
        />
        {rules.categoryFilterMode === FILTER_MODE.FIXED && (
          <IdCheckboxList
            items={categories}
            selectedIds={rules.fixedCategoryIds}
            onChange={handleCategoryIdsChange}
            disabled={disabled}
            labelKey="label"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Technologies</Label>
        <ModeSelect
          value={rules.technologyFilterMode}
          onChange={(technologyFilterMode) => set({
            technologyFilterMode,
            fixedTechnologyIds: technologyFilterMode === FILTER_MODE.FIXED ? rules.fixedTechnologyIds : [],
          })}
          disabled={disabled}
        />
        {rules.technologyFilterMode === FILTER_MODE.FIXED && (
          <IdCheckboxList
            items={filteredTechnologies}
            selectedIds={rules.fixedTechnologyIds}
            onChange={(fixedTechnologyIds) => set({ fixedTechnologyIds })}
            disabled={disabled}
            emptyMessage={
              rules.categoryFilterMode === FILTER_MODE.FIXED && !rules.fixedCategoryIds?.length
                ? 'Select one or more categories above to list technologies.'
                : rules.categoryFilterMode === FILTER_MODE.FIXED
                  ? 'No technologies in the selected categories.'
                  : 'No options available.'
            }
          />
        )}
        {rules.technologyFilterMode === FILTER_MODE.FIXED
          && rules.categoryFilterMode === FILTER_MODE.FIXED && (
          <p className="text-[11px] text-muted-foreground">
            Technology list is limited to the categories selected above.
          </p>
        )}
      </div>
    </div>
  );
};

export default InterviewTypeFilterRulesFields;
