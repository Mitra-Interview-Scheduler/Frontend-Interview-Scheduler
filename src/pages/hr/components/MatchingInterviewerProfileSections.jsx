import React from 'react';
import { Star } from 'lucide-react';

export function MatchGroup({ label, tone, items, icon }) {
  if (!items?.length) return null;

  const bar = {
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    teal: 'bg-teal-500',
  }[tone];

  const chip = {
    amber: 'bg-amber-50 text-amber-950 border-amber-200/70',
    sky: 'bg-sky-50 text-sky-950 border-sky-200/70',
    teal: 'bg-teal-50 text-teal-950 border-teal-200/70',
  }[tone];

  return (
    <div className="relative pl-3">
      <span className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${bar}`} />
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[13px] font-semibold text-slate-800">{label}</p>
        <span className="text-[11px] tabular-nums text-slate-400">{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((name) => (
          <span
            key={`${label}-${name}`}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-[5px] text-xs font-medium ${chip}`}
          >
            {icon}
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfileGroup({ label, tone, items, matchedSet, showStarOnMatch = false }) {
  if (!items?.length) return null;

  const bar = {
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    teal: 'bg-teal-500',
  }[tone];

  const matchedChip = {
    amber: 'bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-300/80 shadow-sm',
    sky: 'bg-sky-100 text-sky-950 border-sky-400 ring-1 ring-sky-300/80 shadow-sm',
    teal: 'bg-teal-100 text-teal-950 border-teal-400 ring-1 ring-teal-300/80 shadow-sm',
  }[tone];

  return (
    <div className="relative pl-3">
      <span className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${bar}`} />
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[13px] font-semibold text-slate-800">{label}</p>
        <span className="text-[11px] tabular-nums text-slate-400">{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((name) => {
          const isMatch = matchedSet.has(String(name).trim().toLowerCase());
          return (
            <span
              key={`${label}-all-${name}`}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-[5px] text-xs font-medium ${
                isMatch
                  ? matchedChip
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
              title={isMatch ? 'Matches candidate' : undefined}
            >
              {isMatch && showStarOnMatch && (
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              )}
              {isMatch && !showStarOnMatch && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              )}
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Same Why this match + Full profile layout as the single interviewer detail view. */
export function MatchingInterviewerProfileSections({ match }) {
  if (!match) return null;

  const hasCore = (match.matchedCore || []).length > 0;
  const hasNonCore = (match.matchedNonCore || []).length > 0;
  const hasDomains = (match.matchedDomains || []).length > 0;
  const hasAnyMatch = hasCore || hasNonCore || hasDomains;

  const matchedNameSet = new Set(
    [
      ...(match.matchedCore || []),
      ...(match.matchedNonCore || []),
      ...(match.matchedDomains || []),
    ]
      .map((n) => String(n).trim().toLowerCase())
      .filter(Boolean),
  );

  const hasFullProfile = (
    (match.coreTechnologies || []).length
    + (match.nonCoreTechnologies || []).length
    + (match.domains || []).length
  ) > 0;

  return (
    
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Full profile
          </p>
          {hasFullProfile && matchedNameSet.size > 0 && (
            <p className="text-[11px] text-slate-400">
              Highlighted = match
            </p>
          )}
        </div>

        {!hasFullProfile ? (
          <p className="text-sm text-slate-500 leading-relaxed">
            No technologies or domains on this interviewer profile.
          </p>
        ) : (
          <div className="space-y-5">
            <ProfileGroup
              label="Core technologies"
              tone="amber"
              items={match.coreTechnologies}
              matchedSet={matchedNameSet}
              showStarOnMatch
            />
            <ProfileGroup
              label="Sub technologies"
              tone="sky"
              items={match.nonCoreTechnologies}
              matchedSet={matchedNameSet}
            />
            <ProfileGroup
              label="Domains"
              tone="teal"
              items={match.domains}
              matchedSet={matchedNameSet}
            />
          </div>
        )}
      </div>
    
  );
}

export default MatchingInterviewerProfileSections;
