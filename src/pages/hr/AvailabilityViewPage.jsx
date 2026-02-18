// src/pages/hr/AvailabilityViewPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import {
  Calendar as CalendarIcon,
  Filter,
  X,
  User,
  Mail,
  Briefcase,
  Code,
  Clock,
  Send,
  TrendingUp,
  Award,
  Search,
  Info,
  ChevronDown,
  Users,
  AlertCircle,
  CheckCircle2,
  Scissors,
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
import '../interviewer/AvailabilityCalendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});



const formatLocalDateTime = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

// Generate 30-minute-increment time options between two times
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

// Parse "HH:mm" into a Date on the same day as referenceDate
const parseTimeOnDate = (timeStr, referenceDate) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const AvailabilityViewPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [candidates, setCandidates] = useState([]);

  // ── Filters ──────────────────────────────────────────────────────────
  const [filterDept, setFilterDept] = useState([]);
  const [filterTech, setFilterTech] = useState([]);
  const [techSearchTerm, setTechSearchTerm] = useState('');
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [minExperience, setMinExperience] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedDeptForDesignation, setSelectedDeptForDesignation] = useState('');
  const [minDesignationLevel, setMinDesignationLevel] = useState('');
  const [selectedTierInDept, setSelectedTierInDept] = useState('');
  const [designationsForSelectedDept, setDesignationsForSelectedDept] = useState([]);
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);

  // ── Panel Mode ───────────────────────────────────────────────────────
  const [panelMode, setPanelMode] = useState(false);
  const [panelSlots, setPanelSlots] = useState([]); // { slot: event, bookStart: Date, bookEnd: Date }
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);

  // ── Single Interview Dialog ──────────────────────────────────────────
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Sub-slot time pickers (for slot splitting)
  const [bookStartTime, setBookStartTime] = useState('');
  const [bookEndTime, setBookEndTime] = useState('');

  // Candidate selection
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [requestForm, setRequestForm] = useState({
    candidateId: null,
    candidateName: '',
    candidateDesignationId: '',
    requiredTechnologyIds: [],
    isUrgent: false,
    notes: '',
  });

  const techDropdownRef = useRef(null);

  // ── Lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterDept, filterTech, minExperience, dateRange, selectedDeptForDesignation, selectedTierInDept, minDesignationLevel]);

  useEffect(() => {
    if (selectedDeptForDesignation) {
      loadTiersAndDesignationsForDepartment(selectedDeptForDesignation);
    } else {
      setTiersForSelectedDept([]);
      setDesignationsForSelectedDept([]);
      setSelectedTierInDept('');
      setMinDesignationLevel('');
    }
  }, [selectedDeptForDesignation]);

  useEffect(() => {
    if (selectedTierInDept) {
      loadDesignationsForTier(parseInt(selectedTierInDept));
    } else {
      setDesignationsForSelectedTier([]);
      setMinDesignationLevel('');
    }
  }, [selectedTierInDept]);

  // Close tech dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target)) {
        setShowTechDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Data Loading ─────────────────────────────────────────────────────
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
        description: error.response?.data?.message || 'Failed to load interviewer availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSlots = (data) =>
    data.map((slot) => ({
      id: slot.slotId,
      interviewerId: slot.interviewerId,
      title: `${slot.interviewerName}${slot.technologies?.length ? ' · ' + slot.technologies.slice(0, 2).join(', ') : ''}`,
      start: new Date(slot.startDateTime),
      end: new Date(slot.endDateTime),
      resource: {
        ...slot,
        interviewer: slot.interviewerName,
        department: slot.department,
        designation: slot.designation,
        skills: slot.technologies || [],
        yearsOfExperience: slot.yearsOfExperience,
      },
    }));

  const loadTiersAndDesignationsForDepartment = async (departmentId) => {
    try {
      const [tiersData, designationsData] = await Promise.all([
        tierAPI.getTiersByDepartment(parseInt(departmentId)),
        designationAPI.getDesignationsByDepartment(parseInt(departmentId)),
      ]);
      setTiersForSelectedDept(tiersData.sort((a, b) => a.tierOrder - b.tierOrder));
      setDesignationsForSelectedDept(
        designationsData.sort((a, b) =>
          a.tierOrder !== b.tierOrder ? a.tierOrder - b.tierOrder : a.levelOrder - b.levelOrder
        )
      );
    } catch (error) {
      console.error('Failed to load tiers and designations:', error);
    }
  };

  const loadDesignationsForTier = async (tierId) => {
    try {
      const data = await designationAPI.getDesignationsByTier(tierId);
      setDesignationsForSelectedTier(data.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (error) {
      console.error('Failed to load designations for tier:', error);
    }
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
          ? parseInt(selectedDeptForDesignation)
          : null,
        minTierId: tierOrderToSend,
        minDesignationLevelInDepartment: minDesignationLevel ? parseInt(minDesignationLevel) : null,
      };

      const data = await hrAvailabilityAPI.getAllAvailability(filters);
      setEvents(formatSlots(data));
    } catch (error) {
      console.error('Filter error:', error);
      toast({
        title: 'Error applying filters',
        description: error.response?.data?.message || 'Failed to filter availability',
        variant: 'destructive',
      });
    }
  };

  // ── Event Click ──────────────────────────────────────────────────────
  const handleEventClick = (event) => {
    if (panelMode) {
      // In panel mode: toggle slot selection
      const alreadySelected = panelSlots.some((ps) => ps.slot.id === event.id);
      if (alreadySelected) {
        setPanelSlots(panelSlots.filter((ps) => ps.slot.id !== event.id));
        toast({ title: `Removed ${event.resource.interviewer} from panel` });
      } else {
        // All panel slots must have the same time window, default to first slot's window
        const bookStart = panelSlots.length > 0 ? panelSlots[0].bookStart : event.start;
        const bookEnd = panelSlots.length > 0 ? panelSlots[0].bookEnd : event.end;

        // Validate: this interviewer must be available during the shared window
        if (event.start > bookStart || event.end < bookEnd) {
          toast({
            title: 'Slot conflict',
            description: `${event.resource.interviewer}'s slot doesn't fully cover the panel time window (${format(bookStart, 'h:mm a')} – ${format(bookEnd, 'h:mm a')})`,
            variant: 'destructive',
          });
          return;
        }

        setPanelSlots([...panelSlots, { slot: event, bookStart, bookEnd }]);
        toast({
          title: `Added ${event.resource.interviewer} to panel`,
          description: `${panelSlots.length + 1} interviewer(s) selected`,
        });
      }
      return;
    }

    // Single slot mode: open scheduling dialog
    setSelectedSlot(event);
    setBookStartTime(format(event.start, 'HH:mm'));
    setBookEndTime(format(event.end, 'HH:mm'));
    setRequestForm({
      candidateId: null,
      candidateName: '',
      candidateDesignationId: '',
      requiredTechnologyIds: event.resource.skills
        .map((skill) => {
          const tech = technologies.find((t) => t.name === skill);
          return tech ? tech.id : null;
        })
        .filter(Boolean),
      isUrgent: false,
      notes: '',
    });
    setCandidateSearchTerm('');
    setRequestDialogOpen(true);
  };

  // ── Candidate Selection ──────────────────────────────────────────────
  const handleSelectCandidate = (candidate) => {
    setRequestForm({
      ...requestForm,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDesignationId: candidate.targetDesignationId || '',
    });
    setCandidateSearchTerm('');
  };

  const handleClearCandidate = () => {
    setRequestForm({ ...requestForm, candidateId: null, candidateName: '', candidateDesignationId: '' });
  };

  // ── Single Interview Submit ──────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a candidate name', variant: 'destructive' });
      return;
    }

    // Build actual booking datetimes from the sub-slot time pickers
    const bookStart = parseTimeOnDate(bookStartTime, selectedSlot.start);
    const bookEnd = parseTimeOnDate(bookEndTime, selectedSlot.start);

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
        preferredStartDateTime: `${bookStart.getFullYear()}-${String(bookStart.getMonth()+1).padStart(2,'0')}-${String(bookStart.getDate()).padStart(2,'0')}T${String(bookStart.getHours()).padStart(2,'0')}:${String(bookStart.getMinutes()).padStart(2,'0')}:00`,
        preferredEndDateTime: `${bookEnd.getFullYear()}-${String(bookEnd.getMonth()+1).padStart(2,'0')}-${String(bookEnd.getDate()).padStart(2,'0')}T${String(bookEnd.getHours()).padStart(2,'0')}:${String(bookEnd.getMinutes()).padStart(2,'0')}:00`,
        isUrgent: requestForm.isUrgent,
        notes: requestForm.notes,
      });

      toast({
        title: '✓ Interview scheduled',
        description: `${requestForm.candidateName} with ${selectedSlot.resource.interviewer} — ${format(bookStart, 'h:mm a')}–${format(bookEnd, 'h:mm a')}`,
      });

      setRequestDialogOpen(false);
      setSelectedSlot(null);
      applyFilters(); // Refresh calendar — remaining slot portions will appear
    } catch (error) {
      toast({
        title: 'Failed to schedule interview',
        description: error.response?.data?.message || 'Unable to schedule interview',
        variant: 'destructive',
      });
    }
  };

  // ── Panel Interview Submit ───────────────────────────────────────────
  const handleSendPanelRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a candidate name', variant: 'destructive' });
      return;
    }
    if (panelSlots.length < 1) {
      toast({ title: 'Validation Error', description: 'Select at least 1 interviewer slot', variant: 'destructive' });
      return;
    }

    const bookStart = panelSlots[0].bookStart;
    const bookEnd = panelSlots[0].bookEnd;

    try {
      await hrAvailabilityAPI.createPanelInterview({
        candidateId: requestForm.candidateId,
        candidateName: requestForm.candidateName,
        candidateDesignationId: requestForm.candidateDesignationId || null,
        startDateTime: bookStart.toISOString(),   // ← CHANGE THIS
        endDateTime: bookEnd.toISOString(),        // ← AND THIS
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
      setRequestForm({ candidateId: null, candidateName: '', candidateDesignationId: '', requiredTechnologyIds: [], isUrgent: false, notes: '' });
      applyFilters();
    } catch (error) {
      toast({
        title: 'Failed to schedule panel interview',
        description: error.response?.data?.message || 'Unable to schedule panel interview',
        variant: 'destructive',
      });
    }
  };

  // ── Panel Time Adjustment ────────────────────────────────────────────
  const handlePanelTimeChange = (newStartTime, newEndTime) => {
    if (panelSlots.length === 0) return;
    const referenceSlot = panelSlots[0].slot;
    const newStart = parseTimeOnDate(newStartTime, referenceSlot.start);
    const newEnd = parseTimeOnDate(newEndTime, referenceSlot.start);

    // Validate all selected slots can accommodate the new time window
    for (const ps of panelSlots) {
      if (ps.slot.start > newStart || ps.slot.end < newEnd) {
        toast({
          title: 'Time conflict',
          description: `${ps.slot.resource.interviewer} is not available for the full window`,
          variant: 'destructive',
        });
        return;
      }
    }

    setPanelSlots(panelSlots.map((ps) => ({ ...ps, bookStart: newStart, bookEnd: newEnd })));
  };

  // ── Filters: Tech Selection ──────────────────────────────────────────
  const handleTechSelect = (techId) => {
    setFilterTech(
      filterTech.includes(techId) ? filterTech.filter((id) => id !== techId) : [...filterTech, techId]
    );
  };
  const handleRemoveTech = (techId) => setFilterTech(filterTech.filter((id) => id !== techId));

  const clearFilters = () => {
    setFilterDept([]);
    setFilterTech([]);
    setTechSearchTerm('');
    setMinExperience('');
    setDateRange({ start: null, end: null });
    setSelectedDeptForDesignation('');
    setMinDesignationLevel('');
    setSelectedTierInDept('');
    setDesignationsForSelectedDept([]);
    setTiersForSelectedDept([]);
    setDesignationsForSelectedTier([]);
  };

  // ── Filtered Techs ───────────────────────────────────────────────────
  const filteredTechnologies = techSearchTerm.trim()
    ? technologies.filter(
        (t) =>
          t.name.toLowerCase().includes(techSearchTerm.toLowerCase()) ||
          (t.category && t.category.toLowerCase().includes(techSearchTerm.toLowerCase()))
      )
    : technologies;

  const filteredGroupedTechnologies = filteredTechnologies.reduce((acc, tech) => {
    const cat = tech.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tech);
    return acc;
  }, {});

  // ── Filtered Candidates ──────────────────────────────────────────────
  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
      (c.targetDesignationName &&
        c.targetDesignationName.toLowerCase().includes(candidateSearchTerm.toLowerCase()))
  );

  // ── Calendar Styling ─────────────────────────────────────────────────
  const eventStyleGetter = (event) => {
    const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
    return {
      style: {
        backgroundColor: isInPanel ? '#10b981' : '#6366f1',
        borderRadius: '6px',
        opacity: 0.95,
        color: 'white',
        border: isInPanel ? '2px solid #059669' : '2px solid #4f46e5',
        display: 'block',
        padding: '6px 10px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: isInPanel ? '0 2px 8px rgba(16,185,129,0.4)' : '0 2px 4px rgba(0,0,0,0.08)',
        outline: isInPanel ? '2px solid #34d399' : 'none',
        outlineOffset: '1px',
      },
    };
  };

  // ── Shared candidate form section (reused in both dialogs) ───────────
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
              <Input
                placeholder="Search candidates by name, email, or position..."
                value={candidateSearchTerm}
                onChange={(e) => setCandidateSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {candidateSearchTerm && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {filteredCandidates.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No candidates found. Enter a name manually below.
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => handleSelectCandidate(candidate)}
                        className="w-full p-3 hover:bg-accent text-left transition-colors"
                      >
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
              <Input
                placeholder="Enter candidate name"
                value={requestForm.candidateName}
                onChange={(e) => setRequestForm({ ...requestForm, candidateName: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>Designation (Optional)</Label>
        <Select
          value={requestForm.candidateDesignationId?.toString() || 'NONE'}
          onValueChange={(value) =>
            setRequestForm({ ...requestForm, candidateDesignationId: value === 'NONE' ? '' : parseInt(value) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select designation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            {designations.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea
          placeholder="Any special requirements or notes..."
          value={requestForm.notes}
          onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="urgent"
          checked={requestForm.isUrgent}
          onChange={(e) => setRequestForm({ ...requestForm, isUrgent: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="urgent" className="cursor-pointer text-sm">
          Mark as urgent
        </Label>
      </div>
    </div>
  );

  // ── Time options for selected single slot ────────────────────────────
  const singleSlotTimeOptions = selectedSlot
    ? generateTimeOptions(selectedSlot.start, selectedSlot.end)
    : [];

  // ── Panel time options (based on intersection of all selected slots) ─
  const panelTimeOptions = (() => {
    if (panelSlots.length === 0) return [];
    const latestStart = panelSlots.reduce(
      (max, ps) => (ps.slot.start > max ? ps.slot.start : max),
      panelSlots[0].slot.start
    );
    const earliestEnd = panelSlots.reduce(
      (min, ps) => (ps.slot.end < min ? ps.slot.end : min),
      panelSlots[0].slot.end
    );
    if (latestStart >= earliestEnd) return [];
    return generateTimeOptions(latestStart, earliestEnd);
  })();

  const panelBookStart = panelSlots.length > 0 ? format(panelSlots[0].bookStart, 'HH:mm') : '';
  const panelBookEnd = panelSlots.length > 0 ? format(panelSlots[0].bookEnd, 'HH:mm') : '';

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Interviewer Availability</h1>
            <p className="text-muted-foreground text-lg">
              View and book interviewer availability across teams
            </p>
          </div>
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear Filters
          </Button>
        </motion.div>

        {/* ── Filters ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filterDept.length > 0 ? filterDept[0].toString() : 'ALL'}
                  onValueChange={(value) => setFilterDept(value === 'ALL' ? [] : [parseInt(value)])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Technologies */}
              <div className="space-y-2" ref={techDropdownRef}>
                <Label className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Technologies {filterTech.length > 0 && `(${filterTech.length})`}
                </Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search technologies..."
                      value={techSearchTerm}
                      onChange={(e) => setTechSearchTerm(e.target.value)}
                      onFocus={() => setShowTechDropdown(true)}
                      className="pl-10 pr-10"
                    />
                    <button
                      onClick={() => setShowTechDropdown(!showTechDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showTechDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {showTechDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                      >
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
                                    <button
                                      key={tech.id}
                                      onClick={() => handleTechSelect(tech.id)}
                                      className={`w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center justify-between ${
                                        filterTech.includes(tech.id) ? 'bg-primary/10' : ''
                                      }`}
                                    >
                                      <span className="font-medium">{tech.name}</span>
                                      {filterTech.includes(tech.id) && (
                                        <Badge variant="secondary" className="text-xs">
                                          Selected
                                        </Badge>
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
                          <button
                            onClick={() => handleRemoveTech(techId)}
                            className="ml-1 hover:text-destructive rounded-full hover:bg-destructive/10 p-0.5"
                          >
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
                <Input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={minExperience}
                  onChange={(e) => setMinExperience(e.target.value)}
                />
              </div>

              {/* Min Tier */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Min. Tier in Department
                </Label>
                <Select
                  value={selectedTierInDept || 'ANY'}
                  onValueChange={(value) => {
                    if (value === 'ANY') {
                      setSelectedTierInDept('');
                      setMinDesignationLevel('');
                    } else {
                      setSelectedTierInDept(value);
                      setMinDesignationLevel('');
                    }
                  }}
                  disabled={!selectedDeptForDesignation}
                >
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
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  Shows interviewers in this tier or higher
                </p>
              </div>

              {/* Min Designation Level */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Min. Level in Tier
                </Label>
                <Select
                  value={minDesignationLevel || 'ANY'}
                  onValueChange={(value) => setMinDesignationLevel(value === 'ANY' ? '' : value)}
                  disabled={!selectedTierInDept}
                >
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

            {/* Results count */}
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Available Slots Found:</span>
                <span className="text-3xl font-bold text-primary">{events.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Panel Mode Banner ── */}
        <Card className={panelMode ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : ''}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={panelMode}
                    onCheckedChange={(val) => {
                      setPanelMode(val);
                      setPanelSlots([]);
                    }}
                  />
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Panel Interview Mode
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {panelMode
                        ? 'Click multiple interviewer slots to add them to this panel. All slots must overlap the interview window.'
                        : 'Enable to schedule one candidate with multiple interviewers simultaneously.'}
                    </p>
                  </div>
                </div>
              </div>

              {panelMode && (
                <div className="flex items-center gap-3 flex-wrap">
                  {panelSlots.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {panelSlots.map((ps) => (
                        <Badge
                          key={ps.slot.id}
                          className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 pr-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {ps.slot.resource.interviewer}
                          <button
                            onClick={() => setPanelSlots(panelSlots.filter((s) => s.slot.id !== ps.slot.id))}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {panelSlots.length > 0 ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={() => {
                        setRequestForm({
                          candidateId: null,
                          candidateName: '',
                          candidateDesignationId: '',
                          requiredTechnologyIds: [],
                          isUrgent: false,
                          notes: '',
                        });
                        setCandidateSearchTerm('');
                        setPanelDialogOpen(true);
                      }}
                    >
                      <Send className="w-4 h-4" />
                      Schedule Panel ({panelSlots.length} interviewer{panelSlots.length !== 1 ? 's' : ''})
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Click calendar slots to add interviewers…
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Calendar ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Availability Calendar
              {panelMode && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-300">
                  Panel Mode Active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {panelMode
                ? 'Click slots to add interviewers to the panel. Green = selected.'
                : 'Click any slot to schedule an interview. You can book a portion of the slot — the rest stays available.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-[700px] flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Loading availability…</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="availability-calendar-container"
                  style={{ height: '700px' }}
                >
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
                    tooltipAccessor={(event) =>
                      `${event.resource.interviewer} | ${event.resource.designation || 'N/A'} | ${event.resource.skills.join(', ') || 'No skills listed'}`
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* ════════════════════════════════════════════
          SINGLE INTERVIEW SCHEDULE DIALOG
          ════════════════════════════════════════════ */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="w-6 h-6 text-primary" />
              Schedule Interview
            </DialogTitle>
            <DialogDescription>
              Schedule an interview with {selectedSlot?.resource.interviewer}
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-6 py-4">
              {/* Interviewer Card */}
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

              {/* ── Slot Splitting: Sub-time pickers ── */}
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Scissors className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                        Choose Interview Window
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        You can book part of this slot. The unused time will automatically remain available for other bookings.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Interview Start</Label>
                      <Select value={bookStartTime} onValueChange={setBookStartTime}>
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {singleSlotTimeOptions
                            .filter((opt) => opt.value !== format(selectedSlot.end, 'HH:mm'))
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Interview End</Label>
                      <Select value={bookEndTime} onValueChange={setBookEndTime}>
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {singleSlotTimeOptions
                            .filter((opt) => opt.value > bookStartTime)
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
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
                          {format(parseTimeOnDate(bookStartTime, selectedSlot.start), 'h:mm a')} will remain available
                        </p>
                      )}
                      {bookEndTime < format(selectedSlot.end, 'HH:mm') && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {format(parseTimeOnDate(bookEndTime, selectedSlot.start), 'h:mm a')} –{' '}
                          {format(selectedSlot.end, 'h:mm a')} will remain available
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Candidate + notes */}
              {renderCandidateSection()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest} className="gap-2">
              <Send className="w-4 h-4" />
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
          PANEL INTERVIEW DIALOG
          ════════════════════════════════════════════ */}
      <Dialog open={panelDialogOpen} onOpenChange={setPanelDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Users className="w-6 h-6 text-emerald-600" />
              Schedule Panel Interview
            </DialogTitle>
            <DialogDescription>
              One candidate, {panelSlots.length} interviewer{panelSlots.length !== 1 ? 's' : ''} simultaneously
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Panel Interviewers Summary */}
            <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Panel Interviewers ({panelSlots.length})
                </p>
                <div className="space-y-2">
                  {panelSlots.map((ps, idx) => (
                    <div
                      key={ps.slot.id}
                      className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-900 border border-emerald-200"
                    >
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
                          <Badge key={i} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Panel time picker */}
            {panelSlots.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Scissors className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                        Panel Interview Window
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Choose the interview time. Unused portions of each interviewer's slot will remain available.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Start Time</Label>
                      <Select
                        value={panelBookStart}
                        onValueChange={(val) => handlePanelTimeChange(val, panelBookEnd)}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {panelTimeOptions
                            .filter((opt) => opt.value !== panelBookEnd)
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">End Time</Label>
                      <Select
                        value={panelBookEnd}
                        onValueChange={(val) => handlePanelTimeChange(panelBookStart, val)}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {panelTimeOptions
                            .filter((opt) => opt.value > panelBookStart)
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
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
                  {panelTimeOptions.length === 0 && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      No overlapping time window between selected interviewers
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Candidate + notes */}
            {renderCandidateSection()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPanelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendPanelRequest}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={panelTimeOptions.length === 0 && panelSlots.length > 0}
            >
              <Users className="w-4 h-4" />
              Schedule Panel Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AvailabilityViewPage;