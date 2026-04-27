// src/pages/hr/components/FiltersCard.jsx
import React, { useRef, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Filter, X, Code, Search, ChevronDown, Award, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FiltersCard = ({
  filterDept,
  setFilterDept,
  filterTech,
  setFilterTech,
  techSearchTerm,
  setTechSearchTerm,
  showTechDropdown,
  setShowTechDropdown,
  minExperience,
  setMinExperience,
  dateRange,
  setDateRange,
  selectedDeptForDesignation,
  setSelectedDeptForDesignation,
  selectedTierInDept,
  setSelectedTierInDept,
  minDesignationLevel,
  setMinDesignationLevel,
  departments,
  technologies,
  tiersForSelectedDept,
  designationsForSelectedTier,
  clearFilters,
  formatInputDateTime,
  handleStartDateTimeChange,
  availableCount,
  bookedCount,
  events,
}) => {
  const techDropdownRef = useRef(null);

  const filteredTechnologies = techSearchTerm.trim()
    ? technologies.filter((t) => t.name.toLowerCase().includes(techSearchTerm.toLowerCase()))
    : technologies;

  const filteredGroupedTechs = filteredTechnologies.reduce((acc, tech) => {
    const cat = tech.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tech);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" /> Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={filterDept.length > 0 ? filterDept[0].toString() : 'ALL'}
              onValueChange={(v) => setFilterDept(v === 'ALL' ? [] : [parseInt(v)])}>
              <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" ref={techDropdownRef}>
            <Label className="flex items-center gap-2">
              <Code className="w-4 h-4" /> Technologies {filterTech.length > 0 && `(${filterTech.length})`}
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search…" value={techSearchTerm}
                  onChange={(e) => setTechSearchTerm(e.target.value)}
                  onFocus={() => setShowTechDropdown(true)}
                  className="pl-10 pr-10" />
                <button onClick={() => setShowTechDropdown(!showTechDropdown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTechDropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <AnimatePresence>
                {showTechDropdown && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {Object.keys(filteredGroupedTechs).length === 0
                      ? <div className="p-4 text-center text-sm text-muted-foreground">No technologies found</div>
                      : <div className="py-2">
                        {Object.entries(filteredGroupedTechs).sort(([a], [b]) => a.localeCompare(b)).map(([cat, techs]) => (
                          <div key={cat} className="mb-2">
                            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">{cat}</div>
                            {techs.map((tech) => (
                              <button key={tech.id} onClick={() => setFilterTech(filterTech.includes(tech.id) ? filterTech.filter((x) => x !== tech.id) : [...filterTech, tech.id])}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center justify-between ${filterTech.includes(tech.id) ? 'bg-primary/10' : ''}`}>
                                <span className="font-medium">{tech.name}</span>
                                {filterTech.includes(tech.id) && <Badge variant="secondary" className="text-xs">Selected</Badge>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {filterTech.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filterTech.map((id) => {
                  const tech = technologies.find((t) => t.id === id);
                  return tech ? (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {tech.name}
                      <button onClick={() => setFilterTech(filterTech.filter((x) => x !== id))} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Min. Experience (Years)</Label>
            <Input type="number" min="0" placeholder="Any" value={minExperience}
              onChange={(e) => setMinExperience(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Department (Tier/Level Filter)</Label>
            <Select value={selectedDeptForDesignation || 'ANY'}
              onValueChange={(v) => setSelectedDeptForDesignation(v === 'ANY' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Award className="w-4 h-4" /> Min. Tier</Label>
            <Select value={selectedTierInDept || 'ANY'}
              onValueChange={(v) => setSelectedTierInDept(v === 'ANY' ? '' : v)}
              disabled={!selectedDeptForDesignation}>
              <SelectTrigger><SelectValue placeholder={selectedDeptForDesignation ? 'Select Tier' : 'Select Department First'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any Tier</SelectItem>
                {tiersForSelectedDept.map((t) => <SelectItem key={t.id} value={t.id.toString()}>Tier {t.tierOrder} – {t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Min. Level in Tier</Label>
            <Select value={minDesignationLevel || 'ANY'}
              onValueChange={(v) => setMinDesignationLevel(v === 'ANY' ? '' : v)}
              disabled={!selectedTierInDept}>
              <SelectTrigger><SelectValue placeholder={selectedTierInDept ? 'Select Level' : 'Select Tier First'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any Level</SelectItem>
                {designationsForSelectedTier.map((d) => <SelectItem key={d.id} value={d.levelOrder.toString()}>Level {d.levelOrder} – {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">From (Date & Time)</Label>
            <Input
              type="datetime-local"
              value={formatInputDateTime(dateRange.start)}
              onChange={(e) => handleStartDateTimeChange(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/20 dark:to-sky-950/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Slots Shown</span>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-sm"><span className="font-bold text-indigo-600">{availableCount}</span><span className="text-muted-foreground ml-1">available</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm"><span className="font-bold text-emerald-600">{availableCount}</span><span className="text-muted-foreground ml-1">booked</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-sm"><span className="font-bold text-slate-600">{events.length}</span><span className="text-muted-foreground ml-1">total</span></span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiltersCard;
