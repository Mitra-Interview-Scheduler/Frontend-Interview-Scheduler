// src/pages/hr/AvailabilityViewPage.jsx
// Changes in this version:
//   1. Custom RBC EventComponent — selected panel slots show a ✓ badge
//   2. Privilege check — blocks scheduling if interviewer is less senior than candidate
//   3. Slot merge is handled server-side (no frontend change needed)
import { useLocation } from 'react-router-dom'; // Add this import
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
  format, parse, startOfWeek, getDay, addMinutes, startOfDay,
} from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import {
  Calendar as CalendarIcon, Filter, X, User, Briefcase, Code, Clock,
  Send, TrendingUp, Award, Search, ChevronDown, Users, AlertCircle,
  CheckCircle2, Scissors, Trash2, ShieldAlert,
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
import './AvailabilityCalendar.css';


const CALENDAR_MIN_HOUR = parseInt(import.meta.env.VITE_CALENDAR_MIN_HOUR || '7');
const CALENDAR_MAX_HOUR = parseInt(import.meta.env.VITE_CALENDAR_MAX_HOUR || '19');
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales: { 'en-US': enUS },
});

// ── Per-interviewer color palette ────────────────────────────────────────────
const INTERVIEWER_PALETTES = [
  { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', solid: '#6366f1', border: '#312e81', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', solid: '#f59e0b', border: '#78350f', text: '#fff' },
  { bg: 'linear-gradient(135deg,#ec4899,#db2777)', solid: '#ec4899', border: '#831843', text: '#fff' },
  { bg: 'linear-gradient(135deg,#14b8a6,#0d9488)', solid: '#14b8a6', border: '#134e4a', text: '#fff' },
  { bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', solid: '#8b5cf6', border: '#3b0764', text: '#fff' },
  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', solid: '#ef4444', border: '#7f1d1d', text: '#fff' },
  { bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', solid: '#06b6d4', border: '#164e63', text: '#fff' },
  { bg: 'linear-gradient(135deg,#84cc16,#65a30d)', solid: '#84cc16', border: '#365314', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f97316,#ea580c)', solid: '#f97316', border: '#7c2d12', text: '#fff' },
  { bg: 'linear-gradient(135deg,#a855f7,#9333ea)', solid: '#a855f7', border: '#4a044e', text: '#fff' },
  { bg: 'linear-gradient(135deg,#10b981,#059669)', solid: '#10b981', border: '#064e3b', text: '#fff' },
  { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', solid: '#3b82f6', border: '#1e3a8a', text: '#fff' },
  { bg: 'linear-gradient(135deg,#d946ef,#c026d3)', solid: '#d946ef', border: '#581c87', text: '#fff' },
  { bg: 'linear-gradient(135deg,#64748b,#475569)', solid: '#64748b', border: '#1e293b', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f43f5e,#e11d48)', solid: '#f43f5e', border: '#881337', text: '#fff' },
  { bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)', solid: '#0ea5e9', border: '#0c4a6e', text: '#fff' },
];

const PANEL_PALETTE = {
  bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
  solid: '#0ea5e9',
  border: '#0c4a6e',
  text: '#fff',
};

const BOOKED_OVERLAY = {
  bg: 'linear-gradient(135deg,#10b981,#059669)',
  solid: '#10b981',
  border: '#064e3b',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const formatLocalDateTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

const formatInputDateTime = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const generateTimeOptions = (startDate, endDate) => {
  const options = [];
  let cur = new Date(startDate);
  while (cur <= endDate) {
    options.push({ label: format(cur, 'h:mm a'), value: format(cur, 'HH:mm'), date: new Date(cur) });
    cur = addMinutes(cur, 30);
  }
  return options;
};

const parseTimeOnDate = (timeStr, referenceDate) => {
  const [h, m] = timeStr.split(':').map(Number);
  const r = new Date(referenceDate);
  r.setHours(h, m, 0, 0);
  return r;
};

// ── Privilege check ───────────────────────────────────────────────────────────
/**
 * Returns an error string if the interviewer is less senior than the candidate,
 * or null if the check passes (or data is missing).
 *
 * Logic:
 *  - First compare tierOrder: higher tier = more senior
 *  - If same tier, compare levelOrder: higher level = more senior
 *  - interviewer must be >= candidate on both dimensions
 *
 * Requires backend to expose interviewerTierOrder / interviewerLevelOrder on
 * the slot resource, and targetDesignationTierOrder / targetDesignationLevelOrder
 * on the candidate (see BACKEND_DTO_ADDITIONS.java).
 */
const checkInterviewerPrivilege = (slotResource, candidate) => {
  if (!slotResource || !candidate) return null;

  const ivTier  = slotResource.interviewerTierOrder;
  const ivLevel = slotResource.interviewerLevelOrder;
  const cTier   = candidate.targetDesignationTierOrder;
  const cLevel  = candidate.targetDesignationLevelOrder;

  // If we don't have numeric data from the backend, skip the check gracefully
  if (ivTier == null || cTier == null) return null;

  if (ivTier < cTier) {
    return `The interviewer's tier (Tier ${ivTier}) is below the candidate's required tier (Tier ${cTier}). Please choose a more senior interviewer.`;
  }
  if (ivTier === cTier && ivLevel != null && cLevel != null && ivLevel < cLevel) {
    return `The interviewer is at the same tier but a lower level (Level ${ivLevel}) than the candidate requires (Level ${cLevel}). Please choose a more senior interviewer.`;
  }
  return null;
};

/**
 * For panel interviews: check ALL selected interviewers.
 * Returns a list of { name, reason } for any that fail.
 */
const checkPanelPrivilege = (panelSlots, candidate) => {
  if (!candidate) return [];
  return panelSlots
    .map((ps) => {
      const err = checkInterviewerPrivilege(ps.slot.resource, candidate);
      return err ? { name: ps.slot.resource.interviewer, reason: err } : null;
    })
    .filter(Boolean);
};

// ── Component ────────────────────────────────────────────────────────────────
const AvailabilityViewPage = () => {
  const location = useLocation();
  const [rawSlots, setRawSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [candidates, setCandidates] = useState([]);

  const [interviewerColorMap, setInterviewerColorMap] = useState({});

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
  const [pendingFilter, setPendingFilter] = useState(null);

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

  // ── Build color map ────────────────────────────────────────────────────────
  const buildColorMap = useCallback((slots) => {
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
  }, []);

  // ── Format slots → calendar events ───────────────────────────────────────
  const formatSlots = useCallback((data, colorMap) => {
    return data.map((slot) => {
      const isBooked = slot.status === 'BOOKED';
      const paletteIdx = colorMap[slot.interviewerId] ?? 0;
      const palette = isBooked ? BOOKED_OVERLAY : INTERVIEWER_PALETTES[paletteIdx];
      const skills = slot.technologies || [];
      const skillLabel = skills.length
        ? ` · ${skills.slice(0, 2).join(', ')}${skills.length > 2 ? ' +' + (skills.length - 2) : ''}`
        : '';

      return {
        id: slot.slotId,
        interviewerId: slot.interviewerId,
        paletteIdx,
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
          requestId: slot.requestId ?? null,
          palette,
          // Tier / level for privilege check (populated by backend)
          interviewerTierOrder:  slot.interviewerTierOrder  ?? null,
          interviewerLevelOrder: slot.interviewerLevelOrder ?? null,
        },
      };
    });
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────


  useEffect(() => {
    // Check if we arrived here via the "Schedule" button
    const incomingFilter = location.state?.filterData;
    
    if (incomingFilter) {
      // Store the incoming filter to process after tiers/designations load
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

      if (incomingFilter.minTierOrder) {

      }

      // 3. Set the pre-selected candidate for the Booking Dialog later
      setRequestForm(prev => ({
        ...prev,
        candidateId: incomingFilter.candidateId,
        candidateName: incomingFilter.candidateName
      }));
      
      // Note: Tier and Level will be set in subsequent useEffects
      // after tiers and designations are loaded
    }
  }, [location.state]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [availData, deptData, techData, desigData, tierData, candData] = await Promise.all([
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
        setCandidates(candData);
        const colorMap = buildColorMap(availData);
        setRawSlots(availData);
        setEvents(formatSlots(availData, colorMap));
      } catch (err) {
        toast({ title: 'Error loading availability', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [buildColorMap, formatSlots]);

  useEffect(() => {
    if (selectedDeptForDesignation) loadTiersForDept(selectedDeptForDesignation);
    else { setTiersForSelectedDept([]); setSelectedTierInDept(''); setMinDesignationLevel(''); }
  }, [selectedDeptForDesignation]);

  // ── Auto-set Tier from pending filter ───────────────────────────────────────
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
    if (selectedTierInDept) loadDesignationsForTier(parseInt(selectedTierInDept));
    else { setDesignationsForSelectedTier([]); setMinDesignationLevel(''); }
  }, [selectedTierInDept]);

  // ── Auto-set Level from pending filter ───────────────────────────────────────
  useEffect(() => {
    if (pendingFilter && designationsForSelectedTier.length > 0) {
      const { minLevelOrder } = pendingFilter;      
      if (minLevelOrder != null) {
        // Find the designation with matching levelOrder
        const matchingDesignation = designationsForSelectedTier.find(d => d.id === minLevelOrder);
        if (matchingDesignation) {
          setMinDesignationLevel(matchingDesignation.levelOrder.toString());
        }
      }
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
    if (!loading) applyFilters();
  }, [filterDept, filterTech, minExperience, dateRange,
      selectedDeptForDesignation, selectedTierInDept, minDesignationLevel]);

  useEffect(() => {
    if (dateRange.start) {
      setCalendarDate(new Date(dateRange.start));
    }
  }, [dateRange.start]);

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
        const d = designationsForSelectedTier.find((d) => d.id.toString() === minDesignationLevel);
        levelOrderToSend = d ? d.levelOrder : null;
      }

      const filters = {
        departmentIds: filterDept.length > 0 ? filterDept : null,
        technologyIds: filterTech.length > 0 ? filterTech : null,
        minYearsOfExperience: minExperience ? parseInt(minExperience) : null,
        startDateTime: dateRange.start ? formatLocalDateTime(dateRange.start) : null,
        endDateTime: dateRange.end ? formatLocalDateTime(dateRange.end) : null,
        departmentIdForDesignationFilter: selectedDeptForDesignation ? parseInt(selectedDeptForDesignation) : null,
        minTierId: tierOrderToSend,
        minDesignationLevelInDepartment: levelOrderToSend,
      };
      const data = await hrAvailabilityAPI.getAllAvailability(filters);
      const colorMap = buildColorMap(data);
      setRawSlots(data);
      setEvents(formatSlots(data, colorMap));
    } catch (err) {
      toast({ title: 'Filter error', description: err.message, variant: 'destructive' });
    }
  };

  const refreshCalendar = async () => {
    const data = await hrAvailabilityAPI.getAllAvailability();
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
    setRequestForm({
      candidateId: null, candidateName: '', candidateDesignationId: '',
      requiredTechnologyIds: event.resource.skills.map((s) => {
        const t = technologies.find((t) => t.name === s);
        return t?.id || null;
      }).filter(Boolean),
      isUrgent: false, notes: '',
    });
    setCandidateSearchTerm('');
    setRequestDialogOpen(true);
  };

  // ── Custom calendar event component ──────────────────────────────────────
  // Shows a ✓ icon + "Panel" label when a slot is selected in panel mode.
  const CalendarEventComponent = useCallback(({ event }) => {
    const isInPanel  = panelSlots.some((ps) => ps.slot.id === event.id);
    const isBooked   = event.resource?.status === 'BOOKED';

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        overflow: 'hidden',
        height: '100%',
        width: '100%',
      }}>
        {/* Panel-selected indicator */}
        {isInPanel && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 3,
            padding: '1px 4px',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            <CheckCircle2 style={{ width: 9, height: 9 }} />
            Panel
          </span>
        )}
        {/* Lock icon for booked */}
        {isBooked && !isInPanel && (
          <span style={{ fontSize: 10, flexShrink: 0 }}>🔒</span>
        )}
        {/* Title text */}
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 11,
          flex: 1,
          minWidth: 0,
        }}>
          {/* Strip leading emoji from title if we already show the icon */}
          {isBooked
            ? event.title.replace(/^🔒\s*/, '')
            : event.resource?.interviewer || event.title}
        </span>
      </div>
    );
  }, [panelSlots]);

  // ── Event style ───────────────────────────────────────────────────────────
  const eventStyleGetter = useCallback((event) => {
    const isBooked   = event.resource?.status === 'BOOKED';
    const isInPanel  = panelSlots.some((ps) => ps.slot.id === event.id);
    let palette;

    if (isInPanel) {
      palette = PANEL_PALETTE;
    } else {
      palette = event.resource?.palette || INTERVIEWER_PALETTES[0];
    }

    return {
      style: {
        background: palette.bg,
        borderRadius: '5px',
        opacity: isBooked ? 0.82 : 0.94,
        color: 'white',
        borderLeft: `3px solid ${palette.border || palette.solid}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        padding: '3px 6px',
        fontSize: '11px',
        fontWeight: '500',
        boxShadow: isInPanel
          ? `0 2px 10px ${PANEL_PALETTE.solid}50, 0 0 0 2px #7dd3fc`
          : `0 1px 4px ${palette.solid}30`,
        cursor: 'pointer',
        overflow: 'hidden',
        maxWidth: '100%',
        outline: 'none',
      },
    };
  }, [panelSlots]);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const tooltipAccessor = (event) => {
    const r = event.resource;
    const isInPanel = panelSlots.some((ps) => ps.slot.id === event.id);
    if (r?.status === 'BOOKED')
      return `🔒 BOOKED — ${r.interviewer}\n${r.candidateName ? 'Candidate: ' + r.candidateName : ''}\n${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}\n\nClick to cancel & restore slot`;
    if (isInPanel)
      return `✅ PANEL SELECTED — ${r.interviewer}\n${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}\n\nClick again to remove from panel`;
    return [
      `👤 ${r.interviewer}`,
      r.designation ? `📋 ${r.designation}` : null,
      r.department  ? `🏢 ${r.department}` : null,
      r.yearsOfExperience ? `⏱ ${r.yearsOfExperience} yrs` : null,
      r.skills?.length ? `💻 ${r.skills.join(', ')}` : null,
      `🕐 ${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`,
    ].filter(Boolean).join('\n');
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
  const handleTechSelect = (id) =>
    setFilterTech(filterTech.includes(id) ? filterTech.filter((x) => x !== id) : [...filterTech, id]);

  const clearFilters = () => {
    setFilterDept([]); setFilterTech([]); setTechSearchTerm(''); setMinExperience('');
    setDateRange({ start: null, end: null }); setSelectedDeptForDesignation('');
    setMinDesignationLevel(''); setSelectedTierInDept('');
    setTiersForSelectedDept([]); setDesignationsForSelectedTier([]);
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
  const filteredTechnologies = techSearchTerm.trim()
    ? technologies.filter((t) => t.name.toLowerCase().includes(techSearchTerm.toLowerCase()))
    : technologies;

  const filteredGroupedTechs = filteredTechnologies.reduce((acc, tech) => {
    const cat = tech.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tech);
    return acc;
  }, {});

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
            <p className="text-muted-foreground text-lg">
              View and book interviewer availability · each color = one interviewer
            </p>
          </div>
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" /> Clear Filters
          </Button>
        </motion.div>

        {/* Interviewer color legend */}
        {interviewerLegend.length > 0 && (
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
        )}

        {/* Slot counts */}
        <div className="flex items-center gap-6 px-1 flex-wrap">
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
                                  <button key={tech.id} onClick={() => handleTechSelect(tech.id)}
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
                    <span className="text-sm"><span className="font-bold text-emerald-600">{bookedCount}</span><span className="text-muted-foreground ml-1">booked</span></span>
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

        {/* Panel mode banner */}
        <Card className={panelMode ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/20' : ''}>
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
                        setRequestForm({ candidateId: null, candidateName: '', candidateDesignationId: '', requiredTechnologyIds: [], isUrgent: false, notes: '' });
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
                  style={{ height: '720px' }}>
                  <Calendar
                    localizer={localizer}
                    events={events}
                    date={calendarDate}
                    onNavigate={(nextDate) => {
                      const nextDay = startOfDay(nextDate);
                      if (calendarLockStart && nextDay < calendarLockStart) {
                        setCalendarDate(calendarLockStart);
                        return;
                      }
                      setCalendarDate(nextDay);
                    }}
                    startAccessor="start"
                    endAccessor="end"
                    scrollToTime={calendarLockStart ? calendarLockStart : new Date(1970, 0, 1, CALENDAR_MIN_HOUR, 0)}                    onSelectEvent={handleEventClick}
                    eventPropGetter={eventStyleGetter}
                    dayPropGetter={calendarDayPropGetter}
                    slotPropGetter={calendarSlotPropGetter}
                    // ── Custom event component with panel ✓ icon ──────────────
                    components={{ event: CalendarEventComponent }}
                    style={{ height: '100%' }}
                    views={['month', 'week', 'day']}
                    defaultView="week"
                    step={60}
                    timeslots={1}
                    min={new Date(1970, 0, 1, CALENDAR_MIN_HOUR, 0)}
                    max={new Date(1970, 0, 1, CALENDAR_MAX_HOUR, 0)}
                    tooltipAccessor={tooltipAccessor}
                    popup
                    showMultiDayTimes
                    formats={{
                      timeGutterFormat: 'HH:mm',
                      eventTimeRangeFormat: ({ start, end }) =>
                        `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
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
        <DialogContent className="max-w-md">
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
                {format(cancelTarget.start, 'PPP')} · {format(cancelTarget.start, 'h:mm a')} – {format(cancelTarget.end, 'h:mm a')}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="w-6 h-6 text-primary" /> Schedule Interview
            </DialogTitle>
            {/* <DialogDescription>
              Schedule an interview with {selectedSlot?.resource.interviewer}
            </DialogDescription> */}
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-6 py-4">
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
                      {format(selectedSlot.start, 'PPP')} · {format(selectedSlot.start, 'h:mm a')} – {format(selectedSlot.end, 'h:mm a')}
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
                      <p><strong>Interview:</strong> {format(parseTimeOnDate(bookStartTime, selectedSlot.start), 'h:mm a')} – {format(parseTimeOnDate(bookEndTime, selectedSlot.start), 'h:mm a')}</p>
                      {bookStartTime > format(selectedSlot.start, 'HH:mm') && (
                        <p className="text-emerald-700"><CheckCircle2 className="w-3 h-3 inline mr-1" />{format(selectedSlot.start, 'h:mm a')} – {format(parseTimeOnDate(bookStartTime, selectedSlot.start), 'h:mm a')} remains available</p>
                      )}
                      {bookEndTime < format(selectedSlot.end, 'HH:mm') && (
                        <p className="text-emerald-700"><CheckCircle2 className="w-3 h-3 inline mr-1" />{format(parseTimeOnDate(bookEndTime, selectedSlot.start), 'h:mm a')} – {format(selectedSlot.end, 'h:mm a')} remains available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Candidate + privilege check */}
              {renderCandidateSection(singlePrivilegeError)}
            </div>
          )}

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

          <div className="space-y-6 py-4">
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
                              {ps.slot.resource.department} · Slot: {format(ps.slot.start, 'h:mm a')} – {format(ps.slot.end, 'h:mm a')}
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
                        {format(parseTimeOnDate(panelBookStart, panelSlots[0].slot.start), 'h:mm a')} – {format(parseTimeOnDate(panelBookEnd, panelSlots[0].slot.start), 'h:mm a')}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Candidate + privilege check (panel errors) */}
            {renderCandidateSection(panelPrivilegeErrors.length > 0 ? panelPrivilegeErrors : null)}
          </div>

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