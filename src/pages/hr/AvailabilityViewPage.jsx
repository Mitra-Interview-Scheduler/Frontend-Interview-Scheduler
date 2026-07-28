import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'; 
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
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import {
  format, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  endOfDay,
} from 'date-fns';
import {
  Calendar as CalendarIcon, Filter, X, User, Briefcase, Code, Clock,
  Send, TrendingUp, Award, Search, ChevronDown, Users, AlertCircle,
  CheckCircle2, Scissors, Trash2, ShieldAlert, Star, Globe, CalendarClock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { departmentAPI } from '@/services/departmentAPI';
import { technologyAPI } from '@/services/technologyAPI';
import { domainAPI } from '@/services/domainAPI';
import DomainMultiSelect from '@/components/DomainMultiSelect';
import { getTechnologyCategoryLabel, getTechnologyCategoryCode, getCandidateTechnologyIds, getCandidateCoreTechnologyIds, getSkillIsCore, normalizeSkillAssignment } from '@/lib/technologyHelpers';
import { designationAPI } from '@/services/designationAPI';
import { tierAPI } from '@/services/tierAPI';
import  candidateAPI from '@/services/candidateAPI';

import { departmentUsersAPI } from '@/services/departmentUsersAPI';
import { INTERVIEWER_PALETTES, CalendarEventComponent, getEventStyle, getTooltipText, isEventBeforeDateFilter } from './utils/AvailabilityViewPageUiUtils';
import { localizer, formatLocalDateTime, formatInputDate, generateTimeOptions, parseTimeOnDate, checkInterviewerPrivilege, checkPanelPrivilege, formatSlots, formatInterviewTypeLabel } from './utils/AvailabilityViewPageHelperUtils';
import MatchingInterviewerDetailDialog, { EMPTY_MATCHING_INTERVIEWERS } from './components/MatchingInterviewerDetailDialog';
import MatchingPanelDetailDialog from './components/MatchingPanelDetailDialog';
import ScheduleConflictDialog from './components/ScheduleConflictDialog';
import { useInterviewTypes } from '@/hooks/useInterviewTypes';
import { InterviewScheduleStatus, InterviewType, SlotStatus, isSchedulableCandidate } from '@/lib/statusConstants';
import { env } from '@/config/env';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/AvailabilityCalendar.css';


const CALENDAR_MIN_HOUR = env.CALENDAR_MIN_HOUR;
const CALENDAR_MAX_HOUR = env.CALENDAR_MAX_HOUR;
const CALENDAR_PAGE_SIZES = {
  month: 500,
  week: 200,
  day: 100,
};


const normalizeTechName = (name) => (name ?? '').trim().toLowerCase();

const resolveInterviewType = (...values) => {
  // Accept any non-blank interview type code (system TECHNICAL/HR or Admin-defined
  // custom types like MANAGER/ASSESSMENT); fall back to TECHNICAL when none set.
  const match = values.find((value) => typeof value === 'string' && value.trim() !== '');
  return match || InterviewType.TECHNICAL;
};

const EMPTY_REQUEST_FORM = {
  candidateId: null,
  candidateName: '',
  candidateEmail: '',
  candidateDesignationId: '',
  requiredTechnologyIds: [],
  isUrgent: false,
  notes: '',
  interviewType: InterviewType.TECHNICAL,
  interviewCoordinatorId: null,
  interviewCoordinatorDepartmentId: null,
};

const AvailabilityViewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [domains, setDomains] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [candidates, setCandidates] = useState([]);

  const [interviewerColorMap, setInterviewerColorMap] = useState({});

  // Filters
  const [filterDept, setFilterDept] = useState([]);
  const [filterTech, setFilterTech] = useState([]);
  const [filterDomain, setFilterDomain] = useState([]);
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
  const [interviewType, setInterviewType] = useState(InterviewType.TECHNICAL);
  const { interviewTypes: availableInterviewTypes } = useInterviewTypes(true);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [matchingInterviewers, setMatchingInterviewers] = useState(EMPTY_MATCHING_INTERVIEWERS);
  const [matchingInterviewersLoading, setMatchingInterviewersLoading] = useState(false);
  const [selectedMatchingInterviewer, setSelectedMatchingInterviewer] = useState(null);
  const [matchingDetailOpen, setMatchingDetailOpen] = useState(false);
  const [matchingPanelMode, setMatchingPanelMode] = useState(false);
  const [selectedMatchPanelIds, setSelectedMatchPanelIds] = useState([]);
  const [matchingPanelDetailOpen, setMatchingPanelDetailOpen] = useState(false);

  // Panel mode
  const [panelMode, setPanelMode] = useState(false);
  const [panelSlots, setPanelSlots] = useState([]);
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);

  // Google Calendar conflict confirmation (shown when HR proceeds despite overlap)
  const [conflictDialog, setConflictDialog] = useState({ open: false, conflicts: [], panelMode: false });
  const conflictConfirmRef = useRef(null);
  // Live conflict preview for the chosen interview window
  const [slotWindowConflicts, setSlotWindowConflicts] = useState({
    loading: false,
    conflicts: [],
    error: null,
  });

  // Single interview dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookStartTime, setBookStartTime] = useState('');
  const [bookEndTime, setBookEndTime] = useState('');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM);

  // Cancel booked dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [postponeActionLoading, setPostponeActionLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [coordinatorUsers, setCoordinatorUsers] = useState([]);
  const [coordinatorUsersLoading, setCoordinatorUsersLoading] = useState(false);

  const techDropdownRef = useRef(null);
  const appliedCandidateFiltersRef = useRef(null);
  const loadedCandidateDetailsRef = useRef(new Set());
  const conflictPreviewRequestIdRef = useRef(0);
  const calendarLockStart = dateRange.start ? new Date(dateRange.start) : null;

  // ── Derived: selected candidate object (for privilege check) ─────────────
  const selectedCandidate = requestForm.candidateId
    ? candidates.find((c) => Number(c.id) === Number(requestForm.candidateId)) || null
    : null;

  const candidateTechIds = useMemo(
    () => getCandidateTechnologyIds(selectedCandidate?.technologies || []),
    [selectedCandidate],
  );

  const candidateCoreTechIds = useMemo(
    () => getCandidateCoreTechnologyIds(selectedCandidate?.technologies || []),
    [selectedCandidate],
  );

  const candidateDomainIds = useMemo(
    () => (selectedCandidate?.domains || []).map((d) => d.id).filter(Boolean),
    [selectedCandidate],
  );

  const candidateDomainNames = useMemo(() => {
    const names = new Set();
    (selectedCandidate?.domains || []).forEach((d) => {
      const name = d?.name || d;
      if (name) names.add(String(name).trim().toLowerCase());
    });
    return names;
  }, [selectedCandidate]);

  const candidateCoreTechNames = useMemo(() => {
    const names = new Set();
    (selectedCandidate?.technologies || [])
      .map(normalizeSkillAssignment)
      .filter(getSkillIsCore)
      .forEach((item) => {
        const name = item.technology?.name;
        if (name) names.add(normalizeTechName(name));
      });
    return names;
  }, [selectedCandidate]);

  const isCandidateTech = useCallback(
    (technologyId) => candidateTechIds.includes(technologyId),
    [candidateTechIds],
  );

  const isCandidateCoreTech = useCallback(
    (technologyId) => candidateCoreTechIds.includes(technologyId),
    [candidateCoreTechIds],
  );

  const isCoreSkillForDisplay = useCallback((skillName, coreTechnologies = []) => {
    const normalized = normalizeTechName(skillName);
    if (!normalized) return false;
    if ((coreTechnologies || []).some((s) => normalizeTechName(s) === normalized)) {
      return true;
    }
    return candidateCoreTechNames.has(normalized);
  }, [candidateCoreTechNames]);

  const renderInterviewerSkillBadge = useCallback((skillName, { key, className = '', coreTechnologies = [] } = {}) => {
    const isCore = isCoreSkillForDisplay(skillName, coreTechnologies);
    return (
      <Badge
        key={key ?? skillName}
        variant="outline"
        className={`gap-1 ${className} ${
          isCore ? 'border-amber-300 bg-amber-50 text-amber-900' : ''
        }`}
      >
        {isCore && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
        {skillName}
      </Badge>
    );
  }, [isCoreSkillForDisplay]);

  const sortSkillsWithCoreFirst = useCallback((skills = [], coreTechnologies = []) => (
    [...skills].sort((a, b) => {
      const aCore = isCoreSkillForDisplay(a, coreTechnologies);
      const bCore = isCoreSkillForDisplay(b, coreTechnologies);
      if (aCore === bCore) return 0;
      return aCore ? -1 : 1;
    })
  ), [isCoreSkillForDisplay]);

  // Single-interview privilege error
  const singlePrivilegeError = selectedSlot && selectedCandidate
    ? checkInterviewerPrivilege(selectedSlot.resource, selectedCandidate)
    : null;

  // Panel privilege errors
  const panelPrivilegeErrors = panelSlots.length > 0 && selectedCandidate
    ? checkPanelPrivilege(panelSlots, selectedCandidate)
    : [];

    const eventStyleGetter = useCallback((event) => 
    getEventStyle(event, panelSlots, calendarLockStart), 
  [panelSlots, calendarLockStart]);

  const tooltipAccessor = useCallback((event) => 
    getTooltipText(event, panelSlots, formatTimeRange, calendarLockStart), 
  [panelSlots, formatTimeRange, calendarLockStart]);

  // For the calendar components prop
  const calendarComponents = useMemo(() => ({
    event: (props) => (
      <CalendarEventComponent
        {...props}
        panelSlots={panelSlots}
        formatTimeRange={formatTimeRange}
      />
    ),
  }), [panelSlots, formatTimeRange]);


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
        const [availData, deptData, techData, domainData, desigData, tierData, candData] = await Promise.all([
          // Load initial availability for visible range
          hrAvailabilityAPI.getAllAvailability(initialAvailabilityFilters),
          departmentAPI.getAllDepartments(),
          technologyAPI.getAllTechnologies(),
          domainAPI.getAllDomains(),
          designationAPI.getAllDesignations(),
          tierAPI.getAllTiers(),
          candidateAPI.getAllCandidates(),
        ]);
        setDepartments(deptData);
        setTechnologies(techData);
        setDomains(domainData || []);
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
    const paramCandidateId = searchParams.get('candidateId');
    const paramInterviewType = searchParams.get('interviewType');

    if (!incomingFilter && !paramCandidateId && !paramInterviewType) return;

    const resolvedInterviewType = resolveInterviewType(
      incomingFilter?.interviewType,
      paramInterviewType,
    );

    if (incomingFilter) {
      setPendingFilter(incomingFilter);

      setDateRange({
        start: new Date(incomingFilter.startDateTime),
        end: null,
      });

      if (incomingFilter.departmentId) {
        setFilterDept([incomingFilter.departmentId]);
        setSelectedDeptForDesignation(incomingFilter.departmentId.toString());
      } else if (incomingFilter.departmentIds?.length) {
        setFilterDept(incomingFilter.departmentIds);
        setSelectedDeptForDesignation(String(incomingFilter.departmentIds[0]));
      }

      if (incomingFilter.technologyIds?.length) {
        setFilterTech(incomingFilter.technologyIds);
      }

      if (incomingFilter.domainIds?.length) {
        setFilterDomain(incomingFilter.domainIds);
      }

      if (incomingFilter.minYearsOfExperience != null) {
        setMinExperience(String(incomingFilter.minYearsOfExperience));
      }
    }

    setInterviewType(resolvedInterviewType);
    setRequestForm((prev) => ({
      ...prev,
      candidateId: incomingFilter?.candidateId
        ?? (paramCandidateId ? parseInt(paramCandidateId, 10) : prev.candidateId),
      candidateName: incomingFilter?.candidateName ?? prev.candidateName,
      interviewType: resolvedInterviewType,
      interviewCoordinatorId: incomingFilter?.interviewCoordinatorId ?? prev.interviewCoordinatorId,
      interviewCoordinatorDepartmentId: incomingFilter?.interviewCoordinatorDepartmentId
        ?? prev.interviewCoordinatorDepartmentId,
    }));
  }, [location.state, searchParams]);

  const loadCoordinatorUsers = useCallback(async (departmentId) => {
    if (!departmentId) {
      setCoordinatorUsers([]);
      return;
    }
    setCoordinatorUsersLoading(true);
    try {
      const data = await departmentUsersAPI.getUsersByDepartment(departmentId);
      setCoordinatorUsers(data || []);
    } catch (err) {
      console.error('Failed to load coordinator users:', err);
      setCoordinatorUsers([]);
    } finally {
      setCoordinatorUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requestForm.interviewCoordinatorDepartmentId) {
      loadCoordinatorUsers(requestForm.interviewCoordinatorDepartmentId);
    } else {
      setCoordinatorUsers([]);
    }
  }, [requestForm.interviewCoordinatorDepartmentId, loadCoordinatorUsers]);

  const handleCoordinatorDepartmentChange = (value) => {
    const deptId = value === 'NONE' ? null : parseInt(value, 10);
    setRequestForm((prev) => ({
      ...prev,
      interviewCoordinatorDepartmentId: deptId,
      interviewCoordinatorId: null,
    }));
  };

  const handleCoordinatorUserChange = (value) => {
    setRequestForm((prev) => ({
      ...prev,
      interviewCoordinatorId: value === 'NONE' ? null : parseInt(value, 10),
    }));
  };

  const resetRequestFormState = useCallback(() => {
    setRequestForm({ ...EMPTY_REQUEST_FORM });
    setCandidateSearchTerm('');
    setBookStartTime('');
    setBookEndTime('');
  }, []);

  const clearCandidateSchedulingContext = useCallback(() => {
    setInterviewType(InterviewType.TECHNICAL);
    setDateRange({ start: null, end: null });
    setFilterDept([]);
    setFilterTech([]);
    setFilterDomain([]);
    setSelectedDeptForDesignation('');
    setSelectedTierInDept('');
    setMinDesignationLevel('');
    setDesignationsForSelectedTier([]);
    setPendingFilter(null);
    appliedCandidateFiltersRef.current = null;
    navigate('/hr/availability', { replace: true, state: null });
  }, [navigate]);

  const finalizeScheduledInterview = useCallback((cameFromCandidate) => {
    resetRequestFormState();
    if (cameFromCandidate) {
      clearCandidateSchedulingContext();
    }
  }, [resetRequestFormState, clearCandidateSchedulingContext]);

  const cameFromCandidateFlow = Boolean(
    searchParams.get('candidateId') || location.state?.filterData?.candidateId,
  );


  
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
      domainIds: filterDomain.length > 0 ? filterDomain : null,
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
  filterDept, filterTech, filterDomain, minExperience, dateRange,
  selectedDeptForDesignation, selectedTierInDept, minDesignationLevel,
  pendingFilter
]);

  
  
  // ── Validate candidate + fill designation only (do not touch calendar filters) ──
  useEffect(() => {
    if (!requestForm.candidateId || candidates.length === 0) {
      if (!requestForm.candidateId) {
        appliedCandidateFiltersRef.current = null;
      }
      return;
    }

    if (appliedCandidateFiltersRef.current === requestForm.candidateId) {
      return;
    }

    const candidate = candidates.find((c) => c.id === requestForm.candidateId);
    if (candidate && !isSchedulableCandidate(candidate.status)) {
      setRequestForm((prev) => ({
        ...prev,
        candidateId: null,
        candidateName: '',
        candidateDesignationId: '',
      }));
      appliedCandidateFiltersRef.current = null;
      return;
    }
    if (candidate && candidate.targetDesignationId) {
      setRequestForm((prev) => ({
        ...prev,
        candidateDesignationId: candidate.targetDesignationId,
      }));
    }
    if (candidate) {
      appliedCandidateFiltersRef.current = requestForm.candidateId;
    }
  }, [requestForm.candidateId, candidates]);

  // Load matching interviewers when candidate or dept/tier/level filters change.
  useEffect(() => {
    if (!requestForm.candidateId) {
      setMatchingInterviewers(EMPTY_MATCHING_INTERVIEWERS);
      setSelectedMatchingInterviewer(null);
      setMatchingDetailOpen(false);
      return undefined;
    }

    // Wait until async tier/level option lists are ready when those filters are set
    if (selectedTierInDept && tiersForSelectedDept.length === 0) return undefined;
    if (minDesignationLevel && designationsForSelectedTier.length === 0) return undefined;

    const timer = setTimeout(() => {
      loadMatchingInterviewers();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    requestForm.candidateId,
    filterDept,
    minExperience,
    selectedDeptForDesignation,
    selectedTierInDept,
    minDesignationLevel,
    tiersForSelectedDept,
    designationsForSelectedTier,
  ]);

  // Load full candidate profile (technologies/domains) when missing from list payload
  useEffect(() => {
    if (!requestForm.candidateId) return undefined;
    if (loadedCandidateDetailsRef.current.has(requestForm.candidateId)) return undefined;

    const candidate = candidates.find((c) => c.id === requestForm.candidateId);
    if (candidate?.technologies?.length > 0) {
      loadedCandidateDetailsRef.current.add(requestForm.candidateId);
      return undefined;
    }

    let active = true;
    loadedCandidateDetailsRef.current.add(requestForm.candidateId);
    candidateAPI.getCandidateById(requestForm.candidateId)
      .then((details) => {
        if (!active || !details) return;
        setCandidates((prev) => {
          const exists = prev.some((c) => c.id === details.id);
          if (!exists) return [...prev, details];
          return prev.map((c) => (c.id === details.id ? { ...c, ...details } : c));
        });
      })
      .catch((err) => console.error('Failed to load candidate technologies:', err));

    return () => { active = false; };
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

  const loadMatchingInterviewers = async () => {
    if (!requestForm.candidateId) {
      setMatchingInterviewers(EMPTY_MATCHING_INTERVIEWERS);
      return;
    }

    try {
      setMatchingInterviewersLoading(true);

      let tierOrderToSend = null;
      if (selectedTierInDept) {
        const t = tiersForSelectedDept.find((tier) => tier.id.toString() === selectedTierInDept);
        tierOrderToSend = t ? t.tierOrder : null;
      }

      let levelOrderToSend = null;
      if (minDesignationLevel) {
        const d = designationsForSelectedTier.find(
          (desig) => desig.levelOrder.toString() === minDesignationLevel,
        );
        levelOrderToSend = d ? d.levelOrder : null;
      }

      const data = await hrAvailabilityAPI.getMatchingInterviewers({
        candidateId: requestForm.candidateId,
        departmentIds: filterDept.length > 0 ? filterDept : null,
        minYearsOfExperience: minExperience ? parseInt(minExperience, 10) : null,
        departmentIdForDesignationFilter: selectedDeptForDesignation
          ? parseInt(selectedDeptForDesignation, 10)
          : null,
        minTierId: tierOrderToSend,
        minDesignationLevelInDepartment: levelOrderToSend,
        limit: 5,
      });

      // Re-bucket by match counts so dual matches always land in "both"
      // (never duplicated under tech-only / domain-only).
      const byId = new Map();
      for (const match of [
        ...(data?.both || []),
        ...(data?.technologies || []),
        ...(data?.domains || []),
      ]) {
        if (match?.interviewerId == null) continue;
        byId.set(Number(match.interviewerId), match);
      }

      const both = [];
      const technologies = [];
      const domains = [];
      for (const match of byId.values()) {
        const techCount = Number(match.techMatchCount)
          || ((match.matchedCore || []).length + (match.matchedNonCore || []).length);
        const domainCount = Number(match.domainMatchCount)
          || (match.matchedDomains || []).length;
        if (techCount > 0 && domainCount > 0) both.push(match);
        else if (techCount > 0) technologies.push(match);
        else if (domainCount > 0) domains.push(match);
      }

      setMatchingInterviewers({ both, technologies, domains });
    } catch (err) {
      console.error('Failed to load matching interviewers:', err);
      setMatchingInterviewers(EMPTY_MATCHING_INTERVIEWERS);
      toast({
        title: 'Could not load matching interviewers',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setMatchingInterviewersLoading(false);
    }
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
      // Always load the full visible calendar range so slots before "From"
      // still appear (grayed out). Booking is blocked client-side by calendarLockStart.
      const filters = {
        ...buildCalendarAvailabilityFilters(currentView, calendarDate),
        startDateTime: formatLocalDateTime(visibleRange.start),
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
      const panelId = cancelTarget.resource.panelId;
      const requestId = cancelTarget.resource.requestId;

      if (panelId) {
        await hrAvailabilityAPI.cancelPanelInterview(panelId);
        const panelInterviewerCount = events.filter(
          (e) => e.resource?.panelId === panelId && e.resource?.status === SlotStatus.BOOKED,
        ).length;
        toast({
          title: '✓ Panel interview cancelled',
          description: panelInterviewerCount > 0
            ? `All ${panelInterviewerCount} interviewer slot${panelInterviewerCount === 1 ? '' : 's'} restored. Interviewers notified.`
            : 'All panel interviewer slots restored. Interviewers notified.',
        });
      } else {
        if (!requestId) throw new Error('No request ID on this slot. Cannot cancel from calendar.');
        await hrAvailabilityAPI.cancelInterviewRequest(requestId);
        toast({
          title: '✓ Interview cancelled',
          description: `${cancelTarget.resource.interviewer}'s slot is now available again. Interviewer notified.`,
        });
      }
      setCancelDialogOpen(false);
      setCancelTarget(null);
      await refreshCalendar();
    } catch (err) {
      toast({ title: 'Cancel failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const handleApprovePostpone = async () => {
    const postponeRequestId = cancelTarget?.resource?.pendingPostponeRequestId;
    if (!postponeRequestId) return;
    const hasProposedTime = !!(
      cancelTarget?.resource?.pendingPostponePreferredStart
      && cancelTarget?.resource?.pendingPostponePreferredEnd
    );
    setPostponeActionLoading(true);
    try {
      await hrAvailabilityAPI.approvePostponeRequest(postponeRequestId);
      toast({
        title: hasProposedTime ? 'Proposed time accepted' : 'Postpone request acknowledged',
        description: hasProposedTime
          ? (cancelTarget?.resource?.panelId
            ? 'The panel was cancelled and rescheduled at the proposed time.'
            : 'The previous interview was cancelled and the new time was scheduled.')
          : 'The interviewer was notified. The current booking stays until you reschedule.',
      });
      setCancelDialogOpen(false);
      setCancelTarget(null);
      await refreshCalendar();
    } catch (err) {
      toast({
        title: hasProposedTime ? 'Could not accept proposed time' : 'Could not acknowledge request',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setPostponeActionLoading(false);
    }
  };

  const handleRejectPostpone = async () => {
    const postponeRequestId = cancelTarget?.resource?.pendingPostponeRequestId;
    if (!postponeRequestId) return;
    setPostponeActionLoading(true);
    try {
      await hrAvailabilityAPI.rejectPostponeRequest(postponeRequestId);
      toast({
        title: 'Proposed time declined',
        description: 'The interviewer was notified. The original interview remains scheduled.',
      });
      setCancelDialogOpen(false);
      setCancelTarget(null);
      await refreshCalendar();
    } catch (err) {
      toast({
        title: 'Could not decline proposed time',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setPostponeActionLoading(false);
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
    const isBooked = event.resource?.status === SlotStatus.BOOKED;
    const isCompleted = event.resource?.interviewStatus === InterviewScheduleStatus.COMPLETED;

    if (isBooked && isCompleted) {
      toast({
        title: 'Interview completed',
        description: `${event.resource.candidateName || 'Interview'} with ${event.resource.interviewer} is finished.`,
      });
      return;
    }

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
      interviewType: resolveInterviewType(prev.interviewType, interviewType),
      interviewCoordinatorId: prev.interviewCoordinatorId,
      interviewCoordinatorDepartmentId: prev.interviewCoordinatorDepartmentId,
      requiredTechnologyIds: event.resource.skills.map((s) => {
        const t = technologies.find((t) => t.name === s);
        return t?.id || null;
      }).filter(Boolean),
      isUrgent: false,
      notes: '',
    }));
    setCandidateSearchTerm('');
    setRequestDialogOpen(true);
    
  };

  const handleMatchingFreeSlotSelect = (slotDto) => {
    if (!slotDto) return;

    const end = new Date(slotDto.endDateTime);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) {
      toast({
        title: 'Slot unavailable',
        description: 'This free time has already passed. Pick another slot.',
        variant: 'destructive',
      });
      return;
    }

    const [event] = formatSlots([slotDto], interviewerColorMap);
    if (!event) return;

    setMatchingDetailOpen(false);
    setSelectedMatchingInterviewer(null);
    handleEventClick(event);
  };

  const allMatchingInterviewers = useMemo(() => {
    const byId = new Map();
    for (const match of [
      ...(matchingInterviewers.both || []),
      ...(matchingInterviewers.technologies || []),
      ...(matchingInterviewers.domains || []),
    ]) {
      if (match?.interviewerId == null) continue;
      byId.set(Number(match.interviewerId), match);
    }
    return Array.from(byId.values());
  }, [matchingInterviewers]);

  const selectedMatchPanelInterviewers = useMemo(
    () => allMatchingInterviewers.filter((m) => selectedMatchPanelIds.includes(Number(m.interviewerId))),
    [allMatchingInterviewers, selectedMatchPanelIds],
  );

  const toggleMatchPanelSelection = (match) => {
    const id = Number(match.interviewerId);
    setSelectedMatchPanelIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length >= 2) {
        setMatchingPanelDetailOpen(true);
      } else {
        setMatchingPanelDetailOpen(false);
      }
      return next;
    });
  };

  useEffect(() => {
    setMatchingPanelMode(false);
    setSelectedMatchPanelIds([]);
    setMatchingPanelDetailOpen(false);
  }, [requestForm.candidateId]);

  const openPanelFromMatchingOverlap = (overlap) => {
    if (!overlap?.panelSlots?.length) return;
    setMatchingPanelDetailOpen(false);
    setPanelMode(true);
    setPanelSlots(overlap.panelSlots);
    setPanelBookStartOverride(format(overlap.start, 'HH:mm'));
    setPanelBookEndOverride(format(overlap.end, 'HH:mm'));
    setRequestForm((prev) => ({
      candidateId: prev.candidateId,
      candidateName: prev.candidateName,
      candidateDesignationId: prev.candidateDesignationId,
      interviewType: prev.interviewType,
      interviewCoordinatorId: prev.interviewCoordinatorId,
      interviewCoordinatorDepartmentId: prev.interviewCoordinatorDepartmentId,
      requiredTechnologyIds: [],
      isUrgent: false,
      notes: '',
    }));
    setCandidateSearchTerm('');
    setPanelDialogOpen(true);
  };


  // ── Candidate helpers ─────────────────────────────────────────────────────
  const handleSelectCandidate = (c) => {
    setRequestForm({
      ...requestForm,
      candidateId: c.id,
      candidateName: c.name,
      candidateEmail: c.email?.trim() || '',
      candidateDesignationId: c.targetDesignationId || '',
    });
    setCandidateSearchTerm('');
  };

  const handleClearCandidate = () =>
    setRequestForm({
      ...requestForm,
      candidateId: null,
      candidateName: '',
      candidateEmail: '',
      candidateDesignationId: '',
    });

  // ── Google Calendar conflict check (advisory + confirm on submit) ───────
  const flattenConflictEvents = (conflicts) => {
    if (!Array.isArray(conflicts)) return [];
    return conflicts.flatMap((ic) =>
      (ic.conflicts || []).map((event) => ({
        interviewerName: ic.interviewerName,
        title: event.title || 'Untitled event',
        calendarName: event.calendarName,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        googleEventId: event.googleEventId,
      })),
    );
  };

  const previewConflictEvents = flattenConflictEvents(slotWindowConflicts.conflicts);
  const hasSlotWindowConflict = previewConflictEvents.length > 0;

  const fetchSlotWindowConflicts = useCallback(async (interviewerIds, bookStart, bookEnd) => {
    const ids = (interviewerIds || []).filter((id) => id != null);
    const requestId = ++conflictPreviewRequestIdRef.current;

    if (ids.length === 0 || !bookStart || !bookEnd || bookEnd <= bookStart) {
      setSlotWindowConflicts({ loading: false, conflicts: [], error: null });
      return;
    }

    setSlotWindowConflicts((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const conflicts = await hrAvailabilityAPI.checkConflicts({
        interviewerIds: ids,
        startDateTime: formatLocalDateTime(bookStart),
        endDateTime: formatLocalDateTime(bookEnd),
      });
      if (requestId !== conflictPreviewRequestIdRef.current) return;
      setSlotWindowConflicts({
        loading: false,
        conflicts: Array.isArray(conflicts) ? conflicts : [],
        error: null,
      });
    } catch (e) {
      if (requestId !== conflictPreviewRequestIdRef.current) return;
      setSlotWindowConflicts({
        loading: false,
        conflicts: [],
        error: e.response?.data?.message || e.message || 'Could not verify Google Calendar',
      });
    }
  }, []);

  const fetchSubmitConflicts = async (interviewerIds, bookStart, bookEnd) => {
    const ids = (interviewerIds || []).filter((id) => id != null);
    if (ids.length === 0) return [];
    const conflicts = await hrAvailabilityAPI.checkConflicts({
      interviewerIds: ids,
      startDateTime: formatLocalDateTime(bookStart),
      endDateTime: formatLocalDateTime(bookEnd),
    });
    return Array.isArray(conflicts) ? conflicts : [];
  };

  const openConflictConfirmDialog = (conflicts, onConfirm, isPanel = false) => {
    conflictConfirmRef.current = onConfirm;
    setConflictDialog({ open: true, conflicts, panelMode: isPanel });
  };

  const handleConflictConfirm = async () => {
    const confirm = conflictConfirmRef.current;
    if (!confirm) return;
    await confirm();
  };

  const closeConflictDialog = () => {
    conflictConfirmRef.current = null;
    setConflictDialog({ open: false, conflicts: [], panelMode: false });
  };

  // Live conflict preview while choosing the interview window (single)
  useEffect(() => {
    if (!requestDialogOpen || !selectedSlot || !bookStartTime || !bookEndTime) {
      if (!requestDialogOpen && !panelDialogOpen) {
        setSlotWindowConflicts({ loading: false, conflicts: [], error: null });
      }
      return undefined;
    }
    const bookStart = parseTimeOnDate(bookStartTime, selectedSlot.start);
    const bookEnd = parseTimeOnDate(bookEndTime, selectedSlot.start);
    if (!bookStart || !bookEnd || bookEnd <= bookStart) {
      setSlotWindowConflicts({ loading: false, conflicts: [], error: null });
      return undefined;
    }
    const interviewerId = selectedSlot?.interviewerId ?? selectedSlot?.resource?.interviewerId;
    const timerId = window.setTimeout(() => {
      fetchSlotWindowConflicts(interviewerId ? [interviewerId] : [], bookStart, bookEnd);
    }, 250);
    return () => window.clearTimeout(timerId);
  }, [
    requestDialogOpen,
    panelDialogOpen,
    selectedSlot,
    bookStartTime,
    bookEndTime,
    fetchSlotWindowConflicts,
  ]);

  // ── Submit single interview ───────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!requestForm.candidateId) {
      toast({ title: 'Select a candidate', variant: 'destructive' }); return;
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
    const performSubmit = async (acknowledgeCalendarConflict = false) => {
      setScheduling(true);
      try {
        await hrAvailabilityAPI.createInterviewRequest({
          candidateId: requestForm.candidateId,
          candidateName: requestForm.candidateName,
          candidateEmail: requestForm.candidateEmail?.trim() || null,
          candidateDesignationId: requestForm.candidateDesignationId || null,
          requiredTechnologyIds: requestForm.requiredTechnologyIds,
          availabilitySlotId: selectedSlot.id,
          preferredStartDateTime: formatLocalDateTime(bookStart),
          preferredEndDateTime: formatLocalDateTime(bookEnd),
          isUrgent: requestForm.isUrgent,
          notes: requestForm.notes,
          interviewType: resolveInterviewType(requestForm.interviewType, interviewType),
          interviewCoordinatorId: requestForm.interviewCoordinatorId || null,
          interviewCoordinatorDepartmentId: requestForm.interviewCoordinatorDepartmentId || null,
          acknowledgeCalendarConflict,
        });
        toast({ title: '✓ Interview scheduled', description: `${requestForm.candidateName} with ${selectedSlot.resource.interviewer}` });
        closeConflictDialog();
        setRequestDialogOpen(false);
        setSelectedSlot(null);
        finalizeScheduledInterview(cameFromCandidateFlow);
        await refreshCalendar();
      } catch (err) {
        toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
      } finally {
        setScheduling(false);
      }
    };

    const interviewerId = selectedSlot?.interviewerId ?? selectedSlot?.resource?.interviewerId;
    let conflicts = hasSlotWindowConflict ? slotWindowConflicts.conflicts : [];
    try {
      if (conflicts.length === 0) {
        conflicts = await fetchSubmitConflicts(interviewerId ? [interviewerId] : [], bookStart, bookEnd);
      }
    } catch (e) {
      toast({
        title: 'Could not verify Google Calendar',
        description: e.response?.data?.message || e.message || 'Try again or reconnect Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    if (conflicts.length > 0) {
      openConflictConfirmDialog(conflicts, () => performSubmit(true));
      return;
    }

    await performSubmit(false);
  };

  // ── Submit panel interview ────────────────────────────────────────────────
  const handleSendPanelRequest = async () => {
    if (!requestForm.candidateId) {
      toast({ title: 'Select a candidate', variant: 'destructive' }); return;
    }
    if (panelSlots.length < 1) {
      toast({ title: 'Select at least 1 interviewer', variant: 'destructive' }); return;
    }
    if (panelTimeOptions.length === 0) {
      toast({ title: 'No overlapping time', variant: 'destructive' }); return;
    }
    // Privilege gate: block if any panel interviewer is under-qualified
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
    const performSubmit = async (acknowledgeCalendarConflict = false) => {
      setScheduling(true);
      try {
        const panel = await hrAvailabilityAPI.createPanelInterview({
          candidateId: requestForm.candidateId,
          candidateName: requestForm.candidateName,
          candidateEmail: requestForm.candidateEmail?.trim() || null,
          candidateDesignationId: requestForm.candidateDesignationId || null,
          startDateTime: formatLocalDateTime(bookStart),
          endDateTime: formatLocalDateTime(bookEnd),
          availabilitySlotIds: panelSlots.map((ps) => ps.slot.id),
          requiredTechnologyIds: requestForm.requiredTechnologyIds,
          isUrgent: requestForm.isUrgent,
          notes: requestForm.notes,
          interviewType: resolveInterviewType(requestForm.interviewType, interviewType),
          interviewCoordinatorId: requestForm.interviewCoordinatorId || null,
          interviewCoordinatorDepartmentId: requestForm.interviewCoordinatorDepartmentId || null,
          acknowledgeCalendarConflict,
        });
        toast({
          title: '✓ Panel interview scheduled',
          description: panel?.meetingLink
            ? `${requestForm.candidateName} with ${panelSlots.length} interviewer(s). Google Meet link created.`
            : `${requestForm.candidateName} with ${panelSlots.length} interviewer(s). Connect Google Calendar on at least one interviewer to generate a Meet link.`,
        });
        closeConflictDialog();
        setPanelDialogOpen(false);
        setPanelMode(false);
        setMatchingPanelMode(false);
        setSelectedMatchPanelIds([]);
        setMatchingPanelDetailOpen(false);
        setPanelSlots([]);
        setPanelBookStartOverride('');
        setPanelBookEndOverride('');
        finalizeScheduledInterview(cameFromCandidateFlow);
        await refreshCalendar();
      } catch (err) {
        toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
      } finally {
        setScheduling(false);
      }
    };

    const panelInterviewerIds = panelSlots
      .map((ps) => ps.slot?.interviewerId ?? ps.slot?.resource?.interviewerId)
      .filter((id) => id != null);

    let conflicts = hasSlotWindowConflict ? slotWindowConflicts.conflicts : [];
    try {
      if (conflicts.length === 0) {
        conflicts = await fetchSubmitConflicts(panelInterviewerIds, bookStart, bookEnd);
      }
    } catch (e) {
      toast({
        title: 'Could not verify Google Calendar',
        description: e.response?.data?.message || e.message || 'Try again or reconnect Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    if (conflicts.length > 0) {
      openConflictConfirmDialog(conflicts, () => performSubmit(true), true);
      return;
    }

    await performSubmit(false);
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

  // Live conflict preview while choosing the panel interview window
  useEffect(() => {
    if (!panelDialogOpen || panelSlots.length === 0 || !panelBookStart || !panelBookEnd) {
      return undefined;
    }
    const bookStart = parseTimeOnDate(panelBookStart, panelSlots[0].slot.start);
    const bookEnd = parseTimeOnDate(panelBookEnd, panelSlots[0].slot.start);
    if (!bookStart || !bookEnd || bookEnd <= bookStart) {
      setSlotWindowConflicts({ loading: false, conflicts: [], error: null });
      return undefined;
    }
    const panelInterviewerIds = panelSlots
      .map((ps) => ps.slot?.interviewerId ?? ps.slot?.resource?.interviewerId)
      .filter((id) => id != null);
    const timerId = window.setTimeout(() => {
      fetchSlotWindowConflicts(panelInterviewerIds, bookStart, bookEnd);
    }, 250);
    return () => window.clearTimeout(timerId);
  }, [panelDialogOpen, panelSlots, panelBookStart, panelBookEnd, fetchSlotWindowConflicts]);

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
    setFilterDept([]);
    setFilterTech([]);
    setFilterDomain([]);
    setSelectedTechCategory('');
    setTechSearchTerm('');
    setShowTechDropdown(false);
    setMinExperience('');
    setDateRange({ start: null, end: null });
    setSelectedDeptForDesignation('');
    setMinDesignationLevel('');
    setSelectedTierInDept('');
    setTiersForSelectedDept([]);
    setDesignationsForSelectedTier([]);
    setPendingFilter(null);
    setCalendarDate(new Date());
    setInterviewType(InterviewType.TECHNICAL);
    appliedCandidateFiltersRef.current = null;
    setRequestForm((prev) => ({
      ...prev,
      candidateId: null,
      candidateName: '',
      candidateDesignationId: '',
      interviewCoordinatorId: null,
      interviewCoordinatorDepartmentId: null,
    }));
    setCandidateSearchTerm('');
    if (searchParams.get('candidateId') || searchParams.get('interviewType') || location.state?.filterData) {
      navigate('/hr/availability', { replace: true, state: null });
    }
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
    const byCode = new Map();
    technologies.forEach((tech) => {
      const code = getTechnologyCategoryCode(tech) || 'OTHER';
      const label = getTechnologyCategoryLabel(tech);
      if (!byCode.has(code)) {
        byCode.set(code, label);
      }
    });
    return Array.from(byCode.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [technologies]);

  const filteredTechnologies = useMemo(() => {
    return technologies
      .filter((tech) => !selectedTechCategory || getTechnologyCategoryCode(tech) === selectedTechCategory)
      .filter((tech) => !techSearchTerm.trim() || tech.name.toLowerCase().includes(techSearchTerm.toLowerCase()));
  }, [technologies, selectedTechCategory, techSearchTerm]);

  const schedulableCandidates = useMemo(
    () => candidates.filter((candidate) => isSchedulableCandidate(candidate.status)),
    [candidates],
  );

  const filteredCandidates = schedulableCandidates.filter((c) =>
    c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearchTerm.toLowerCase()));

  const hasActiveInterviewerFilters = useMemo(() => (
    filterDept.length > 0
    || filterTech.length > 0
    || filterDomain.length > 0
    || Boolean(minExperience)
    || Boolean(selectedDeptForDesignation)
    || Boolean(selectedTierInDept)
    || Boolean(minDesignationLevel)
  ), [
    filterDept,
    filterTech,
    filterDomain,
    minExperience,
    selectedDeptForDesignation,
    selectedTierInDept,
    minDesignationLevel,
  ]);

  // When interviewer filters are active, hide booked slots so HR only sees free matches.
  const calendarEvents = useMemo(() => {
    if (!hasActiveInterviewerFilters) return events;
    return events.filter((e) => e.resource?.status !== SlotStatus.BOOKED);
  }, [events, hasActiveInterviewerFilters]);

  const countableEvents = calendarEvents.filter((e) => !isEventBeforeDateFilter(e, calendarLockStart));
  const availableCount = countableEvents.filter((e) => e.resource?.status === SlotStatus.AVAILABLE).length;
  const postponeCount = countableEvents.filter(
    (e) => e.resource?.status === SlotStatus.BOOKED
      && e.resource?.interviewStatus !== InterviewScheduleStatus.COMPLETED
      && e.resource?.hasPendingPostponeRequest,
  ).length;
  const bookedCount = countableEvents.filter(
    (e) => e.resource?.status === SlotStatus.BOOKED
      && e.resource?.interviewStatus !== InterviewScheduleStatus.COMPLETED
      && !e.resource?.hasPendingPostponeRequest,
  ).length;
  const completedCount = countableEvents.filter(
    (e) => e.resource?.status === SlotStatus.BOOKED && e.resource?.interviewStatus === InterviewScheduleStatus.COMPLETED,
  ).length;

  const hasMatchingInterviewers = (
    matchingInterviewers.both.length
    + matchingInterviewers.technologies.length
    + matchingInterviewers.domains.length
  ) > 0;

  const openMatchingDetail = (match) => {
    setSelectedMatchingInterviewer(match);
    setMatchingDetailOpen(true);
  };

  const renderMatchingCard = (match, groupKey) => {
    const hasFreeTime = Boolean(match.hasFreeTimeInWeek);
    const interviewerId = Number(match.interviewerId);
    const isSelectedForPanel = selectedMatchPanelIds.includes(interviewerId);

    return (
      <div
        key={`${groupKey}-${match.interviewerId}`}
        className={`min-w-[180px] max-w-[220px] flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
          matchingPanelMode && isSelectedForPanel
            ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-300'
            : hasFreeTime
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-slate-200 bg-slate-50'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (matchingPanelMode) {
              toggleMatchPanelSelection(match);
              return;
            }
            openMatchingDetail(match);
          }}
          className="w-full text-left"
        >
          <div className="flex items-start gap-2">
            {matchingPanelMode && (
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                  isSelectedForPanel
                    ? 'border-sky-500 bg-sky-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isSelectedForPanel && <CheckCircle2 className="h-3 w-3" />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold truncate ${
                matchingPanelMode && isSelectedForPanel
                  ? 'text-sky-900'
                  : hasFreeTime ? 'text-emerald-900' : 'text-slate-800'
              }`}
              >
                {match.interviewerName}
              </p>
              <p className={`text-xs truncate mt-0.5 ${
                matchingPanelMode && isSelectedForPanel
                  ? 'text-sky-700'
                  : hasFreeTime ? 'text-emerald-700' : 'text-muted-foreground'
              }`}
              >
                {[match.designation, match.department].filter(Boolean).join(', ') || 'Interviewer'}
              </p>
              {match.email && (
                <p className={`text-[10px] truncate mt-0.5 ${
                  matchingPanelMode && isSelectedForPanel
                    ? 'text-sky-600/80'
                    : hasFreeTime ? 'text-emerald-600/80' : 'text-slate-400'
                }`}
                >
                  {match.email}
                </p>
              )}
              <p className={`text-[11px] mt-1.5 font-medium ${
                matchingPanelMode && isSelectedForPanel
                  ? 'text-sky-700'
                  : hasFreeTime ? 'text-emerald-700' : 'text-slate-500'
              }`}
              >
                {hasFreeTime ? 'Free within a week' : 'No free time this week'}
                {', '}
                {match.totalMatches} match{match.totalMatches === 1 ? '' : 'es'}
              </p>
            </div>
          </div>
        </button>
        {matchingPanelMode && (
          <button
            type="button"
            className="mt-2 text-[11px] text-sky-700 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              openMatchingDetail(match);
            }}
          >
            View details
          </button>
        )}
      </div>
    );
  };

  const renderMatchingGroup = (title, items, groupKey) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          <span className="ml-1 font-normal normal-case tracking-normal">({items.length})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {items.map((match) => renderMatchingCard(match, groupKey))}
        </div>
      </div>
    );
  };

  // ── Interview type (shared between single + panel dialogs) ───────────────
  const renderInterviewTypeSection = () => (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-2">
        <Label className="text-sm font-semibold">Interview Type</Label>
        <Select
          value={resolveInterviewType(requestForm.interviewType, interviewType)}
          onValueChange={(value) => {
            setInterviewType(value);
            setRequestForm((prev) => ({ ...prev, interviewType: value }));
          }}
        >
          <SelectTrigger className="bg-white dark:bg-gray-900">
            <SelectValue placeholder="Select interview type" />
          </SelectTrigger>
          <SelectContent>
            {availableInterviewTypes.length > 0 ? (
              availableInterviewTypes.map((t) => (
                <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="TECHNICAL">Technical Interview</SelectItem>
                <SelectItem value="HR">HR Interview</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        
      </CardContent>
    </Card>
  );

  const renderCoordinatorSection = () => (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm font-semibold">Interview Coordinator <span className="font-normal text-muted-foreground">(optional)</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Coordinator Department</Label>
            <Select
              value={requestForm.interviewCoordinatorDepartmentId?.toString() || 'NONE'}
              onValueChange={handleCoordinatorDepartmentChange}
            >
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Select department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Interview Coordinator</Label>
            <SearchableSelect
              value={requestForm.interviewCoordinatorId?.toString() || 'NONE'}
              onValueChange={handleCoordinatorUserChange}
              disabled={!requestForm.interviewCoordinatorDepartmentId || coordinatorUsersLoading}
              className="bg-white dark:bg-gray-900"
              label="Coordinator"
              placeholder={
                !requestForm.interviewCoordinatorDepartmentId
                  ? 'Select department first'
                  : coordinatorUsersLoading
                    ? 'Loading users...'
                    : 'Select Coordinator'
              }
              searchPlaceholder="Search coordinators..."
              emptyMessage={
                coordinatorUsers.length === 0
                  ? 'No user found for selected department'
                  : 'No matching users found'
              }
              emptyOption={{
                value: 'NONE',
                label: !requestForm.interviewCoordinatorDepartmentId
                  ? 'Select department first'
                  : coordinatorUsersLoading
                    ? 'Loading users...'
                    : 'Select Coordinator',
              }}
              options={coordinatorUsers.map((user) => ({
                value: user.id.toString(),
                label: `${user.fullName} (${user.email})`,
                keywords: `${user.fullName} ${user.email}`,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Can be anyone from the selected department who will join and coordinate the interview.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
            {!candidateSearchTerm && (
              <p className="text-xs text-muted-foreground">Search and select an existing candidate from the list.</p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="candidate-invite-email">Calendar invite email (optional)</Label>
        <Input
          id="candidate-invite-email"
          type="email"
          placeholder="e.g. candidate@gmail.com"
          value={requestForm.candidateEmail}
          onChange={(e) => setRequestForm({ ...requestForm, candidateEmail: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Any email for the Google Calendar invite. Does not need to be a Mitra account.
        </p>
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
              View and book interviewer availability. Each color is one interviewer.
            </p> */}
          </div>
         
        </motion.div>

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
                        <SelectItem key={category.code} value={category.code}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    Technologies
                  </Label>
                
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
                            {filteredTechnologies.map((tech) => {
                              const isSelected = filterTech.includes(tech.id);
                              const isCore = isCandidateCoreTech(tech.id);
                              const isCandidate = isCandidateTech(tech.id);
                              const isCandidateNonCore = isCandidate && !isCore;
                              return (
                              <button key={tech.id} onClick={() => handleTechSelect(tech.id)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center justify-between ${
                                  isSelected
                                    ? (isCore
                                      ? 'bg-amber-50'
                                      : isCandidateNonCore
                                        ? 'bg-sky-50'
                                        : 'bg-primary/10')
                                    : ''
                                }`}>
                                <span className="flex items-center gap-2 font-medium">
                                  {isCore && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                                  {tech.name}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{getTechnologyCategoryLabel(tech)}</span>
                                  {isSelected && (
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        isCore
                                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                                          : isCandidateNonCore
                                            ? 'border-sky-300 bg-sky-50 text-sky-900'
                                            : ''
                                      }`}
                                    >
                                      {isCore ? 'Candidate Core' : isCandidate ? 'Candidate' : 'Selected'}
                                    </Badge>
                                  )}
                                </span>
                              </button>
                            );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                

                {filterTech.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filterTech.map((id) => {
                      const tech = technologies.find((t) => t.id === id);
                      const isCore = isCandidateCoreTech(id);
                      const isCandidate = isCandidateTech(id);
                      const isCandidateNonCore = isCandidate && !isCore;
                      return tech ? (
                        <Badge
                          key={id}
                          variant="outline"
                          className={`gap-1 pr-1 ${
                            isCore
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : isCandidateNonCore
                                ? 'border-sky-300 bg-sky-50 text-sky-900'
                                : 'border-slate-200 bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {isCore && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                          <span>{tech.name}</span>
                          
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
                <DomainMultiSelect
                  label="Domains"
                  domains={domains}
                  selectedIds={filterDomain}
                  highlightIds={candidateDomainIds}
                  onChange={setFilterDomain}
                  placeholder="Filter by domains…"
                />
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
                    {tiersForSelectedDept.map((t) => <SelectItem key={t.id} value={t.id.toString()}>Tier {t.tierOrder}: {t.name}</SelectItem>)}
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
                    {designationsForSelectedTier.map((d) => <SelectItem key={d.id} value={d.levelOrder.toString()}>Level {d.levelOrder}: {d.name}</SelectItem>)}
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
                    <div className="w-3 h-3 rounded-full bg-sky-600" />
                    <span className="text-sm"><span className="font-bold text-sky-700">{availableCount}</span><span className="text-muted-foreground ml-1">available</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-sm"><span className="font-bold text-indigo-700">{bookedCount}</span><span className="text-muted-foreground ml-1">booked</span></span>
                  </div>
                  {postponeCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-600" />
                      <span className="text-sm"><span className="font-bold text-orange-700">{postponeCount}</span><span className="text-muted-foreground ml-1">time change</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                    <span className="text-sm"><span className="font-bold text-slate-600">{completedCount}</span><span className="text-muted-foreground ml-1">completed</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-sm"><span className="font-bold text-slate-600">{countableEvents.length}</span><span className="text-muted-foreground ml-1">total</span></span>
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

        {/* ── Top Matching Interviewers ─────────────────────────────────────── */}
        {requestForm.candidateId && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Top Matching Interviewers
                    {matchingPanelMode && (
                      <Badge className="bg-sky-100 text-sky-800 border-sky-300">Panel Mode</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {matchingPanelMode
                      ? 'Select 2+ interviewers to find overlapping free times and schedule a panel.'
                      : 'Green = free within a week. Click a card for match details and free time.'}
                  </CardDescription>
                </div>
                {hasMatchingInterviewers && (
                  <Button
                    type="button"
                    size="sm"
                    variant={matchingPanelMode ? 'default' : 'outline'}
                    className="gap-2 shrink-0"
                    onClick={() => {
                      setMatchingPanelMode((value) => {
                        if (value) {
                          setSelectedMatchPanelIds([]);
                          setMatchingPanelDetailOpen(false);
                        }
                        return !value;
                      });
                    }}
                  >
                    <Users className="w-4 h-4" />
                    {matchingPanelMode ? 'Exit Panel Mode' : 'Panel Mode'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {matchingInterviewersLoading ? (
                <p className="text-sm text-muted-foreground">Finding matching interviewers…</p>
              ) : !hasMatchingInterviewers ? (
                <p className="text-sm text-muted-foreground italic">
                  No matching interviewers for{' '}
                  {selectedCandidate?.name || requestForm.candidateName || 'this candidate'}
                  {' '}with the current department / tier / level filters.
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {renderMatchingGroup(
                      'Matches both technologies & domains',
                      matchingInterviewers.both,
                      'both',
                    )}
                    {renderMatchingGroup(
                      'Matches technologies only',
                      matchingInterviewers.technologies,
                      'tech',
                    )}
                    {renderMatchingGroup(
                      'Matches domains only',
                      matchingInterviewers.domains,
                      'domain',
                    )}
                  </div>

                  {matchingPanelMode && (
                    <div className="rounded-xl border border-sky-300 bg-sky-50/80 p-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-sky-900">
                            Panel selection ({selectedMatchPanelIds.length})
                          </p>
                          <p className="text-xs text-sky-700/80 mt-0.5">
                            {selectedMatchPanelIds.length < 2
                              ? 'Select at least 2 interviewers, then pick an overlapping free time.'
                              : 'Pick a time opens the panel schedule view with shared free windows.'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={selectedMatchPanelIds.length < 2}
                          className="gap-2 shrink-0"
                          onClick={() => setMatchingPanelDetailOpen(true)}
                        >
                          <Clock className="w-4 h-4" />
                          Pick a time
                        </Button>
                      </div>

                      {selectedMatchPanelInterviewers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMatchPanelInterviewers.map((match) => (
                            <Badge
                              key={`panel-sel-${match.interviewerId}`}
                              className="bg-sky-100 text-sky-800 border-sky-300 gap-1 pr-1"
                            >
                              {match.interviewerName}
                              <button
                                type="button"
                                onClick={() => toggleMatchPanelSelection(match)}
                                className="ml-0.5 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <MatchingInterviewerDetailDialog
          open={matchingDetailOpen}
          onOpenChange={(open) => {
            setMatchingDetailOpen(open);
            if (!open) setSelectedMatchingInterviewer(null);
          }}
          match={selectedMatchingInterviewer}
          formatDateTimeRange={formatDateTimeRange}
          onSelectFreeSlot={handleMatchingFreeSlotSelect}
        />

        <MatchingPanelDetailDialog
          open={matchingPanelDetailOpen}
          onOpenChange={setMatchingPanelDetailOpen}
          interviewers={selectedMatchPanelInterviewers}
          interviewerColorMap={interviewerColorMap}
          onRemoveInterviewer={toggleMatchPanelSelection}
          onSelectOverlap={openPanelFromMatchingOverlap}
        />

        <ScheduleConflictDialog
          open={conflictDialog.open}
          onOpenChange={(open) => {
            if (!open && !scheduling) closeConflictDialog();
          }}
          conflicts={conflictDialog.conflicts}
          onConfirm={handleConflictConfirm}
          confirming={scheduling}
          panelMode={conflictDialog.panelMode}
        />

        {/* ── Calendar ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" /> Availability Calendar
                {panelMode && <Badge className="bg-sky-100 text-sky-800 border-sky-300">Panel Mode</Badge>}
              </CardTitle>
              <CardDescription>
                {panelMode
                  ? 'Click AVAILABLE slots to build a panel. Selected slots show a check badge. Overlap window is calculated automatically.'
                  : hasActiveInterviewerFilters
                    ? 'Filters active. Showing available slots only. Clear filters to see booked interviews.'
                    : 'Each color is a different interviewer. Click AVAILABLE to schedule. Click BOOKED (green) to cancel and restore.'}
              </CardDescription>
            </div>

            <Button
              type="button"
              size="sm"
              variant={panelMode ? 'default' : 'outline'}
              className="gap-2 lg:self-start"
              onClick={() => {
                setPanelMode((value) => !value);
                setPanelSlots([]);
              }}
            >
              <Users className="w-4 h-4" />
              {panelMode ? 'Exit Panel Mode' : 'Panel Interview Mode'}
            </Button>
          </CardHeader>
          {panelMode && (
            <CardContent className="pt-0 pb-4">
              <div className="flex flex-col gap-3 rounded-xl border border-sky-300 bg-sky-50 p-3 dark:bg-sky-950/20">
                {panelSlots.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {panelSlots.map((ps) => (
                      <Badge key={ps.slot.id} className="bg-sky-100 text-sky-800 border-sky-300 gap-1 pr-1">
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
                    className="bg-sky-600 hover:bg-sky-700 text-white gap-2 self-start"
                    disabled={panelTimeOptions.length === 0}
                    onClick={() => {
                      setPanelBookStartOverride('');
                      setPanelBookEndOverride('');
                      setRequestForm(prev => ({
                        candidateId: prev.candidateId,
                        candidateName: prev.candidateName,
                        candidateDesignationId: prev.candidateDesignationId,
                        interviewType: prev.interviewType,
                        interviewCoordinatorId: prev.interviewCoordinatorId,
                        interviewCoordinatorDepartmentId: prev.interviewCoordinatorDepartmentId,
                        requiredTechnologyIds: [],
                        isUrgent: false,
                        notes: '',
                      }));
                      setCandidateSearchTerm('');
                      setPanelDialogOpen(true);
                    }}
                  >
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
            </CardContent>
          )}
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
                    events={calendarEvents}
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

      {/* ══ CANCEL / REVIEW TIME CHANGE DIALOG ═══════════════════════════════ */}
      <Dialog open={cancelDialogOpen} onOpenChange={(o) => {
        if (!cancelling && !postponeActionLoading) setCancelDialogOpen(o);
      }}>
        <DialogContent className="max-w-lg gap-0 p-0 m-4 overflow-hidden">
          <DialogHeader className="border-b border-gray-100 px-5 py-4">
            <DialogTitle className={`flex items-center gap-2 ${
              cancelTarget?.resource?.hasPendingPostponeRequest ? 'text-amber-800' : 'text-red-700'
            }`}>
              {cancelTarget?.resource?.hasPendingPostponeRequest ? (
                <><CalendarClock className="w-5 h-5 shrink-0" /> Review Time Change</>
              ) : (
                <><Trash2 className="w-5 h-5 shrink-0" /> Cancel Interview</>
              )}
            </DialogTitle>
            <DialogDescription>
              {cancelTarget?.resource?.hasPendingPostponeRequest ? (
                cancelTarget.resource.pendingPostponePreferredStart
                && cancelTarget.resource.pendingPostponePreferredEnd ? (
                  <>
                    Accepting will <strong>cancel the current interview</strong> and schedule the
                    proposed time
                    {cancelTarget.resource.panelId ? ' for the whole panel' : ''}.
                    Declining keeps the original booking.
                  </>
                ) : (
                  <>
                    This is a postpone request <strong>without a proposed time</strong>.
                    Acknowledge to clear the request (booking stays), or cancel the interview
                    and schedule a new time manually.
                  </>
                )
              ) : cancelTarget?.resource?.panelId ? (
                <>
                  This is a <strong>panel interview</strong>. Cancelling will restore slots for{' '}
                  <strong>all panel interviewers</strong> and notify them.
                </>
              ) : (
                <>
                  The slot will be immediately restored to <strong>Available</strong> and the interviewer will be notified.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <DialogBody className="px-5 py-4 space-y-3">
              {cancelTarget.resource?.hasPendingPostponeRequest && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="font-semibold text-sm text-amber-900 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 shrink-0" />
                    {cancelTarget.resource.pendingPostponePreferredStart
                      && cancelTarget.resource.pendingPostponePreferredEnd
                      ? 'Time change requested'
                      : 'Postpone requested (no new time)'}
                  </p>
                  <p className="text-xs text-amber-800">
                    Current:{' '}
                    <strong>{formatDateTimeRange(cancelTarget.start, cancelTarget.end)}</strong>
                  </p>
                  {cancelTarget.resource.pendingPostponePreferredStart
                    && cancelTarget.resource.pendingPostponePreferredEnd ? (
                    <p className="text-xs text-amber-800">
                      Proposed:{' '}
                      <strong>
                        {formatDateTimeRange(
                          new Date(cancelTarget.resource.pendingPostponePreferredStart),
                          new Date(cancelTarget.resource.pendingPostponePreferredEnd),
                        )}
                      </strong>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-800">
                      No alternative time was proposed. Reschedule manually after acknowledging or cancelling.
                    </p>
                  )}
                  {cancelTarget.resource.panelId
                    && cancelTarget.resource.pendingPostponeRequestedByName && (
                    <p className="text-xs text-amber-800">
                      Requested by:{' '}
                      <strong>{cancelTarget.resource.pendingPostponeRequestedByName}</strong>
                    </p>
                  )}
                  {cancelTarget.resource.pendingPostponeReason && (
                    <p className="text-xs text-amber-800 break-words">
                      Reason: <strong>{cancelTarget.resource.pendingPostponeReason}</strong>
                    </p>
                  )}
                </div>
              )}
              <div className={`rounded-xl border p-4 space-y-2 ${
                cancelTarget.resource?.hasPendingPostponeRequest
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-red-100 bg-red-50'
              }`}>
                <p className="font-semibold text-sm">
                  {cancelTarget.resource.panelId ? 'Panel Interview' : 'Booked Interview'}
                </p>
                {cancelTarget.resource.panelId ? (
                  <p className="text-sm">
                    Panel Members:{' '}
                    <strong>
                      {[
                        ...new Set(
                          events
                            .filter(
                              (e) =>
                                e.resource?.panelId === cancelTarget.resource.panelId
                                && e.resource?.status === SlotStatus.BOOKED,
                            )
                            .map((e) => e.resource.interviewer)
                            .filter(Boolean),
                        ),
                      ].join(', ') || cancelTarget.resource.interviewer}
                    </strong>
                  </p>
                ) : (
                  <p className="text-sm">
                    Interviewer: <strong>{cancelTarget.resource.interviewer}</strong>
                  </p>
                )}
                {cancelTarget.resource.candidateName && (
                  <p className="text-sm">Candidate: <strong>{cancelTarget.resource.candidateName}</strong></p>
                )}
                {formatInterviewTypeLabel(cancelTarget.resource.interviewType) && (
                  <p className="text-sm">
                    Interview Type: <strong>{formatInterviewTypeLabel(cancelTarget.resource.interviewType)}</strong>
                  </p>
                )}
                {cancelTarget.resource.interviewCoordinatorName && (
                  <p className="text-sm">
                    Interview Coordinator: <strong>{cancelTarget.resource.interviewCoordinatorName}</strong>
                  </p>
                )}
                {cancelTarget.resource.coordinatedHrName && (
                  <p className="text-sm">
                    Candidate Coordinator: <strong>{cancelTarget.resource.coordinatedHrName}</strong>
                  </p>
                )}
                {cancelTarget.resource.meetingLink && (
                  <p className="text-sm break-all">
                    Google Meet:{' '}
                    <a
                      href={cancelTarget.resource.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline"
                    >
                      {cancelTarget.resource.meetingLink}
                    </a>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDateTimeRange(cancelTarget.start, cancelTarget.end)}
                </p>
              </div>
            </DialogBody>
          )}

          <DialogFooter className="flex-col gap-2 border-t border-gray-100 bg-slate-50/80 px-5 py-4 sm:flex-col sm:justify-stretch">
            {cancelTarget?.resource?.hasPendingPostponeRequest ? (
              <>
                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={handleRejectPostpone}
                    disabled={cancelling || postponeActionLoading}
                    className="w-full border-amber-300 text-amber-900 hover:bg-amber-50"
                  >
                    {postponeActionLoading
                      ? 'Working…'
                      : (cancelTarget.resource.pendingPostponePreferredStart
                        && cancelTarget.resource.pendingPostponePreferredEnd
                        ? 'Decline Proposal'
                        : 'Decline Request')}
                  </Button>
                  <Button
                    onClick={handleApprovePostpone}
                    disabled={cancelling || postponeActionLoading}
                    className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                  >
                    {postponeActionLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> Working…</>
                    ) : cancelTarget.resource.pendingPostponePreferredStart
                      && cancelTarget.resource.pendingPostponePreferredEnd ? (
                      <><CheckCircle2 className="w-4 h-4 shrink-0" /> Accept Proposed Time</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 shrink-0" /> Acknowledge Request</>
                    )}
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleCancelBooked}
                  disabled={cancelling || postponeActionLoading}
                  className="w-full gap-2"
                >
                  {cancelling ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> Cancelling…</>
                  ) : cancelTarget?.resource?.panelId ? (
                    <><Trash2 className="w-4 h-4 shrink-0" /> Cancel Panel</>
                  ) : (
                    <><Trash2 className="w-4 h-4 shrink-0" /> Cancel Interview</>
                  )}
                </Button>
              </>
            ) : (
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(false)}
                  disabled={cancelling || postponeActionLoading}
                  className="w-full"
                >
                  Keep Interview
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelBooked}
                  disabled={cancelling || postponeActionLoading}
                  className="w-full gap-2"
                >
                  {cancelling ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> Cancelling…</>
                  ) : cancelTarget?.resource?.panelId ? (
                    <><Trash2 className="w-4 h-4 shrink-0" /> Cancel Panel & Restore Slots</>
                  ) : (
                    <><Trash2 className="w-4 h-4 shrink-0" /> Cancel & Restore Slot</>
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ SINGLE INTERVIEW DIALOG ════════════════════════════════════════ */}
      <Dialog
        open={requestDialogOpen}
        onOpenChange={(open) => {
          if (scheduling) return;
          setRequestDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] gap-0 p-0 m-4 overflow-hidden">
          <DialogHeader className="px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="w-6 h-6 text-primary" /> Schedule Interview
            </DialogTitle>
            {/* <DialogDescription>
              Schedule an interview with {selectedSlot?.resource.interviewer}
            </DialogDescription> */}
          </DialogHeader>
          <DialogBody className="px-6 py-4">
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
                      {sortSkillsWithCoreFirst(
                        selectedSlot.resource.skills,
                        selectedSlot.resource.coreTechnologies,
                      ).map((s, i) => (
                        renderInterviewerSkillBadge(s, {
                          key: i,
                          coreTechnologies: selectedSlot.resource.coreTechnologies,
                        })
                      ))}
                    </div>
                  </div>
                  {(selectedSlot.resource.domains || []).length > 0 && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-primary mt-1" />
                      <div className="flex flex-wrap gap-2">
                        {selectedSlot.resource.domains.map((domain) => {
                          const isMatch = candidateDomainNames.has(String(domain).trim().toLowerCase());
                          return (
                            <Badge
                              key={`domain-${domain}`}
                              variant="outline"
                              className={
                                isMatch
                                  ? 'bg-teal-50 text-teal-900 border-teal-300'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }
                              title={isMatch ? 'Matches candidate domain' : undefined}
                            >
                              {domain}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                        Book part of the slot. Unused time stays available. Slots are automatically merged when cancelled.
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
                    <div className={`mt-3 p-2 rounded text-xs space-y-1 ${
                      hasSlotWindowConflict || slotWindowConflicts.error
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800'
                    }`}>
                      <p>
                        <strong>Interview:</strong>{' '}
                        {formatTimeRange(
                          parseTimeOnDate(bookStartTime, selectedSlot.start),
                          parseTimeOnDate(bookEndTime, selectedSlot.start),
                        )}
                      </p>
                      {bookStartTime > format(selectedSlot.start, 'HH:mm') && !hasSlotWindowConflict && (
                        <p className="text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {formatTimeRange(selectedSlot.start, parseTimeOnDate(bookStartTime, selectedSlot.start))} remains available
                        </p>
                      )}
                      {bookEndTime < format(selectedSlot.end, 'HH:mm') && !hasSlotWindowConflict && (
                        <p className="text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {formatTimeRange(parseTimeOnDate(bookEndTime, selectedSlot.start), selectedSlot.end)} remains available
                        </p>
                      )}
                      {slotWindowConflicts.loading && (
                        <p className="text-amber-700 dark:text-amber-300">Checking Google Calendar…</p>
                      )}
                      {slotWindowConflicts.error && (
                        <p className="flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{slotWindowConflicts.error}</span>
                        </p>
                      )}
                      {hasSlotWindowConflict && (
                        <div className="space-y-1 pt-1 border-t border-red-200/80">
                          <p className="font-semibold flex items-center gap-1 text-red-800">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Calendar conflict detected. Review before scheduling
                          </p>
                          {previewConflictEvents.map((event) => (
                            <p
                              key={event.googleEventId || `${event.title}-${event.startDateTime}`}
                              className="pl-4"
                            >
                              <strong>{event.title}</strong>
                              {': '}
                              {formatTimeRange(event.startDateTime, event.endDateTime)}
                              {event.calendarName ? `, ${event.calendarName}` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {renderInterviewTypeSection()}

              {renderCoordinatorSection()}

              {/* Candidate + privilege check */}
              {renderCandidateSection(singlePrivilegeError)}
            </div>
          )}
          </DialogBody>

          <DialogFooter className="px-6 py-4">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={scheduling}>
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={!!singlePrivilegeError || scheduling || slotWindowConflicts.loading}
              className={`gap-2${hasSlotWindowConflict ? ' bg-red-600 hover:bg-red-700 text-white' : ''}`}
              title={
                hasSlotWindowConflict
                  ? 'Calendar conflict detected. Click to review and proceed'
                  : singlePrivilegeError
                    ? 'Interviewer privilege too low for this candidate'
                    : undefined
              }
            >
              {scheduling ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scheduling…</>
              ) : (
                <><Send className="w-4 h-4" /> Schedule Interview</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ PANEL INTERVIEW DIALOG ════════════════════════════════════════ */}
      <Dialog
        open={panelDialogOpen}
        onOpenChange={(open) => {
          if (scheduling) return;
          setPanelDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] gap-0 p-0 m-4 overflow-hidden">
          <DialogHeader className="px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Users className="w-6 h-6 text-sky-600" /> Schedule Panel Interview
            </DialogTitle>
            <DialogDescription>
              One candidate with {panelSlots.length} interviewer{panelSlots.length !== 1 ? 's' : ''} simultaneously
            </DialogDescription>
          </DialogHeader>
        <DialogBody className="px-6 py-4">
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
                              {ps.slot.resource.department}, Slot: {formatTimeRange(ps.slot.start, ps.slot.end)}
                              {ps.slot.resource.interviewerTierOrder != null && (
                                <span className="ml-1 text-indigo-600">(Tier {ps.slot.resource.interviewerTierOrder})</span>
                              )}
                            </p>
                            {privErr && <p className="text-xs text-red-600 mt-0.5">{privErr}</p>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                          {sortSkillsWithCoreFirst(
                            ps.slot.resource.skills,
                            ps.slot.resource.coreTechnologies,
                          )
                            .slice(0, 2)
                            .map((s, i) => renderInterviewerSkillBadge(s, {
                              key: i,
                              className: 'text-xs',
                              coreTechnologies: ps.slot.resource.coreTechnologies,
                            }))}
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
                      <div className={`mt-2 p-2 rounded text-xs space-y-1 ${
                        hasSlotWindowConflict || slotWindowConflicts.error
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800'
                      }`}>
                        <p>
                          <strong>Interview:</strong>{' '}
                          {formatTimeRange(
                            parseTimeOnDate(panelBookStart, panelSlots[0].slot.start),
                            parseTimeOnDate(panelBookEnd, panelSlots[0].slot.start),
                          )}
                        </p>
                        {slotWindowConflicts.loading && (
                          <p className="text-amber-700 dark:text-amber-300">Checking Google Calendar…</p>
                        )}
                        {slotWindowConflicts.error && (
                          <p className="flex items-start gap-1">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{slotWindowConflicts.error}</span>
                          </p>
                        )}
                        {hasSlotWindowConflict && (
                          <div className="space-y-1 pt-1 border-t border-red-200/80">
                            <p className="font-semibold flex items-center gap-1 text-red-800">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Calendar conflict detected. Review before scheduling
                            </p>
                            {previewConflictEvents.map((event) => (
                              <p
                                key={event.googleEventId || `${event.interviewerName}-${event.title}-${event.startDateTime}`}
                                className="pl-4"
                              >
                                <strong>{event.interviewerName}:</strong> {event.title}
                                {': '}
                                {formatTimeRange(event.startDateTime, event.endDateTime)}
                                {event.calendarName ? `, ${event.calendarName}` : ''}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {renderInterviewTypeSection()}

            {renderCoordinatorSection()}

            {/* Candidate + privilege check (panel errors) */}
            {renderCandidateSection(panelPrivilegeErrors.length > 0 ? panelPrivilegeErrors : null)}
          </div>
        </DialogBody>
          <DialogFooter className="px-6 py-4">
            <Button variant="outline" onClick={() => setPanelDialogOpen(false)} disabled={scheduling}>
              Cancel
            </Button>
            <Button
              onClick={handleSendPanelRequest}
              className={`gap-2${
                hasSlotWindowConflict
                  ? ' bg-red-600 hover:bg-red-700 text-white'
                  : ' bg-sky-600 hover:bg-sky-700'
              }`}
              disabled={
                panelTimeOptions.length === 0
                || panelPrivilegeErrors.length > 0
                || scheduling
                || slotWindowConflicts.loading
              }
              title={
                hasSlotWindowConflict
                  ? 'Calendar conflict detected. Click to review and proceed'
                  : panelPrivilegeErrors.length > 0
                    ? 'One or more interviewers have insufficient privilege'
                    : undefined
              }
            >
              {scheduling ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scheduling…</>
              ) : (
                <><Users className="w-4 h-4" /> Schedule Panel Interview</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AvailabilityViewPage;
