import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Globe2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import  candidateAPI from '@/services/candidateAPI';

import { domainAPI } from '@/services/domainAPI';
import DomainMultiSelect from '@/components/DomainMultiSelect';

export function buildCandidateDomainPayload(candidate, domainIds) {
  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    departmentId: candidate.departmentId ?? null,
    targetDesignationId: candidate.targetDesignationId ?? null,
    status: candidate.status,
    yearsOfExperience: candidate.yearsOfExperience ?? null,
    jdUrl: candidate.jdUrl || null,
    jobReferenceCode: candidate.jobReferenceCode || null,
    location: candidate.location || null,
    notes: candidate.notes || null,
    resourceRequestNumber: candidate.resourceRequestNumber || null,
    resourceLink: candidate.resourceLink || null,
    coordinatedHrId: candidate.coordinatedHrId ?? null,
    domainIds,
  };
}

function CandidateDomainsPanel({
  candidate,
  domains = [],
  readOnly = false,
  disabled = false,
  onDomainsUpdated,
  defaultExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [allDomains, setAllDomains] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const canEdit = !readOnly && !disabled && candidate?.id;

  useEffect(() => {
    domainAPI.getAllDomains()
      .then(setAllDomains)
      .catch(() => setAllDomains([]));
  }, []);

  useEffect(() => {
    setSelectedIds((domains || []).map((domain) => domain.id));
  }, [candidate?.id, domains]);

  const persistDomains = async (nextIds) => {
    if (!candidate?.id) return;
    setSaving(true);
    try {
      await candidateAPI.updateCandidate(
        candidate.id,
        buildCandidateDomainPayload(candidate, nextIds),
      );
      setSelectedIds(nextIds);
      onDomainsUpdated?.();
      toast({ title: 'Domains updated' });
    } catch (error) {
      toast({
        title: 'Failed to update domains',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDomainsChange = async (nextIds) => {
    if (!canEdit || saving) return;
    await persistDomains(nextIds);
  };

  const selectedDomains = allDomains.filter((domain) => selectedIds.includes(domain.id));
  const displayDomains = selectedDomains.length > 0
    ? selectedDomains
    : (domains || []);

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <Globe2 className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Domains</p>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="rounded-full text-[11px]">
              {selectedIds.length}
            </Badge>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse domains' : 'Expand domains'}
              onClick={() => setIsExpanded((value) => !value)}
              className="rounded p-1 hover:bg-slate-100"
            >
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {canEdit ? (
              <DomainMultiSelect
                label="Domains"
                domains={allDomains}
                selectedIds={selectedIds}
                onChange={handleDomainsChange}
                disabled={saving}
                placeholder="Search domains to add…"
              />
            ) : displayDomains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayDomains.map((domain) => (
                  <Badge key={domain.id} variant="secondary" className="text-xs font-normal">
                    {domain.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No domains available.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CandidateDomainsPanel;
