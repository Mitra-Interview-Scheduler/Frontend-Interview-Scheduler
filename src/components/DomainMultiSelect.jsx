import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DomainMultiSelect({
  label = 'Domains',
  domains = [],
  selectedIds = [],
  highlightIds = [],
  onChange,
  disabled = false,
  placeholder = 'Search domains…',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = React.useRef(null);

  const highlightSet = useMemo(() => new Set(highlightIds || []), [highlightIds]);

  const filteredDomains = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return domains;
    return domains.filter(
      (d) => d.name?.toLowerCase().includes(term) || d.code?.toLowerCase().includes(term)
    );
  }, [domains, searchTerm]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleDomain = (id) => {
    if (disabled) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange?.(next);
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          disabled={disabled}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {showDropdown && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-56 overflow-y-auto"
          >
            {filteredDomains.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No domains found</div>
            ) : (
              <div className="py-2">
                {filteredDomains.map((domain) => {
                  const isSelected = selectedIds.includes(domain.id);
                  const isCandidate = highlightSet.has(domain.id);
                  return (
                    <div
                      key={domain.id}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => toggleDomain(domain.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleDomain(domain.id);
                        }
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-3 cursor-pointer ${
                        isSelected ? (isCandidate ? 'bg-amber-50' : 'bg-primary/10') : ''
                      }`}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <span className="font-medium flex-1 flex items-center gap-2">
                        {domain.name}
                      </span>
                      {isSelected && isCandidate && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-300 bg-amber-50 text-amber-900"
                        >
                          Candidate
                        </Badge>
                      )}
                      {domain.code && (
                        <span className="text-xs text-muted-foreground">{domain.code}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedIds.map((id) => {
            const domain = domains.find((d) => d.id === id);
            if (!domain) return null;
            const isCandidate = highlightSet.has(id);
            return (
              <Badge
                key={id}
                variant="outline"
                className={`gap-1 pr-1 ${
                  isCandidate
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-secondary text-secondary-foreground'
                }`}
              >
                <span>{domain.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleDomain(id)}
                    className="ml-1 hover:text-destructive rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DomainMultiSelect;
