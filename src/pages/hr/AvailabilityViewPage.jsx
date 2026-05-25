import { useLocation } from 'react-router-dom'; 
import React, { useState, useEffect, useRef, useCallback ,useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { useCalendarFormats } from '@/hooks/useCalendarFormats';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,DialogBody,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from 'react-big-calendar';
import { format, startOfDay } from 'date-fns';
import {
  Calendar as CalendarIcon, Filter, X, User, Briefcase, Code, Clock,
  Send, TrendingUp, Award, Search, ChevronDown, Users, AlertCircle,
  CheckCircle2, Scissors, Trash2, ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { technologyAPI } from '@/services/technologyAPI';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI } from '@/services/tierAPI';
import { candidateAPI } from '@/services/candidateAPI';
import { INTERVIEWER_PALETTES, CalendarEventComponent, getEventStyle, getTooltipText } from './utils/AvailabilityViewPageUiUtils';
import { localizer, formatLocalDateTime, formatInputDate, generateTimeOptions, parseTimeOnDate, checkInterviewerPrivilege, checkPanelPrivilege, formatSlots } from './utils/AvailabilityViewPageHelperUtils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/AvailabilityCalendar.css';


const CALENDAR_MIN_HOUR = parseInt(import.meta.env.VITE_CALENDAR_MIN_HOUR || '7');
const CALENDAR_MAX_HOUR = parseInt(import.meta.env.VITE_CALENDAR_MAX_HOUR || '19');
const CALENDAR_PAGE_SIZES = {
  month: 500,
  week: 200,
  day: 100,
};


// ── Component ────────────────────────────────────────────────────────────────
const AvailabilityViewPage = () => {
  const location = useLocation();
  const calendarFormats = useCalendarFormats();
  const { formatDateTimeRange, formatTimeRange } = useFormattedDateTime();
  const [rawSlots, setRawSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('week');
  const [loading, setLoading] = useState(true);
  const navTimerRef = useRef(null);
  const viewTimerRef = useRef(null);
  const [departments, setDepartments] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [candidates, setCandidates] = useState([]);

  const [interviewerColorMap, setInterviewerColorMap] = useState({});

  // Filters
  const [filterDept, setFilterDept] = useState([]);
  const [filterTech, setFilterTech] = useState([]);
  const [selectedTechCategory, setSelectedTechCategory] = useState('');
  const [techSearchTerm, setTechSearchTerm] = useState('');
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [minExperience, setMinExperience] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedDeptForDesignation, setSelectedDeptForDesignation] = useState('');
  const [minDesignationLevel, setMinDesignationLevel] = useState('');
  const [selectedTierInDept, setSelectedTierInDept] = useState('');
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);
  const [pendingFilter, setPendingFilter] = useState(null);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

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

  // Cancel booked dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const techDropdownRef = useRef(null);
  const calendarLockStart = dateRange.start ? new Date(dateRange.start) : null;

  // ── Derived: selected candidate object (for privilege check) ─────────────
  const selectedCandidate = requestForm.candidateId
    ? candidates.find((c) => c.id === requestForm.candidateId) || null
    : null;

  // Single-interview privilege error
  const singlePrivilegeError = selectedSlot && selectedCandidate
    ? checkInterviewerPrivilege(selectedSlot.resource, selectedCandidate)
    : null;

  // Panel privilege errors
  const panelPrivilegeErrors = panelSlots.length > 0 && selectedCandidate
    ? checkPanelPrivilege(panelSlots, selectedCandidate)
    : [];

    const eventStyleGetter = useCallback((event) => 
    getEventStyle(event, panelSlots), 
  [panelSlots]);

  const tooltipAccessor = useCallback((event) => 
    getTooltipText(event, panelSlots, formatTimeRange), 
  [panelSlots, formatTimeRange]);

  // For the calendar components prop
  const calendarComponents = useMemo(() => ({
    event: (props) => <CalendarEventComponent {...props} panelSlots={panelSlots} />
  }), [panelSlots]);


  // ── Initial load ──────────────────────────────────────────────────────────
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const { start, end } = computeRangeForView(currentView, calendarDate);
        const initialAvailabilityFilters = {
          startDateTime: formatLocalDateTime(start),
          endDateTime: formatLocalDateTime(end),
          page: 0,
          size: getCalendarPageSize(currentView),
        };
        const [availData, deptData, techData, desigData, tierData, candData] = await Promise.all([
          // Load initial availability for visible range
          hrAvailabilityAPI.getAllAvailability(initialAvailabilityFilters),
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
        setCandidates(candData);
        setRawSlots(availData);
        setEvents(formatSlots(availData, buildColorMap(availData)));
      } catch (err) {
        toast(
          { title: 'Error loading availability', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };



// ── Build color map ────────────────────────────────────────────────────────
   const buildColorMap = (slots) => {
    const map = {};
    let idx = 0;
    slots.forEach((slot) => {
      const id = slot.interviewerId;
      if (id && !(id in map)) {
        map[id] = idx % INTERVIEWER_PALETTES.length;
        idx++;
      }
    });
    setInterviewerColorMap(map);
    return map;
  };

    useEffect(() => {
      // initial load
      loadInitialData();
  }, []);




  useEffect(() => {
    const incomingFilter = location.state?.filterData;
    
    if (incomingFilter) {
      console.log('Applying incoming filter from navigation state:', incomingFilter);
      setPendingFilter(incomingFilter);
      
      // 1. Set the Date Range
      setDateRange({ 
        start: new Date(incomingFilter.startDateTime), 
        end: null 
      });

      // 2. Set Department
      if (incomingFilter.departmentId) {
        setFilterDept([incomingFilter.departmentId]);
        setSelectedDeptForDesignation(incomingFilter.departmentId.toString());
      }

      // 3. Set the pre-selected candidate for the Booking Dialog later
      setRequestForm(prev => ({
        ...prev,
        candidateId: incomingFilter.candidateId,
        candidateName: incomingFilter.candidateName
      }));
    }
  }, [location.state]);


  

  useEffect(() => {
    if (pendingFilter && tiersForSelectedDept.length > 0) {
      const { minTierOrder } = pendingFilter;
     
      if (minTierOrder != null) {
        const matchingTier = tiersForSelectedDept.find(t => t.tierOrder === minTierOrder);
        if (matchingTier) {
          setSelectedTierInDept(matchingTier.id.toString());
        } 
      }
    }
  }, [pendingFilter, tiersForSelectedDept]);



  
  useEffect(() => {
    if (selectedDeptForDesignation) {
      loadTiersForDept(selectedDeptForDesignation);
    }
    else {
        setTiersForSelectedDept([]);
        setSelectedTierInDept('');
        setMinDesignationLevel(''); 
      }
  }, [selectedDeptForDesignation]);


  useEffect(() => {
    if (selectedTierInDept) {
      loadDesignationsForTier(parseInt(selectedTierInDept));
    }else {
      setDesignationsForSelectedTier([]);
      setMinDesignationLevel(''); }
  }, [selectedTierInDept]);



  useEffect(() => {
    if (dateRange.start) {
      setCalendarDate(new Date(dateRange.start));
    }
  }, [dateRange.start]);

  const computeRangeForView = (view, date) => {
    const d = date ? new Date(date) : new Date();
    switch ((view || 'week')) {
      case 'month': return { start: startOfMonth(d), end: endOfMonth(d) };
      case 'day': return { start: startOfDay(d), end: endOfDay(d) };
      case 'week':
      default: return { start: startOfWeek(d, { weekStartsOn: 0 }), end: endOfWeek(d, { weekStartsOn: 0 }) };
    }
  };

  const getCalendarPageSize = (view) => CALENDAR_PAGE_SIZES[view] || CALENDAR_PAGE_SIZES.week;

  const buildCalendarAvailabilityFilters = (view, date, overrides = {}) => {
    const { start, end } = computeRangeForView(view, date || calendarDate);
    return {
      startDateTime: formatLocalDateTime(start),
      endDateTime: formatLocalDateTime(end),
      departmentIds: filterDept.length > 0 ? filterDept : null,
      technologyIds: filterTech.length > 0 ? filterTech : null,
      minYearsOfExperience: minExperience ? parseInt(minExperience) : null,
      page: 0,
      size: getCalendarPageSize(view),
      ...overrides,
    };
  };

  // Simple toolbar with loading indicator
  const HRCalendarToolbar = ({ label, onNavigate, onView, view, views, loading }) => {
    const viewList = Array.isArray(views) ? views : Object.keys(views || {});
    return (
      <div className="rbc-toolbar flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('PREV')} className="btn">Prev</button>
          <button onClick={() => onNavigate('TODAY')} className="btn">Today</button>
          <button onClick={() => onNavigate('NEXT')} className="btn">Next</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="rbc-toolbar-label text-base font-semibold">{label}</span>
          {loading && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin ml-2" />}
          {viewList.map(v => (
            <button key={v} onClick={() => onView(v)} className={`btn ${v === view ? 'btn-primary' : ''}`}>{v}</button>
          ))}
        </div>
      </div>
    );
  };

  const fetchAvailabilityForView = async (view, date) => {
    try {
      setLoading(true);
      const filters = buildCalendarAvailabilityFilters(view, date || calendarDate);
      const data = await hrAvailabilityAPI.getAllAvailability(filters);
      const colorMap = buildColorMap(data);
      setRawSlots(data);
      setEvents(formatSlots(data, colorMap));
    } catch (err) {
      toast({ title: 'Error loading availability', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };


  
  // ── Auto-set Level from pending filter ───────────────────────────────────────
  useEffect(() => {
    if (pendingFilter && designationsForSelectedTier.length > 0) {
      const { minLevelOrder } = pendingFilter;      
      if (minLevelOrder != null) {
        // Find the designation with matching levelOrder
        const matchingDesignation = designationsForSelectedTier.find(d => d.levelOrder === minLevelOrder);
        if (matchingDesignation) {
          setMinDesignationLevel(matchingDesignation.levelOrder.toString());
        }
      }
      setPendingFilter(null);
    }
  }, [pendingFilter, designationsForSelectedTier]);

  useEffect(() => {
    const handle = (e) => {
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target))
        setShowTechDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
  if (loading || (pendingFilter && !selectedTierInDept)) return;

  applyFilters();
}, [
  filterDept, filterTech, minExperience, dateRange,
  selectedDeptForDesignation, selectedTierInDept, minDesignationLevel,
  pendingFilter
]);

  
  
  // ── Auto-set candidate designation after candidates load ─────────────────
  useEffect(() => {
    if (requestForm.candidateId && candidates.length > 0) {
      const candidate = candidates.find(c => c.id === requestForm.candidateId);
      if (candidate && candidate.targetDesignationId) {
        setRequestForm(prev => ({
          ...prev,
          candidateDesignationId: candidate.targetDesignationId
        }));
      }
    }
  }, [requestForm.candidateId, candidates]);




  // ── Data helpers ──────────────────────────────────────────────────────────
  const loadTiersForDept = async (deptId) => {
    try {
      const data = await tierAPI.getTiersByDepartment(parseInt(deptId));
      setTiersForSelectedDept(data.sort((a, b) => a.tierOrder - b.tierOrder));
    } catch (e) { console.error(e); }
  };

  const loadDesignationsForTier = async (tierId) => {
    try {
      const data = await designationAPI.getDesignationsByTier(tierId);
      setDesignationsForSelectedTier(data.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (e) { console.error(e); }
  };

  const applyFilters = async () => {
    try {
      let tierOrderToSend = null;
      if (selectedTierInDept) {
        const t = tiersForSelectedDept.find((t) => t.id.toString() === selectedTierInDept);
        tierOrderToSend = t ? t.tierOrder : null;
      }

      let levelOrderToSend = null;
      if (minDesignationLevel) {
        const d = designationsForSelectedTier.find((d) => d.levelOrder.toString() === minDesignationLevel);
        levelOrderToSend = d ? d.levelOrder : null;
      }

      const visibleRange = computeRangeForView(currentView, calendarDate);
      const filters = {
        ...buildCalendarAvailabilityFilters(currentView, calendarDate),
        startDateTime: formatLocalDateTime(dateRange.start || visibleRange.start),
        endDateTime: formatLocalDateTime(dateRange.end || visibleRange.end),
        departmentIdForDesignationFilter: selectedDeptForDesignation ? parseInt(selectedDeptForDesignation) : null,
        minTierId: tierOrderToSend,
        minDesignationLevelInDepartment: levelOrderToSend,
      };

    
      const data = await hrAvailabilityAPI.getAllAvailability(filters);  
      const byStatus = data.reduce((acc, slot) => {
        acc[slot.status] = (acc[slot.status] || 0) + 1;
        return acc;
      }, {});
     
      const colorMap = buildColorMap(data);
      setRawSlots(data);
      setEvents(formatSlots(data, colorMap));
    } catch (err) {
      toast({ title: 'Filter error', description: err.message, variant: 'destructive' });
    }
  };

  const refreshCalendar = async () => {
    const data = await hrAvailabilityAPI.getAllAvailability(
      buildCalendarAvailabilityFilters(currentView, calendarDate)
    );
    const colorMap = buildColorMap(data);
    setRawSlots(data);
    setEvents(formatSlots(data, colorMap));
  };

  // ── Cancel booked interview ───────────────────────────────────────────────
  const openCancelDialog = (event) => {
    setCancelTarget(event);
    setCancelDialogOpen(true);
  };

  const handleCancelBooked = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const requestId = cancelTarget.resource.requestId;
      if (!requestId) throw new Error('No request ID on this slot — cannot cancel from calendar.');
      await hrAvailabilityAPI.cancelInterviewRequest(requestId);
      toast({
        title: '✓ Interview cancelled',
        description: `${cancelTarget.resource.interviewer}'s slot is now available again. Interviewer notified.`,
      });
      setCancelDialogOpen(false);
      setCancelTarget(null);
      await refreshCalendar();
    } catch (err) {
      toast({ title: 'Cancel failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  // ── Event click ───────────────────────────────────────────────────────────
  const handleEventClick = (event) => {

    if (calendarLockStart && event.start < calendarLockStart) {
    toast({ 
      title: "Slot unavailable", 
      description: "You cannot book an interview in the past or before the selected filter start time.",
      variant: "destructive" 
    });
    return;
  }
    const isBooked = event.resource?.status === 'BOOKED';

    if (isBooked) {
      openCancelDialog(event);
      return;
    }

    if (panelMode) {
      const alreadySelected = panelSlots.some((ps) => ps.slot.id === event.id);
      if (alreadySelected) {
        setPanelSlots(panelSlots.filter((ps) => ps.slot.id !== event.id));
        toast({ title: `Removed ${event.resource.interviewer} from panel` });
      } else {
        setPanelSlots([...panelSlots, { slot: event, bookStart: event.start, bookEnd: event.end }]);
        toast({ title: `Added ${event.resource.interviewer} to panel`, description: `${panelSlots.length + 1} selected` });
      }
      return;
    }

    setSelectedSlot(event);
    setBookStartTime(format(event.start, 'HH:mm'));
    setBookEndTime(format(event.end, 'HH:mm'));
    setRequestForm(prev => ({
      candidateId: prev.candidateId, 
      candidateName: prev.candidateName, 
      candidateDesignationId: prev.candidateDesignationId,
      requiredTechnologyIds: event.resource.skills.map((s) => {
        const t = technologies.find((t) => t.name === s);
        return t?.id || null;
      }).filter(Boolean),
      isUrgent: false, notes: '',
    }));
    setCandidateSearchTerm('');
    setRequestDialogOpen(true);
    
  };


  // ── Candidate helpers ─────────────────────────────────────────────────────
  const handleSelectCandidate = (c) =>
    setRequestForm({ ...requestForm, candidateId: c.id, candidateName: c.name, candidateDesignationId: c.targetDesignationId || '' });

  const handleClearCandidate = () =>
    setRequestForm({ ...requestForm, candidateId: null, candidateName: '', candidateDesignationId: '' });

  // ── Submit single interview ───────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({ title: 'Enter candidate name', variant: 'destructive' }); return;
    }
    // Privilege gate
    if (singlePrivilegeError) {
      toast({ title: '⛔ Insufficient interviewer privilege', description: singlePrivilegeError, variant: 'destructive' }); return;
    }
    const bookStart = parseTimeOnDate(bookStartTime, selectedSlot.start);
    const bookEnd   = parseTimeOnDate(bookEndTime,   selectedSlot.start);
    if (bookEnd <= bookStart) {
      toast({ title: 'End must be after start', variant: 'destructive' }); return;
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
      toast({ title: '✓ Interview scheduled', description: `${requestForm.candidateName} with ${selectedSlot.resource.interviewer}` });
      setRequestDialogOpen(false);
      setSelectedSlot(null);
      await refreshCalendar();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  // ── Submit panel interview ────────────────────────────────────────────────
  const handleSendPanelRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({ title: 'Enter candidate name', variant: 'destructive' }); return;
    }
    if (panelSlots.length < 1) {
      toast({ title: 'Select at least 1 interviewer', variant: 'destructive' }); return;
    }
    if (panelTimeOptions.length === 0) {
      toast({ title: 'No overlapping time', variant: 'destructive' }); return;
    }
    // Privilege gate — block if any panel interviewer is under-qualified
    if (panelPrivilegeErrors.length > 0) {
      toast({
        title: '⛔ Insufficient interviewer privilege',
        description: panelPrivilegeErrors.map((e) => `${e.name}: ${e.reason}`).join('\n'),
        variant: 'destructive',
      }); return;
    }
    const bookStart = parseTimeOnDate(panelBookStart, panelSlots[0].slot.start);
    const bookEnd   = parseTimeOnDate(panelBookEnd,   panelSlots[0].slot.start);
    if (bookEnd <= bookStart) {
      toast({ title: 'End must be after start', variant: 'destructive' }); return;
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
      toast({ title: '✓ Panel interview scheduled', description: `${requestForm.candidateName} with ${panelSlots.length} interviewer(s)` });
      setPanelDialogOpen(false);
      setPanelSlots([]);
      setRequestForm({ candidateId: null, candidateName: '', candidateDesignationId: '', requiredTechnologyIds: [], isUrgent: false, notes: '' });
      await refreshCalendar();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  // ── Panel time overlap ────────────────────────────────────────────────────
  const panelTimeOptions = (() => {
    if (panelSlots.length === 0) return [];
    const latestStart = panelSlots.reduce((max, ps) => ps.slot.start > max ? ps.slot.start : max, panelSlots[0].slot.start);
    const earliestEnd = panelSlots.reduce((min, ps) => ps.slot.end < min ? ps.slot.end : min, panelSlots[0].slot.end);
    if (latestStart >= earliestEnd) return [];
    return generateTimeOptions(latestStart, earliestEnd);
  })();

  const defaultPanelStart = panelTimeOptions.length > 0 ? panelTimeOptions[0].value : '';
  const defaultPanelEnd   = panelTimeOptions.length > 0 ? panelTimeOptions[panelTimeOptions.length - 1].value : '';
  const [panelBookStartOverride, setPanelBookStartOverride] = useState('');
  const [panelBookEndOverride, setPanelBookEndOverride]     = useState('');
  const panelBookStart = panelBookStartOverride || defaultPanelStart;
  const panelBookEnd   = panelBookEndOverride   || defaultPanelEnd;

  useEffect(() => {
    setPanelBookStartOverride('');
    setPanelBookEndOverride('');
  }, [panelSlots.length]);

  // ── Tech filter helpers ───────────────────────────────────────────────────
  const handleDepartmentChange = (value) => {
    const departmentId = value && value !== 'ALL' && value !== 'ANY' ? value.toString() : '';
    setFilterDept(departmentId ? [parseInt(departmentId, 10)] : []);
    setSelectedDeptForDesignation(departmentId);
    setSelectedTierInDept('');
    setMinDesignationLevel('');
    setDesignationsForSelectedTier([]);
    if (!departmentId) setTiersForSelectedDept([]);
  };

  const handleTechSelect = (id) =>
    setFilterTech(filterTech.includes(id) ? filterTech.filter((x) => x !== id) : [...filterTech, id]);

  const clearFilters = () => {
    setFilterDept([]); setFilterTech([]); setSelectedTechCategory(''); setTechSearchTerm(''); setMinExperience('');
    setDateRange({ start: null, end: null }); setSelectedDeptForDesignation('');
    setMinDesignationLevel(''); setSelectedTierInDept('');
    setTiersForSelectedDept([]); setDesignationsForSelectedTier([]);
    setPendingFilter(null);
    setCalendarDate(new Date());
  };

  const handleStartDateTimeChange = (value) => {
    if (!value) {
      setDateRange((prev) => ({ ...prev, start: null }));
      return;
    }

    const nextStart = new Date(value);
    if (Number.isNaN(nextStart.getTime())) return;

    setDateRange((prev) => ({ ...prev, start: nextStart }));
  };

  const calendarDayPropGetter = useCallback((date) => {
    if (!calendarLockStart) return {};

    const currentDay = startOfDay(date);
    const lockDay = startOfDay(calendarLockStart);
    if (currentDay < lockDay) {
      return {
        style: {
          backgroundColor: '#f3f4f6',
          color: '#9ca3af',
          opacity: 0.45,
          filter: 'grayscale(1)',
        },
      };
    }

    return {};
  }, [calendarLockStart]);

const calendarSlotPropGetter = useCallback((date) => {
  if (!calendarLockStart) return {};

  // If the slot is on a day BEFORE the lock date, OR
  // if it's the SAME day but the time is earlier than the lock time
  if (date < calendarLockStart) {
    return {
      style: {
        backgroundColor: '#f3f4f6',
        color: '#9ca3af',
        opacity: 0.5,
        pointerEvents: 'none', // Prevents clicking the slot
        cursor: 'not-allowed',
      },
    };
  }

  return {};
}, [calendarLockStart]);
  const technologyCategories = useMemo(() => {
    const categories = Array.from(new Set(technologies.map((tech) => tech.category || 'Other')))
      .sort((a, b) => a.localeCompare(b));
    return categories;
  }, [technologies]);

  const filteredTechnologies = useMemo(() => {
    return technologies
      .filter((tech) => !selectedTechCategory || (tech.category || 'Other') === selectedTechCategory)
      .filter((tech) => !techSearchTerm.trim() || tech.name.toLowerCase().includes(techSearchTerm.toLowerCase()));
  }, [technologies, selectedTechCategory, techSearchTerm]);

  const filteredCandidates = candidates.filter((c) =>
    c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearchTerm.toLowerCase()));

  const availableCount = events.filter((e) => e.resource?.status === 'AVAILABLE').length;
  const bookedCount    = events.filter((e) => e.resource?.status === 'BOOKED').length;

  const interviewerLegend = Object.entries(interviewerColorMap)
    .map(([id, idx]) => {
      const ev = events.find((e) => String(e.interviewerId) === String(id));
      return { id, name: ev?.resource?.interviewer || `#${id}`, palette: INTERVIEWER_PALETTES[idx] };
    })
    .slice(0, 20);

  // ── Candidate section (shared between single + panel dialogs) ─────────────
  const renderCandidateSection = (privilegeError) => (
    <div className="space-y-4">
      {/* ── Privilege warning ─────────────────────────────────────────── */}
      {privilegeError && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Interviewer privilege too low</p>
            <p className="text-xs text-red-700 mt-0.5">{privilegeError}</p>
          </div>
        </div>
      )}
      {/* Multiple panel privilege errors */}
      {Array.isArray(privilegeError) && privilegeError.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Some interviewers have insufficient privilege</p>
            {privilegeError.map((e, i) => (
              <p key={i} className="text-xs text-red-700 mt-0.5">• <strong>{e.name}:</strong> {e.reason}</p>
            ))}
          </div>
        </div>
      )}

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
                {selectedCandidate?.targetDesignationName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Target: {selectedCandidate.targetDesignationName}
                    {selectedCandidate.targetDesignationTierOrder != null && (
                      <span className="ml-1 text-indigo-600">(Tier {selectedCandidate.targetDesignationTierOrder})</span>
                    )}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearCandidate}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search candidates…" value={candidateSearchTerm}
                onChange={(e) => setCandidateSearchTerm(e.target.value)} className="pl-10" />
            </div>
            {candidateSearchTerm && (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {filteredCandidates.length === 0
                  ? <p className="p-4 text-center text-sm text-muted-foreground">No candidates found.</p>
                  : filteredCandidates.map((c) => (
                    <button key={c.id} onClick={() => handleSelectCandidate(c)}
                      className="w-full p-3 hover:bg-accent text-left transition-colors">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.email}</p>
                      {c.targetDesignationName && (
                        <p className="text-xs text-indigo-600 mt-0.5">Target: {c.targetDesignationName}</p>
                      )}
                    </button>
                  ))
                }
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Or enter manually</Label>
              <Input placeholder="Candidate name" value={requestForm.candidateName}
                onChange={(e) => setRequestForm({ ...requestForm, candidateName: e.target.value })} />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>Designation (Optional)</Label>
        <Select
          value={requestForm.candidateDesignationId?.toString() || 'NONE'}
          onValueChange={(v) => setRequestForm({ ...requestForm, candidateDesignationId: v === 'NONE' ? '' : parseInt(v) })}>
          <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            {designations.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea placeholder="Special requirements…" value={requestForm.notes}
          onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} rows={3} />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="urgent" checked={requestForm.isUrgent}
          onChange={(e) => setRequestForm({ ...requestForm, isUrgent: e.target.checked })} className="rounded" />
        <Label htmlFor="urgent" className="cursor-pointer text-sm">Mark as urgent</Label>
      </div>
    </div>
  );

  const singleSlotTimeOptions = selectedSlot ? generateTimeOptions(selectedSlot.start, selectedSlot.end) : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Interviewer Availability</h1>
            {/* <p className="text-muted-foreground text-lg">
              View and book interviewer availability · each color = one interviewer
            </p> */}
          </div>
         
        </motion.div>

        {/* Interviewer color legend */}
        {/* {interviewerLegend.length > 0 && (
          <div className="hr-interviewer-legend">
            {interviewerLegend.map(({ id, name, palette }) => (
              <div key={id} className="hr-interviewer-legend-chip"
                style={{ borderColor: palette.solid + '60', background: palette.solid + '12', color: palette.solid }}>
                <div className="hr-interviewer-legend-dot" style={{ backgroundColor: palette.solid }} />
                {name}
              </div>
            ))}
            <div className="hr-interviewer-legend-chip"
              style={{ borderColor: '#10b98160', background: '#10b98112', color: '#10b981' }}>
              <div className="hr-interviewer-legend-dot" style={{ backgroundColor: '#10b981' }} />
              🔒 Booked (click to cancel)
            </div>
          </div>
        )} */}

        {/* Slot counts */}
        {/* <div className="flex items-center gap-6 px-1 flex-wrap">
          {[
            { color: '#6366f1', label: 'Available slots', count: availableCount, textColor: 'text-indigo-600' },
            { color: '#10b981', label: 'Booked slots',    count: bookedCount,    textColor: 'text-emerald-600' },
            { color: '#0ea5e9', label: 'Panel selected',  count: panelSlots.length, textColor: 'text-sky-600' },
          ].map(({ color, label, count, textColor }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md shadow-sm" style={{ background: color }} />
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              {count > 0 && <span className={`text-xs font-bold ${textColor} px-1.5 py-0.5 rounded-full`}>{count}</span>}
            </div>
          ))}
        </div> */}

        {/* Filters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFiltersCollapsed((value) => !value)}
              className="h-9 gap-2"
              aria-expanded={!isFiltersCollapsed}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isFiltersCollapsed ? '-rotate-90' : ''}`} />
              {isFiltersCollapsed ? 'Show' : 'Hide'}
            </Button>
          </CardHeader>
          {!isFiltersCollapsed && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={filterDept.length > 0 ? filterDept[0].toString() : 'ALL'}
                  onValueChange={handleDepartmentChange}>
                  <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2" ref={techDropdownRef}>
                <Label>Categories</Label>
                  <Select
                    value={selectedTechCategory || 'NONE'}
                    onValueChange={(value) => {
                      setSelectedTechCategory(value === 'NONE' ? '' : value);
                      setShowTechDropdown(false);
                      setTechSearchTerm('');
                      // preserve already-selected technologies so user can pick across categories
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">All Categories</SelectItem>
                      {technologyCategories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>

                <div className="space-y-1">
                  <Label >Technologies</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={'Select technologies…'}
                      disabled={!selectedTechCategory}
                      value={techSearchTerm}
                      onChange={(e) => setTechSearchTerm(e.target.value)}
                      onFocus={() => setShowTechDropdown(true)}
                      className="pl-10 pr-10"
                    />
                    <button
                      onClick={() => setShowTechDropdown(!showTechDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showTechDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {selectedTechCategory && showTechDropdown && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                        {filteredTechnologies.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No technologies found</div>
                        ) : (
                          <div className="py-2">
                            {filteredTechnologies.map((tech) => (
                              <button key={tech.id} onClick={() => handleTechSelect(tech.id)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center justify-between ${filterTech.includes(tech.id) ? 'bg-primary/10' : ''}`}>
                                <span className="font-medium">{tech.name}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{tech.category || 'Other'}</span>
                                  {filterTech.includes(tech.id) && <Badge variant="secondary" className="text-xs">Selected</Badge>}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                

                {filterTech.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filterTech.map((id) => {
                      const tech = technologies.find((t) => t.id === id);
                      return tech ? (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {tech.name}
                          <button onClick={() => setFilterTech(filterTech.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
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

              {/* <div className="space-y-2">
                <Label>Department (Tier/Level Filter)</Label>
                <Select value={selectedDeptForDesignation || 'ANY'}
                  onValueChange={handleDepartmentChange}>
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div> */}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="w-4 h-4" /> Min. Tier</Label>
                <Select value={selectedTierInDept || 'ANY'}
                  onValueChange={(v) => { if (v === 'ANY') { setSelectedTierInDept(''); setMinDesignationLevel(''); } else setSelectedTierInDept(v); }}
                  disabled={!selectedDeptForDesignation}>
                  <SelectTrigger><SelectValue placeholder={selectedDeptForDesignation ? 'Select Tier' : 'Select Department First'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any Tier</SelectItem>
                    {tiersForSelectedDept.map((t) => <SelectItem key={t.id} value={t.id.toString()}>Tier {t.tierOrder} – {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Min. Designation </Label>
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
                  type="date"
                  value={formatInputDate(dateRange.start)}
                  onChange={(e) => handleStartDateTimeChange(e.target.value)}
                />
              </div>

              
            </div>

            

 
            

            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/20 dark:to-sky-950/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-semibold text-muted-foreground">Slots Shown </span>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-sm"><span className="font-bold text-indigo-600">{availableCount}</span><span className="text-muted-foreground ml-1">available</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm"><span className="font-bold text-emerald-600">{bookedCount}</span><span className="text-muted-foreground ml-1">booked</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-sm"><span className="font-bold text-slate-600">{events.length}</span><span className="text-muted-foreground ml-1">total</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={clearFilters} className="gap-2">
                     <X className="w-4 h-4" /> Clear Filters
                  </Button>
                </div>
                </div>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        {/* Panel mode banner */}
        <Card className={panelMode ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/20' : '' }>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Switch checked={panelMode} onCheckedChange={(v) => { setPanelMode(v); setPanelSlots([]); }} />
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" /> Panel Interview Mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {panelMode
                      ? 'Click AVAILABLE slots to add interviewers. Selected slots show a ✓ badge. Overlap window calculated automatically.'
                      : 'Enable to schedule one candidate with multiple interviewers at the same time.'}
                  </p>
                </div>
              </div>

              {panelMode && (
                <div className="flex items-center gap-3 flex-wrap">
                  {panelSlots.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {panelSlots.map((ps) => (
                        <Badge key={ps.slot.id} className="bg-sky-100 text-sky-800 border-sky-300 gap-1 pr-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {ps.slot.resource.interviewer}
                          <button onClick={() => setPanelSlots(panelSlots.filter((s) => s.slot.id !== ps.slot.id))}
                            className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {panelSlots.length > 0 ? (
                    <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
                      disabled={panelTimeOptions.length === 0}
                      onClick={() => {
                        setPanelBookStartOverride(''); setPanelBookEndOverride('');
                        setRequestForm(prev => ({ candidateId: prev.candidateId, candidateName: prev.candidateName, candidateDesignationId: prev.candidateDesignationId, requiredTechnologyIds: [], isUrgent: false, notes: '' }));
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
                      <AlertCircle className="w-3 h-3" /> No overlapping time
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Calendar ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" /> Availability Calendar
              {panelMode && <Badge className="ml-2 bg-sky-100 text-sky-800 border-sky-300">Panel Mode</Badge>}
            </CardTitle>
            <CardDescription>
              {panelMode
                ? 'Click AVAILABLE slots to build a panel — selected slots show a ✓ badge. Overlap window is calculated automatically.'
                : 'Each color = a different interviewer. Click AVAILABLE to schedule · Click BOOKED (green) to cancel & restore.'}
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
                  className="availability-calendar-container hr-calendar"
                  style={{ width: '100%', height : '65vh' }}>

                  <Calendar
                    localizer={localizer}
                    components={{ ...calendarComponents, toolbar: (toolbarProps) => <HRCalendarToolbar {...toolbarProps} loading={loading} /> }}
                    events={events}
                    date={calendarDate}
                    onNavigate={(nextDate) => {
                      const nextDay = startOfDay(nextDate);
                      if (calendarLockStart && nextDay < calendarLockStart) {
                        setCalendarDate(calendarLockStart);
                        return;
                      }
                      setCalendarDate(nextDay);
                      // Debounce navigation fetches
                      if (navTimerRef.current) clearTimeout(navTimerRef.current);
                      navTimerRef.current = setTimeout(() => fetchAvailabilityForView(currentView, nextDay), 200);
                    }}
                    startAccessor="start"
                    endAccessor="end"
                    scrollToTime={calendarLockStart ? 
                    calendarLockStart : new Date(1970, 0, 1, CALENDAR_MIN_HOUR, 0)}
                    onSelectEvent={handleEventClick}
                    eventPropGetter={eventStyleGetter}
                    dayPropGetter={calendarDayPropGetter}
                    slotPropGetter={calendarSlotPropGetter}
                    
                    style={{ height: '100%' }}
                    views={['month', 'week', 'day']}
                    defaultView="week"
                    onView={(view) => {
                      setCurrentView(view);
                      // Debounce view change fetches
                      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
                      viewTimerRef.current = setTimeout(() => fetchAvailabilityForView(view, calendarDate), 200);
                    }}
                    step={60}
                    timeslots={1}
                    min={new Date(1970, 0, 1, 0, 0, 0)}
                    max={new Date(1970, 0, 1, 23, 59, 59)}
                    tooltipAccessor={tooltipAccessor}
                    popup
                    showMultiDayTimes
                    formats={{
                      timeGutterFormat: calendarFormats.timeGutterFormat,
                      eventTimeRangeFormat: calendarFormats.eventTimeRangeFormat,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* ══ CANCEL BOOKED DIALOG ═══════════════════════════════════════════ */}
      <Dialog open={cancelDialogOpen} onOpenChange={(o) => { if (!cancelling) setCancelDialogOpen(o); }}>
        <DialogContent className="px-3 py-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Cancel Interview
            </DialogTitle>
            <DialogDescription>
              The slot will be immediately restored to <strong>Available</strong> and the interviewer will be notified.
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4 space-y-2">
              <p className="font-semibold text-sm">🔒 Booked Interview</p>
              <p className="text-sm">Interviewer: <strong>{cancelTarget.resource.interviewer}</strong></p>
              {cancelTarget.resource.candidateName && (
                <p className="text-sm">Candidate: <strong>{cancelTarget.resource.candidateName}</strong></p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDateTimeRange(cancelTarget.start, cancelTarget.end)}
              </p>
            </div>
          )}

          <DialogFooter >
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
              Keep Interview
            </Button>
            <Button variant="destructive" onClick={handleCancelBooked} disabled={cancelling} className="gap-2">
              {cancelling ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cancelling…</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Cancel & Restore Slot</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ SINGLE INTERVIEW DIALOG ════════════════════════════════════════ */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="w-6 h-6 text-primary" /> Schedule Interview
            </DialogTitle>
            {/* <DialogDescription>
              Schedule an interview with {selectedSlot?.resource.interviewer}
            </DialogDescription> */}
          </DialogHeader>
          <DialogBody>
          {selectedSlot && (
            <div className="space-y-2">
              {/* Interviewer info */}
              <Card className="bg-accent/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* <div className="w-3 h-3 rounded-full" */}
                      {/* // style={{ backgroundColor: INTERVIEWER_PALETTES[selectedSlot.paletteIdx]?.solid || '#6366f1' }} /> */}
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{selectedSlot.resource.interviewer}</p>
                      <p className="text-sm text-muted-foreground">{selectedSlot.resource.designation || 'N/A'}
                        {selectedSlot.resource.interviewerTierOrder != null && (
                          <span className="ml-2 text-indigo-600 text-xs">(Tier {selectedSlot.resource.interviewerTierOrder})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <p className="text-sm">{selectedSlot.resource.department}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <p className="text-sm">
                      {formatDateTimeRange(selectedSlot.start, selectedSlot.end)}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Code className="w-5 h-5 text-primary mt-1" />
                    <div className="flex flex-wrap gap-2">
                      {selectedSlot.resource.skills.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
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
                      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Choose Interview Window</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Book part of the slot — unused time stays available. Slots are automatically merged when cancelled.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Start</Label>
                      <Select value={bookStartTime} onValueChange={setBookStartTime}>
                        <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {singleSlotTimeOptions.filter((o) => o.value !== format(selectedSlot.end, 'HH:mm'))
                            .map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">End</Label>
                      <Select value={bookEndTime} onValueChange={setBookEndTime}>
                        <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {singleSlotTimeOptions.filter((o) => o.value > bookStartTime)
                            .map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {bookStartTime && bookEndTime && (
                    <div className="mt-3 p-2 rounded bg-amber-100 dark:bg-amber-900/30 text-xs text-amber-800 space-y-1">
                      <p><strong>Interview:</strong> {formatTimeRange(parseTimeOnDate(bookStartTime, selectedSlot.start), parseTimeOnDate(bookEndTime, selectedSlot.start))}</p>
                      {bookStartTime > format(selectedSlot.start, 'HH:mm') && (
                        <p className="text-emerald-700"><CheckCircle2 className="w-3 h-3 inline mr-1" />{formatTimeRange(selectedSlot.start, parseTimeOnDate(bookStartTime, selectedSlot.start))} remains available</p>
                      )}
                      {bookEndTime < format(selectedSlot.end, 'HH:mm') && (
                        <p className="text-emerald-700"><CheckCircle2 className="w-3 h-3 inline mr-1" />{formatTimeRange(parseTimeOnDate(bookEndTime, selectedSlot.start), selectedSlot.end)} remains available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Candidate + privilege check */}
              {renderCandidateSection(singlePrivilegeError)}
            </div>
          )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendRequest}
              disabled={!!singlePrivilegeError}
              className="gap-2"
              title={singlePrivilegeError ? 'Interviewer privilege too low for this candidate' : undefined}
            >
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
        <DialogBody>
          <div className="space-y-2">
            {/* Panel interviewers */}
            <Card className="border-sky-200 bg-sky-50 dark:bg-sky-950/20">
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-sky-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Panel Interviewers ({panelSlots.length})
                </p>
                <div className="space-y-2">
                  {panelSlots.map((ps) => {
                    const privErr = selectedCandidate
                      ? checkInterviewerPrivilege(ps.slot.resource, selectedCandidate)
                      : null;
                    return (
                      <div key={ps.slot.id}
                        className={`flex items-center justify-between p-2 rounded border ${privErr ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-gray-900 border-sky-200'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: INTERVIEWER_PALETTES[ps.slot.paletteIdx]?.solid || '#6366f1' }} />
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1">
                              {ps.slot.resource.interviewer}
                              {privErr && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ps.slot.resource.department} · Slot: {formatTimeRange(ps.slot.start, ps.slot.end)}
                              {ps.slot.resource.interviewerTierOrder != null && (
                                <span className="ml-1 text-indigo-600">(Tier {ps.slot.resource.interviewerTierOrder})</span>
                              )}
                            </p>
                            {privErr && <p className="text-xs text-red-600 mt-0.5">{privErr}</p>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                          {ps.slot.resource.skills.slice(0, 2).map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Panel time picker */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Scissors className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-amber-800">Panel Interview Window</p>
                    <p className="text-xs text-amber-700 mt-0.5">Times shown are the common overlap of all selected interviewers.</p>
                  </div>
                </div>

                {panelTimeOptions.length === 0 ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No overlapping time between selected interviewers
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Start Time</Label>
                        <Select value={panelBookStart} onValueChange={(v) => { setPanelBookStartOverride(v); if (panelBookEnd && v >= panelBookEnd) setPanelBookEndOverride(''); }}>
                          <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {panelTimeOptions.filter((o) => o.value !== (panelBookEnd || defaultPanelEnd)).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">End Time</Label>
                        <Select value={panelBookEnd} onValueChange={setPanelBookEndOverride}>
                          <SelectTrigger className="bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {panelTimeOptions.filter((o) => o.value > panelBookStart).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {panelBookStart && panelBookEnd && (
                      <p className="mt-2 text-xs text-amber-800">
                        <strong>Interview:</strong>{' '}
                        {formatTimeRange(parseTimeOnDate(panelBookStart, panelSlots[0].slot.start), parseTimeOnDate(panelBookEnd, panelSlots[0].slot.start))}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Candidate + privilege check (panel errors) */}
            {renderCandidateSection(panelPrivilegeErrors.length > 0 ? panelPrivilegeErrors : null)}
          </div>
        </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanelDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendPanelRequest}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
              disabled={panelTimeOptions.length === 0 || panelPrivilegeErrors.length > 0}
              title={panelPrivilegeErrors.length > 0 ? 'One or more interviewers have insufficient privilege' : undefined}
            >
              <Users className="w-4 h-4" /> Schedule Panel Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AvailabilityViewPage;
