// src/pages/hr/AvailabilityViewPage.jsx - UPDATED WITH FIXED TIER FILTERING
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Calendar as CalendarIcon, Filter, X, User, Mail, Briefcase, Code, Clock, Send, TrendingUp, Award, Search, Info } from 'lucide-react';
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
  const [minExperience, setMinExperience] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedDeptForDesignation, setSelectedDeptForDesignation] = useState('');
  const [minDesignationLevel, setMinDesignationLevel] = useState('');
  const [selectedTierInDept, setSelectedTierInDept] = useState('');
  const [designationsForSelectedDept, setDesignationsForSelectedDept] = useState([]);
  const [tiersForSelectedDept, setTiersForSelectedDept] = useState([]);
  const [designationsForSelectedTier, setDesignationsForSelectedTier] = useState([]);
  
  // Dialog states
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [requestForm, setRequestForm] = useState({
    candidateId: null,
    candidateName: '',
    candidateDesignationId: '',
    requiredTechnologyIds: [],
    isUrgent: false,
    notes: ''
  });

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
      // selectedTierInDept now contains tier ID, not tierOrder
      const tierId = parseInt(selectedTierInDept);
      loadDesignationsForTier(tierId);
    } else {
      setDesignationsForSelectedTier([]);
      setMinDesignationLevel('');
    }
  }, [selectedTierInDept]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [availabilityData, deptData, techData, desigData, tierData, candidatesData] = await Promise.all([
        hrAvailabilityAPI.getAllAvailability(),
        departmentAPI.getAllDepartments(),
        technologyAPI.getAllTechnologies(),
        designationAPI.getAllDesignations(),
        tierAPI.getAllTiers(),
        candidateAPI.getAllCandidates()
      ]);

      setDepartments(deptData);
      setTechnologies(techData);
      setDesignations(desigData);
      setTiers(tierData);
      setCandidates(candidatesData);

      const formattedEvents = availabilityData.map(slot => ({
        id: slot.slotId,
        interviewerId: slot.interviewerId,
        title: `${slot.interviewerName} - ${slot.technologies.join(', ') || 'Available'}`,
        start: new Date(slot.startDateTime),
        end: new Date(slot.endDateTime),
        resource: {
          ...slot,
          interviewer: slot.interviewerName,
          department: slot.department,
          designation: slot.designation,
          skills: slot.technologies,
          yearsOfExperience: slot.yearsOfExperience
        },
      }));

      setEvents(formattedEvents);
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

  const loadTiersAndDesignationsForDepartment = async (departmentId) => {
    try {
      const [tiersData, designationsData] = await Promise.all([
        tierAPI.getTiersByDepartment(parseInt(departmentId)),
        designationAPI.getDesignationsByDepartment(parseInt(departmentId))
      ]);
      setTiersForSelectedDept(tiersData.sort((a, b) => a.tierOrder - b.tierOrder));
      setDesignationsForSelectedDept(designationsData.sort((a, b) => {
        // Sort by tier first, then by level within tier
        if (a.tierOrder !== b.tierOrder) {
          return a.tierOrder - b.tierOrder;
        }
        return a.levelOrder - b.levelOrder;
      }));
    } catch (error) {
      console.error('Failed to load tiers and designations:', error);
    }
  };

  const loadDesignationsForTier = async (tierId) => {
    try {
      const designationsData = await designationAPI.getDesignationsByTier(parseInt(tierId));
      setDesignationsForSelectedTier(designationsData.sort((a, b) => a.levelOrder - b.levelOrder));
    } catch (error) {
      console.error('Failed to load designations for tier:', error);
    }
  };

  const applyFilters = async () => {
    if (loading) return;

    try {
      // Get tierOrder from selected tier ID
      let tierOrderToSend = null;
      if (selectedTierInDept) {
        const selectedTier = tiersForSelectedDept.find(t => t.id.toString() === selectedTierInDept);
        tierOrderToSend = selectedTier ? selectedTier.tierOrder : null;
      }

      const filters = {
        departmentIds: filterDept.length > 0 ? filterDept : null,
        technologyIds: filterTech.length > 0 ? filterTech : null,
        minYearsOfExperience: minExperience ? parseInt(minExperience) : null,
        startDateTime: dateRange.start ? dateRange.start.toISOString() : null,
        endDateTime: dateRange.end ? dateRange.end.toISOString() : null,
        departmentIdForDesignationFilter: selectedDeptForDesignation ? parseInt(selectedDeptForDesignation) : null,
        minTierId: tierOrderToSend,  // Send tierOrder, not tier ID
        minDesignationLevelInDepartment: minDesignationLevel ? parseInt(minDesignationLevel) : null
      };

      console.log('Applying filters:', filters);

      const data = await hrAvailabilityAPI.getAllAvailability(filters);

      console.log('Received data:', data);

      const formattedEvents = data.map(slot => ({
        id: slot.slotId,
        interviewerId: slot.interviewerId,
        title: `${slot.interviewerName} - ${slot.technologies.join(', ') || 'Available'}`,
        start: new Date(slot.startDateTime),
        end: new Date(slot.endDateTime),
        resource: {
          ...slot,
          interviewer: slot.interviewerName,
          department: slot.department,
          designation: slot.designation,
          skills: slot.technologies,
          yearsOfExperience: slot.yearsOfExperience
        },
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Filter error:', error);
      toast({
        title: 'Error applying filters',
        description: error.response?.data?.message || 'Failed to filter availability',
        variant: 'destructive',
      });
    }
  };

  const handleEventClick = (event) => {
    setSelectedSlot(event);
    setRequestForm({
      candidateId: null,
      candidateName: '',
      candidateDesignationId: '',
      requiredTechnologyIds: event.resource.skills.map(skill => {
        const tech = technologies.find(t => t.name === skill);
        return tech ? tech.id : null;
      }).filter(id => id !== null),
      isUrgent: false,
      notes: ''
    });
    setCandidateSearchTerm('');
    setRequestDialogOpen(true);
  };

  const handleSelectCandidate = (candidate) => {
    setRequestForm({
      ...requestForm,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDesignationId: candidate.targetDesignationId || ''
    });
    setCandidateSearchTerm('');
  };

  const handleClearCandidate = () => {
    setRequestForm({
      ...requestForm,
      candidateId: null,
      candidateName: '',
      candidateDesignationId: ''
    });
  };

  const handleSendRequest = async () => {
    if (!requestForm.candidateName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please select or enter a candidate name',
        variant: 'destructive',
      });
      return;
    }

    try {
      await hrAvailabilityAPI.createInterviewRequest({
        candidateId: requestForm.candidateId,
        candidateName: requestForm.candidateName,
        candidateDesignationId: requestForm.candidateDesignationId || null,
        requiredTechnologyIds: requestForm.requiredTechnologyIds,
        availabilitySlotId: selectedSlot.id,
        preferredStartDateTime: selectedSlot.start.toISOString(),
        preferredEndDateTime: selectedSlot.end.toISOString(),
        isUrgent: requestForm.isUrgent,
        notes: requestForm.notes
      });

      toast({
        title: '✓ Interview scheduled',
        description: `Interview scheduled for ${requestForm.candidateName} with ${selectedSlot.resource.interviewer}`,
      });

      setRequestDialogOpen(false);
      setSelectedSlot(null);
      applyFilters(); // Refresh to remove the booked slot
    } catch (error) {
      toast({
        title: 'Failed to schedule interview',
        description: error.response?.data?.message || 'Unable to schedule interview',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setFilterDept([]);
    setFilterTech([]);
    setMinExperience('');
    setDateRange({ start: null, end: null });
    setSelectedDeptForDesignation('');
    setMinDesignationLevel('');
    setSelectedTierInDept('');
    setDesignationsForSelectedDept([]);
    setTiersForSelectedDept([]);
    setDesignationsForSelectedTier([]);
  };

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: '#6366f1',
        borderRadius: '6px',
        opacity: 0.95,
        color: 'white',
        border: '2px solid #4f46e5',
        display: 'block',
        padding: '6px 10px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      },
    };
  };

  // Filter candidates based on search term
  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    (c.targetDesignationName && c.targetDesignationName.toLowerCase().includes(candidateSearchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-6">
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Department Filter */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filterDept.length > 0 ? filterDept[0].toString() : "ALL"}
                  onValueChange={(value) => setFilterDept(value === "ALL" ? [] : [parseInt(value)])}
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

              {/* Technology Filter */}
              <div className="space-y-2">
                <Label>Technology</Label>
                <Select
                  value={filterTech.length > 0 ? filterTech[0].toString() : "ALL"}
                  onValueChange={(value) => setFilterTech(value === "ALL" ? [] : [parseInt(value)])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Technologies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Technologies</SelectItem>
                    {technologies.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id.toString()}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Experience Filter */}
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

              {/* Department for Tier/Designation Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Department for Tier/Level Filter
                </Label>
                <Select
                  value={selectedDeptForDesignation || "NONE"}
                  onValueChange={(value) => {
                    setSelectedDeptForDesignation(value === "NONE" ? "" : value);
                    setSelectedTierInDept('');
                    setMinDesignationLevel('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Tier Filter - Only shows tiers for selected department */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Min. Tier in Department
                </Label>
                <Select
                  value={selectedTierInDept || "ANY"}
                  onValueChange={(value) => {
                    if (value === "ANY") {
                      setSelectedTierInDept('');
                      setMinDesignationLevel('');
                    } else {
                      // Store tier ID (for API call) and tierOrder (for filter)
                      setSelectedTierInDept(value);
                      setMinDesignationLevel('');
                    }
                  }}
                  disabled={!selectedDeptForDesignation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDeptForDesignation ? "Select Tier" : "Select Department First"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any Tier</SelectItem>
                    {tiersForSelectedDept.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id.toString()} data-tier-order={tier.tierOrder}>
                        Tier {tier.tierOrder} - {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Shows interviewers in this tier or higher within the selected department</span>
                </p>
              </div>

              {/* Min Designation Level Filter - Shows levels for selected tier */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Min. Level in Tier
                </Label>
                <Select
                  value={minDesignationLevel || "ANY"}
                  onValueChange={(value) => setMinDesignationLevel(value === "ANY" ? "" : value)}
                  disabled={!selectedTierInDept}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedTierInDept ? "Select Level" : "Select Tier First"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any Level</SelectItem>
                    {designationsForSelectedTier.map((desig) => (
                      <SelectItem key={desig.id} value={desig.levelOrder.toString()}>
                        Level {desig.levelOrder} - {desig.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Within the selected tier, shows this level or higher. Note: Any level in higher tier also passes.</span>
                </p>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Available Slots Found:</span>
                <span className="text-3xl font-bold text-primary">{events.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Availability Calendar
            </CardTitle>
            <CardDescription>
              Click on any availability slot to schedule an interview
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
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Loading availability...</p>
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
                      `${event.resource.interviewer} - ${event.resource.designation || 'N/A'} - ${event.resource.skills.join(', ')}`
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Interview Schedule Dialog */}
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
              {/* Interviewer Details */}
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
                      {format(selectedSlot.start, 'PPP')} • {format(selectedSlot.start, 'p')} - {format(selectedSlot.end, 'p')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <p className="text-sm">
                      {selectedSlot.resource.yearsOfExperience || 0} years of experience
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Code className="w-5 h-5 text-primary mt-1" />
                    <div className="flex flex-wrap gap-2">
                      {selectedSlot.resource.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Candidate *</Label>
                  
                  {requestForm.candidateId ? (
                    // Show selected candidate
                    <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{requestForm.candidateName}</p>
                          <p className="text-sm text-muted-foreground">
                            {candidates.find(c => c.id === requestForm.candidateId)?.email}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearCandidate}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Search candidates */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search candidates by name, email, or position..."
                          value={candidateSearchTerm}
                          onChange={(e) => setCandidateSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Candidate list */}
                      {candidateSearchTerm && (
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                          {filteredCandidates.length === 0 ? (
                            <p className="p-4 text-center text-sm text-muted-foreground">
                              No candidates found. You can enter a name manually below.
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
                                    <p className="text-xs text-muted-foreground">
                                      {candidate.targetDesignationName}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual entry option */}
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Or enter candidate name manually
                        </Label>
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
                  <Label htmlFor="designation">Designation (Optional)</Label>
                  <Select
                    value={requestForm.candidateDesignationId?.toString() || "NONE"}
                    onValueChange={(value) => setRequestForm({ ...requestForm, candidateDesignationId: value === "NONE" ? '' : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {designations.map((desig) => (
                        <SelectItem key={desig.id} value={desig.id.toString()}>
                          {desig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Required Technologies</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedSlot.resource.skills.map((skill) => {
                      const tech = technologies.find(t => t.name === skill);
                      return tech ? (
                        <Badge key={tech.id} variant="secondary">
                          {tech.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements or notes..."
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                    rows={4}
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
                  <Label htmlFor="urgent" className="cursor-pointer">
                    Mark as urgent
                  </Label>
                </div>
              </div>
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
    </Layout>
  );
};

export default AvailabilityViewPage;