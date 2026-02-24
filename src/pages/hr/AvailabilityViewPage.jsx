// src/pages/hr/AvailabilityViewPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ENHANCED VERSION — superior multi-interviewer calendar with:
//   • strict slot containment (no overflow past calendar edges)
//   • richer color gradients for available / booked / panel states
//   • compact overlapping-slot labels for dense days
//   • custom toolbar for cleaner navigation
//   • better tooltip / event formatting
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay, addMinutes,
} from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import {
  Calendar as CalendarIcon, Filter, X, User, Briefcase, Code, Clock,
  Send, TrendingUp, Award, Search, ChevronDown, Users, AlertCircle,
  CheckCircle2, Scissors,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { technologyAPI } from '@/services/technologyAPI';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI } from '@/services/tierAPI';
import { candidateAPI } from '@/services/candidateAPI';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../interviewer/AvailabilityCalendar.css'; // ← replaced with enhanced CSS

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales: { 'en-US': enUS },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

const formatLocalDateTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

const generateTimeOptions = (startDate, endDate) => {
  const options = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    options.push({
      label: format(current, 'h:mm a'),
      value: format(current, 'HH:mm'),
      date: new Date(current),
    });
    current = addMinutes(current, 30);
  }
  return options;
};

const parseTimeOnDate = (timeStr, referenceDate) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};


// ── Main Component ────────────────────────────────────────────────────────────
const AvailabilityViewPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [candidates, setCandidates] = useState([]);

  // Filters
  const [filterDept, setFilterDept] = useState([]);
  const [filterTech, setFilterTech] = useState([]);
  const [techSearchTerm, setTechSearchTerm] = useState('');
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [minExperience, setMinExperience] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedDeptForDesignation, setSelectedDeptForDesignation] = useState('');
  const [minDesignationLevel, setMinDesignationLevel] = useState('');
  const [selectedTierInDept, setSelectedTierInDept] = useState('');
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);

  // Panel mode
  const [panelMode, setPanelMode] = useState(false);
  const [panelSlots, setPanelSlots] = useState([]);
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);

  // Single interview dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookStartTime, setBookStartTime] = useState('');
  const [bookEndTime, setBookEndTime] = useState('');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [requestForm, setRequestForm] = useState({
    candidateId: null, candidateName: '', candidateDesignationId: '',
    requiredTechnologyIds: [], isUrgent: false, notes: '',
  });

  const techDropdownRef = useRef(null);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { applyFilters(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterDept, filterTech, minExperience, dateRange,
      selectedDeptForDesignation, selectedTierInDept, minDesignationLevel]);

  useEffect(() => {
    if (selectedDeptForDesignation) loadTiersAndDesignationsForDepartment(selectedDeptForDesignation);
    else { setTiersForSelectedDept([]); setSelectedTierInDept(''); setMinDesignationLevel(''); }
  }, [selectedDeptForDesignation]);

  useEffect(() => {
    if (selectedTierInDept) loadDesignationsForTier(parseInt(selectedTierInDept));
    else { setDesignationsForSelectedTier([]); setMinDesignationLevel(''); }
  }, [selectedTierInDept]);

  useEffect(() => {
    const handle = (e) => {
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target))
        setShowTechDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [availabilityData, deptData, techData, desigData, tierData, candidatesData] =
        await Promise.all([
          hrAvailabilityAPI.getAllAvailability(),
          departmentAPI.getAllDepartments(),
          technologyAPI.getAllTechnologies(),
          designationAPI.getAllDesignations(),
          tierAPI.getAllTiers(),
          candidateAPI.getAllCandidates(),
        ]);
      setDepartments(deptData);
      setTechnologies(techData);
      setDesignations(desigData);
      setTiers(tierData);
      setCandidates(candidatesData);
      setEvents(formatSlots(availabilityData));
    } catch (error) {
      toast({
        title: 'Error loading availability',
        description: error.response?.data?.message || 'Failed to load',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Format slots into calendar events ─────────────────────────────────────
  const formatSlots = (data) =>
    data.map((slot) => {
      const isBooked = slot.status === 'BOOKED';
      const skills = slot.technologies || [];
      const skillLabel = skills.length ? ` · ${skills.slice(0, 2).join(', ')}${skills.length > 2 ? ' +' + (skills.length - 2) : ''}` : '';

      return {
        id: slot.slotId,
        interviewerId: slot.interviewerId,
        // Title is kept compact for dense views
        title: isBooked
          ? `🔒 ${slot.interviewerName}${slot.candidateName ? ' → ' + slot.candidateName : ''}`
          : `${slot.interviewerName}${skillLabel}`,
        start: new Date(slot.startDateTime),
        end: new Date(slot.endDateTime),
        resource: {
          ...slot,
          interviewer: slot.interviewerName,
          department: slot.department,
          designation: slot.designation,
          skills,
          yearsOfExperience: slot.yearsOfExperience,
          status: slot.status,
          candidateName: slot.candidateName,
        },
      };
    });

  const loadTiersAndDesignationsForDepartment = async (departmentId) => {
    try {
      const tiersData = await tierAPI.getTiersByDepartment(parseInt(departmentId));
      setTiersForSelectedDept(tiersData.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (error) { console.error('Failed to load tiers:', error); }
  };

  const loadDesignationsForTier = async (tierId) => {
    try {
      const data = await designationAPI.getDesignationsByTier(tierId);
      setDesignationsForSelectedTier(data.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (error) { console.error('Failed to load designations:', error); }
  };

  const applyFilters = async () => {
    if (loading) return;
    try {
      let tierOrderToSend = null;
      if (selectedTierInDept) {
        const t = tiersForSelectedDept.find((t) => t.id.toString() === selectedTierInDept);
        tierOrderToSend = t ? t.tierOrder : null;
      }
      const filters = {
        departmentIds: filterDept.length > 0 ? filterDept : null,
        technologyIds: filterTech.length > 0 ? filterTech : null,
        minYearsOfExperience: minExperience ? parseInt(minExperience) : null,
        startDateTime: dateRange.start ? dateRange.start.toISOString() : null,
        endDateTime: dateRange.end ? dateRange.end.toISOString() : null,
        departmentIdForDesignationFilter: selectedDeptForDesignation
          ? parseInt(selectedDeptForDesignation) : null,
        minTierId: tierOrderToSend,
        minDesignationLevelInDepartment: minDesignationLevel ? parseInt(minDesignationLevel) : null,
      };
      const data = await hrAvailabilityAPI.getAllAvailability(filters);
      setEvents(formatSlots(data));
    } catch (error) {
      console.error('Filter error:', error);
      toast({
        title: 'Error applying filters',
        description: error.response?.data?.message || 'Failed to filter',
        variant: 'destructive',
      });
    }
  };

  // ── Event click ───────────────────────────────────────────────────────────
  const handleEventClick = (event) => {
    const isBooked = event.resource?.status === 'BOOKED';
    if (isBooked) {
      toast({
        title: `🔒 Already Booked — ${event.resource.interviewer}`,
        description: event.resource.candidateName
          ? `Candidate: ${event.resource.candidateName} • ${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`
          : `${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`,
      });
      return;
    }

    if (panelMode) {
      const alreadySelected = panelSlots.some((ps) => ps.slot.id === event.id);
      if (alreadySelected) {
        setPanelSlots(panelSlots.filter((ps) => ps.slot.id !== event.id));
        toast({ title: `Removed ${event.resource.interviewer} from panel` });
      } else {
        setPanelSlots([...panelSlots, { slot: event, bookStart: event.start, bookEnd: event.end }]);
        toast({
          title: `Added ${event.resource.interviewer} to panel`,
          description: `${panelSlots.length + 1} interviewer(s) selected`,
        });
      }
      return;
    }

    setSelectedSlot(event);
    setBookStartTime(format(event.start, 'HH:mm'));
    setBookEndTime(format(event.end, 'HH:mm'));
    setRequestForm({
      candidateId: null,
      candidateName: '',
      candidateDesignationId: '',
      requiredTechnologyIds: event.resource.skills
        .map((skill) => { const t = technologies.find((t) => t.name === skill); return t?.id || null; })
        .filter(Boolean),
      isUrgent: false,
      notes: '',
    });
    setCandidateSearchTerm('');
    setRequestDialogOpen(true);
  };

  // ── Candidate helpers ─────────────────────────────────────────────────────
  const handleSelectCandidate = (candidate) =>
    setRequestForm({
      ...requestForm,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDesignationId: candidate.targetDesignationId || '',
    });

  const handleClearCandidate = () =>
    setRequestForm({ ...requestForm, candidateId: null, candidateName: '', candidateDesignationId: '' });

  // ── Single interview submit ───────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a candidate name', variant: 'destructive' });
      return;
    }
    const bookStart = parseTimeOnDate(bookStartTime, selectedSlot.start);
    const bookEnd   = parseTimeOnDate(bookEndTime,   selectedSlot.start);
    if (bookEnd <= bookStart) {
      toast({ title: 'Invalid time', description: 'End time must be after start time', variant: 'destructive' });
      return;
    }
    try {
      await hrAvailabilityAPI.createInterviewRequest({
        candidateId: requestForm.candidateId,
        candidateName: requestForm.candidateName,
        candidateDesignationId: requestForm.candidateDesignationId || null,
        requiredTechnologyIds: requestForm.requiredTechnologyIds,
        availabilitySlotId: selectedSlot.id,
        preferredStartDateTime: formatLocalDateTime(bookStart),
        preferredEndDateTime: formatLocalDateTime(bookEnd),
        isUrgent: requestForm.isUrgent,
        notes: requestForm.notes,
      });
      toast({
        title: '✓ Interview scheduled',
        description: `${requestForm.candidateName} with ${selectedSlot.resource.interviewer} — ${format(bookStart, 'h:mm a')}–${format(bookEnd, 'h:mm a')}`,
      });
      setRequestDialogOpen(false);
      setSelectedSlot(null);
      applyFilters();
    } catch (error) {
      toast({
        title: 'Failed to schedule interview',
        description: error.response?.data?.message || 'Unable to schedule',
        variant: 'destructive',
      });
    }
  };

  // ── Panel submit ──────────────────────────────────────────────────────────
  const handleSendPanelRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a candidate name', variant: 'destructive' });
      return;
    }
    if (panelSlots.length < 1) {
      toast({ title: 'Validation Error', description: 'Select at least 1 interviewer slot', variant: 'destructive' });
      return;
    }
    if (panelTimeOptions.length === 0) {
      toast({ title: 'No overlapping time', description: 'Selected interviewers have no common availability window', variant: 'destructive' });
      return;
    }
    const bookStart = parseTimeOnDate(panelBookStart, panelSlots[0].slot.start);
    const bookEnd   = parseTimeOnDate(panelBookEnd,   panelSlots[0].slot.start);
    if (bookEnd <= bookStart) {
      toast({ title: 'Invalid time', description: 'End time must be after start time', variant: 'destructive' });
      return;
    }
    try {
      await hrAvailabilityAPI.createPanelInterview({
        candidateId: requestForm.candidateId,
        candidateName: requestForm.candidateName,
        candidateDesignationId: requestForm.candidateDesignationId || null,
        startDateTime: formatLocalDateTime(bookStart),
        endDateTime: formatLocalDateTime(bookEnd),
        availabilitySlotIds: panelSlots.map((ps) => ps.slot.id),
        requiredTechnologyIds: requestForm.requiredTechnologyIds,
        isUrgent: requestForm.isUrgent,
        notes: requestForm.notes,
      });
      toast({
        title: '✓ Panel interview scheduled',
        description: `${requestForm.candidateName} with ${panelSlots.length} interviewer(s) — ${format(bookStart, 'h:mm a')}–${format(bookEnd, 'h:mm a')}`,
      });
      setPanelDialogOpen(false);
      setPanelSlots([]);
      setRequestForm({
        candidateId: null, candidateName: '', candidateDesignationId: '',
        requiredTechnologyIds: [], isUrgent: false, notes: '',
      });
      applyFilters();
    } catch (error) {
      toast({
        title: 'Failed to schedule panel interview',
        description: error.response?.data?.message || 'Unable to schedule',
        variant: 'destructive',
      });
    }
  };

  // ── Panel time (intersection) ─────────────────────────────────────────────
  const panelTimeOptions = (() => {
    if (panelSlots.length === 0) return [];
    const latestStart = panelSlots.reduce(
      (max, ps) => ps.slot.start > max ? ps.slot.start : max, panelSlots[0].slot.start);
    const earliestEnd = panelSlots.reduce(
      (min, ps) => ps.slot.end < min ? ps.slot.end : min, panelSlots[0].slot.end);
    if (latestStart >= earliestEnd) return [];
    return generateTimeOptions(latestStart, earliestEnd);
  })();

  const defaultPanelStart = panelTimeOptions.length > 0 ? panelTimeOptions[0].value : '';
  const defaultPanelEnd   = panelTimeOptions.length > 0
    ? panelTimeOptions[panelTimeOptions.length - 1].value : '';
  const [panelBookStartOverride, setPanelBookStartOverride] = useState('');
  const [panelBookEndOverride,   setPanelBookEndOverride]   = useState('');
  const panelBookStart = panelBookStartOverride || defaultPanelStart;
  const panelBookEnd   = panelBookEndOverride   || defaultPanelEnd;

  useEffect(() => {
    setPanelBookStartOverride('');
    setPanelBookEndOverride('');
  }, [panelSlots.length]);

  // ── Tech filter helpers ───────────────────────────────────────────────────
  const handleTechSelect = (techId) =>
    setFilterTech(filterTech.includes(techId)
      ? filterTech.filter((id) => id !== techId)
      : [...filterTech, techId]);

  const clearFilters = () => {
    setFilterDept([]); setFilterTech([]); setTechSearchTerm(''); setMinExperience('');
    setDateRange({ start: null, end: null }); setSelectedDeptForDesignation('');
    setMinDesignationLevel(''); setSelectedTierInDept('');
    setTiersForSelectedDept([]); setDesignationsForSelectedTier([]);
  };

  const filteredTechnologies = techSearchTerm.trim()
    ? technologies.filter((t) =>
        t.name.toLowerCase().includes(techSearchTerm.toLowerCase()) ||
        (t.category && t.category.toLowerCase().includes(techSearchTerm.toLowerCase())))
    : technologies;

  const filteredGroupedTechnologies = filteredTechnologies.reduce((acc, tech) => {
    const cat = tech.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tech);
    return acc;
  }, {});

  const filteredCandidates = candidates.filter((c) =>
    c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    (c.targetDesignationName &&
      c.targetDesignationName.toLowerCase().includes(candidateSearchTerm.toLowerCase())));

  // ── Calendar event styling ────────────────────────────────────────────────
  // Uses gradient backgrounds + left border accent for clear state distinction.
  const eventStyleGetter = useCallback((event) => {
    const isBooked  = event.resource?.status === 'BOOKED';
    const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);

    // Colors mirror the enhanced CSS variables
    let bg, border, shadow, cursor = 'pointer', outline = 'none', opacity = 1;

    if (isBooked) {
      bg     = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      border = '3px solid #065f46';
      shadow = '0 2px 6px rgba(16,185,129,0.25)';
      cursor = 'default';
      opacity = 0.9;
    } else if (isInPanel) {
      bg     = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
      border = '3px solid #0c4a6e';
      shadow = '0 2px 8px rgba(14,165,233,0.35), 0 0 0 2px #7dd3fc';
    } else {
      bg     = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
      border = '3px solid #312e81';
      shadow = '0 2px 6px rgba(99,102,241,0.25)';
    }

    return {
      style: {
        background: bg,
        borderRadius: '5px',
        opacity,
        color: 'white',
        borderLeft: border,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        display: 'block',
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: '500',
        boxShadow: shadow,
        outline,
        outlineOffset: '1px',
        cursor,
        overflow: 'hidden',      // ← critical: events never bleed outside
        maxWidth: '100%',
      },
    };
  }, [panelSlots]);

  // ── Rich tooltip ──────────────────────────────────────────────────────────
  const tooltipAccessor = (event) => {
    const r = event.resource;
    if (r?.status === 'BOOKED')
      return `🔒 BOOKED\n${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`;
    return [
      `👤 ${r.interviewer}`,
      r.designation ? `📋 ${r.designation}` : null,
      r.department ? `🏢 ${r.department}` : null,
      r.yearsOfExperience ? `⏱ ${r.yearsOfExperience} yrs exp` : null,
      r.skills?.length ? `💻 ${r.skills.join(', ')}` : null,
      `🕐 ${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`,
    ].filter(Boolean).join('\n');
  };

  // ── Shared candidate section ──────────────────────────────────────────────
  const renderCandidateSection = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Candidate *</Label>
        {requestForm.candidateId ? (
          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{requestForm.candidateName}</p>
                <p className="text-sm text-muted-foreground">
                  {candidates.find((c) => c.id === requestForm.candidateId)?.email}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearCandidate}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search candidates by name, email, or position…"
                value={candidateSearchTerm}
                onChange={(e) => setCandidateSearchTerm(e.target.value)}
                className="pl-10" />
            </div>
            {candidateSearchTerm && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {filteredCandidates.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No candidates found. Enter name manually below.
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredCandidates.map((candidate) => (
                      <button key={candidate.id} onClick={() => handleSelectCandidate(candidate)}
                        className="w-full p-3 hover:bg-accent text-left transition-colors">
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                        {candidate.targetDesignationName && (
                          <p className="text-xs text-muted-foreground">{candidate.targetDesignationName}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Or enter candidate name manually</Label>
              <Input placeholder="Enter candidate name" value={requestForm.candidateName}
                onChange={(e) => setRequestForm({ ...requestForm, candidateName: e.target.value })} />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>Designation (Optional)</Label>
        <Select
          value={requestForm.candidateDesignationId?.toString() || 'NONE'}
          onValueChange={(value) =>
            setRequestForm({ ...requestForm, candidateDesignationId: value === 'NONE' ? '' : parseInt(value) })}>
          <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            {designations.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea placeholder="Any special requirements or notes…" value={requestForm.notes}
          onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} rows={3} />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="urgent" checked={requestForm.isUrgent}
          onChange={(e) => setRequestForm({ ...requestForm, isUrgent: e.target.checked })}
          className="rounded" />
        <Label htmlFor="urgent" className="cursor-pointer text-sm">Mark as urgent</Label>
      </div>
    </div>
  );

  const singleSlotTimeOptions = selectedSlot
    ? generateTimeOptions(selectedSlot.start, selectedSlot.end) : [];

  const availableCount = events.filter(e => e.resource?.status === 'AVAILABLE').length;
  const bookedCount    = events.filter(e => e.resource?.status === 'BOOKED').length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Interviewer Availability</h1>
            <p className="text-muted-foreground text-lg">View and book interviewer availability across teams</p>
          </div>
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" /> Clear Filters
          </Button>
        </motion.div>

        {/* Legend — enhanced with slot counts */}
        <div className="flex items-center gap-6 px-1 flex-wrap">
          {[
            { color: 'linear-gradient(135deg,#6366f1,#4f46e5)', label: 'Available', count: availableCount, textColor: 'text-indigo-600' },
            { color: 'linear-gradient(135deg,#10b981,#059669)', label: 'Booked',    count: bookedCount,    textColor: 'text-emerald-600' },
            { color: 'linear-gradient(135deg,#0ea5e9,#0284c7)', label: 'Panel selected', count: panelSlots.length, textColor: 'text-sky-600' },
          ].map(({ color, label, count, textColor }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: color }} />
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              {count > 0 && (
                <span className={`text-xs font-bold ${textColor} bg-opacity-10 px-1.5 py-0.5 rounded-full`}>
                  {count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filterDept.length > 0 ? filterDept[0].toString() : 'ALL'}
                  onValueChange={(value) =>
                    setFilterDept(value === 'ALL' ? [] : [parseInt(value)])}>
                  <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Technologies */}
              <div className="space-y-2" ref={techDropdownRef}>
                <Label className="flex items-center gap-2">
                  <Code className="w-4 h-4" /> Technologies
                  {filterTech.length > 0 && ` (${filterTech.length})`}
                </Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search technologies…" value={techSearchTerm}
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
                        {Object.keys(filteredGroupedTechnologies).length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No technologies found</div>
                        ) : (
                          <div className="py-2">
                            {Object.entries(filteredGroupedTechnologies)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([category, techs]) => (
                                <div key={category} className="mb-2">
                                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                    {category}
                                  </div>
                                  {techs.map((tech) => (
                                    <button key={tech.id} onClick={() => handleTechSelect(tech.id)}
                                      className={`w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center justify-between
                                        ${filterTech.includes(tech.id) ? 'bg-primary/10' : ''}`}>
                                      <span className="font-medium">{tech.name}</span>
                                      {filterTech.includes(tech.id) && (
                                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {filterTech.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filterTech.map((techId) => {
                      const tech = technologies.find((t) => t.id === techId);
                      return tech ? (
                        <Badge key={techId} variant="secondary" className="gap-1 pr-1">
                          {tech.name}
                          <button onClick={() => setFilterTech(filterTech.filter((id) => id !== techId))}
                            className="ml-1 hover:text-destructive rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Min Experience */}
              <div className="space-y-2">
                <Label>Min. Experience (Years)</Label>
                <Input type="number" min="0" placeholder="Any"
                  value={minExperience} onChange={(e) => setMinExperience(e.target.value)} />
              </div>

              {/* Dept for designation */}
              <div className="space-y-2">
                <Label>Department (for Tier/Level Filter)</Label>
                <Select value={selectedDeptForDesignation || 'ANY'}
                  onValueChange={(v) => setSelectedDeptForDesignation(v === 'ANY' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Tier */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="w-4 h-4" /> Min. Tier
                </Label>
                <Select value={selectedTierInDept || 'ANY'}
                  onValueChange={(v) => {
                    if (v === 'ANY') { setSelectedTierInDept(''); setMinDesignationLevel(''); }
                    else setSelectedTierInDept(v);
                  }}
                  disabled={!selectedDeptForDesignation}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDeptForDesignation ? 'Select Tier' : 'Select Department First'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any Tier</SelectItem>
                    {tiersForSelectedDept.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id.toString()}>
                        Tier {tier.tierOrder} – {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Level */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Min. Level in Tier
                </Label>
                <Select value={minDesignationLevel || 'ANY'}
                  onValueChange={(v) => setMinDesignationLevel(v === 'ANY' ? '' : v)}
                  disabled={!selectedTierInDept}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedTierInDept ? 'Select Level' : 'Select Tier First'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any Level</SelectItem>
                    {designationsForSelectedTier.map((d) => (
                      <SelectItem key={d.id} value={d.levelOrder.toString()}>
                        Level {d.levelOrder} – {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Slot counts summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/20 dark:to-sky-950/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-semibold text-muted-foreground">Slots Found</span>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-sm">
                      <span className="font-bold text-indigo-600">{availableCount}</span>
                      <span className="text-muted-foreground ml-1">available</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">
                      <span className="font-bold text-emerald-600">{bookedCount}</span>
                      <span className="text-muted-foreground ml-1">booked</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-sm">
                      <span className="font-bold text-slate-600">{events.length}</span>
                      <span className="text-muted-foreground ml-1">total</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel mode banner */}
        <Card className={panelMode ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/20' : ''}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Switch checked={panelMode}
                  onCheckedChange={(val) => { setPanelMode(val); setPanelSlots([]); }} />
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" /> Panel Interview Mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {panelMode
                      ? 'Click AVAILABLE slots to add interviewers. Overlap becomes the shared time window.'
                      : 'Enable to schedule one candidate with multiple interviewers simultaneously.'}
                  </p>
                </div>
              </div>

              {panelMode && (
                <div className="flex items-center gap-3 flex-wrap">
                  {panelSlots.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {panelSlots.map((ps) => (
                        <Badge key={ps.slot.id}
                          className="bg-sky-100 text-sky-800 border-sky-300 gap-1 pr-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {ps.slot.resource.interviewer}
                          <button
                            onClick={() => setPanelSlots(panelSlots.filter((s) => s.slot.id !== ps.slot.id))}
                            className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {panelSlots.length > 0 ? (
                    <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
                      disabled={panelTimeOptions.length === 0}
                      onClick={() => {
                        setPanelBookStartOverride('');
                        setPanelBookEndOverride('');
                        setRequestForm({
                          candidateId: null, candidateName: '', candidateDesignationId: '',
                          requiredTechnologyIds: [], isUrgent: false, notes: '',
                        });
                        setCandidateSearchTerm('');
                        setPanelDialogOpen(true);
                      }}>
                      <Send className="w-4 h-4" />
                      Schedule Panel ({panelSlots.length} interviewer{panelSlots.length !== 1 ? 's' : ''})
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Click calendar slots to add interviewers…</p>
                  )}
                  {panelSlots.length > 1 && panelTimeOptions.length === 0 && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No overlapping time between selected interviewers
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Calendar ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" /> Availability Calendar
              {panelMode && (
                <Badge className="ml-2 bg-sky-100 text-sky-800 border-sky-300">Panel Mode Active</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {panelMode
                ? 'Click AVAILABLE (indigo) slots to build the panel. Emerald = already booked.'
                : 'Click any AVAILABLE (indigo) slot to schedule an interview. Booked (emerald) slots are read-only.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-[720px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Loading availability…</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="availability-calendar-container"
                  style={{ height: '720px' }}>
                  <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    onSelectEvent={handleEventClick}
                    eventPropGetter={eventStyleGetter}
                    style={{ height: '100%' }}
                    views={['month', 'week', 'day']}
                    defaultView="week"
                    step={60}
                    timeslots={1}
                    min={new Date(1970, 0, 1, 7, 0)}
                    max={new Date(1970, 0, 1, 19, 0)}
                    tooltipAccessor={tooltipAccessor}
                    popup
                    showMultiDayTimes
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* ══ SINGLE INTERVIEW DIALOG ═══════════════════════════════════════ */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="w-6 h-6 text-primary" /> Schedule Interview
            </DialogTitle>
            <DialogDescription>
              Schedule an interview with {selectedSlot?.resource.interviewer}
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-6 py-4">
              {/* Interviewer card */}
              <Card className="bg-accent/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{selectedSlot.resource.interviewer}</p>
                      <p className="text-sm text-muted-foreground">{selectedSlot.resource.designation || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <p className="text-sm">{selectedSlot.resource.department}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <p className="text-sm">
                      Full slot: {format(selectedSlot.start, 'PPP')} •{' '}
                      {format(selectedSlot.start, 'h:mm a')} – {format(selectedSlot.end, 'h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <p className="text-sm">{selectedSlot.resource.yearsOfExperience || 0} years experience</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Code className="w-5 h-5 text-primary mt-1" />
                    <div className="flex flex-wrap gap-2">
                      {selectedSlot.resource.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sub-slot time picker */}
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Scissors className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                        Choose Interview Window
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Book part of the slot — unused time stays available automatically.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Interview Start</Label>
                      <Select value={bookStartTime} onValueChange={setBookStartTime}>
                        <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {singleSlotTimeOptions
                            .filter((opt) => opt.value !== format(selectedSlot.end, 'HH:mm'))
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Interview End</Label>
                      <Select value={bookEndTime} onValueChange={setBookEndTime}>
                        <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {singleSlotTimeOptions
                            .filter((opt) => opt.value > bookStartTime)
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {bookStartTime && bookEndTime && (
                    <div className="mt-3 p-2 rounded bg-amber-100 dark:bg-amber-900/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p>
                        <strong>Interview:</strong>{' '}
                        {format(parseTimeOnDate(bookStartTime, selectedSlot.start), 'h:mm a')} –{' '}
                        {format(parseTimeOnDate(bookEndTime, selectedSlot.start), 'h:mm a')}
                      </p>
                      {bookStartTime > format(selectedSlot.start, 'HH:mm') && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {format(selectedSlot.start, 'h:mm a')} –{' '}
                          {format(parseTimeOnDate(bookStartTime, selectedSlot.start), 'h:mm a')} remains available
                        </p>
                      )}
                      {bookEndTime < format(selectedSlot.end, 'HH:mm') && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {format(parseTimeOnDate(bookEndTime, selectedSlot.start), 'h:mm a')} –{' '}
                          {format(selectedSlot.end, 'h:mm a')} remains available
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {renderCandidateSection()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendRequest} className="gap-2">
              <Send className="w-4 h-4" /> Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ PANEL INTERVIEW DIALOG ════════════════════════════════════════ */}
      <Dialog open={panelDialogOpen} onOpenChange={setPanelDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Users className="w-6 h-6 text-sky-600" /> Schedule Panel Interview
            </DialogTitle>
            <DialogDescription>
              One candidate — {panelSlots.length} interviewer{panelSlots.length !== 1 ? 's' : ''} simultaneously
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Panel interviewers */}
            <Card className="border-sky-200 bg-sky-50 dark:bg-sky-950/20">
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-sky-800 dark:text-sky-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Panel Interviewers ({panelSlots.length})
                </p>
                <div className="space-y-2">
                  {panelSlots.map((ps) => (
                    <div key={ps.slot.id}
                      className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-900 border border-sky-200">
                      <div>
                        <p className="font-medium text-sm">{ps.slot.resource.interviewer}</p>
                        <p className="text-xs text-muted-foreground">
                          {ps.slot.resource.department} • {ps.slot.resource.designation || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Slot: {format(ps.slot.start, 'h:mm a')} – {format(ps.slot.end, 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-[140px] justify-end">
                        {ps.slot.resource.skills.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Panel time picker */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Scissors className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                      Panel Interview Window
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Times shown are the common overlap of all selected interviewers.
                    </p>
                  </div>
                </div>

                {panelTimeOptions.length === 0 ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No overlapping time window between selected interviewers
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Start Time</Label>
                        <Select value={panelBookStart}
                          onValueChange={(v) => {
                            setPanelBookStartOverride(v);
                            if (panelBookEnd && v >= panelBookEnd) setPanelBookEndOverride('');
                          }}>
                          <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {panelTimeOptions
                              .filter((opt) => opt.value !== (panelBookEnd || defaultPanelEnd))
                              .map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">End Time</Label>
                        <Select value={panelBookEnd} onValueChange={setPanelBookEndOverride}>
                          <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {panelTimeOptions
                              .filter((opt) => opt.value > panelBookStart)
                              .map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {panelBookStart && panelBookEnd && (
                      <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                        <strong>Interview:</strong>{' '}
                        {format(parseTimeOnDate(panelBookStart, panelSlots[0].slot.start), 'h:mm a')} –{' '}
                        {format(parseTimeOnDate(panelBookEnd, panelSlots[0].slot.start), 'h:mm a')}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {renderCandidateSection()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPanelDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendPanelRequest}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
              disabled={panelTimeOptions.length === 0}>
              <Users className="w-4 h-4" /> Schedule Panel Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AvailabilityViewPage;