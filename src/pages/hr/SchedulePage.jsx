import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from 'react-big-calendar';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Users, Search, CheckCircle, Filter, X, User, Briefcase, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { calendarLocalizer } from '@/lib/calendarUtils';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

const getRelativeDate = (dayOffset, hour, minute) => {
  const base = new Date();
  const date = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    hour,
    minute,
    0,
    0
  );
  return date;
};

const mockInterviewers = [
  {
    id: 1,
    name: 'John Doe',
    designation: 'Tech Lead',
    department: 'Engineering',
    skills: ['Java', 'React', 'AWS'],
    availability: [
      { start: getRelativeDate(1, 10, 0), end: getRelativeDate(1, 12, 0) },
      { start: getRelativeDate(2, 14, 0), end: getRelativeDate(2, 16, 0) },
      { start: getRelativeDate(3, 9, 0), end: getRelativeDate(3, 11, 0) },
    ],
  },
  {
    id: 2,
    name: 'Jane Smith',
    designation: 'Senior Engineer',
    department: 'Engineering',
    skills: ['Python', '.NET', 'Azure'],
    availability: [
      { start: getRelativeDate(1, 14, 0), end: getRelativeDate(1, 16, 0) },
      { start: getRelativeDate(4, 10, 0), end: getRelativeDate(4, 12, 0) },
    ],
  },
  {
    id: 3,
    name: 'Mike Johnson',
    designation: 'Architect',
    department: 'Engineering',
    skills: ['Java', 'AWS', 'Microservices'],
    availability: [
      { start: getRelativeDate(2, 10, 0), end: getRelativeDate(2, 12, 0) },
      { start: getRelativeDate(5, 15, 0), end: getRelativeDate(5, 17, 0) },
    ],
  },
  {
    id: 4,
    name: 'Sarah Williams',
    designation: 'Tech Lead',
    department: 'QA',
    skills: ['Python', 'Testing', 'Automation'],
    availability: [
      { start: getRelativeDate(1, 11, 0), end: getRelativeDate(1, 13, 0) },
      { start: getRelativeDate(3, 14, 0), end: getRelativeDate(3, 16, 0) },
    ],
  },
];

const mockCandidates = [
  { id: 1, name: 'Alice Johnson', designation: 'Senior Software Engineer', email: 'alice@email.com' },
  { id: 2, name: 'Bob Smith', designation: 'Tech Lead', email: 'bob@email.com' },
  { id: 3, name: 'Carol White', designation: 'Software Engineer', email: 'carol@email.com' },
  { id: 4, name: 'David Brown', designation: 'Architect', email: 'david@email.com' },
  { id: 5, name: 'Emma Davis', designation: 'Senior Software Engineer', email: 'emma@email.com' },
];

const SchedulePage = () => {
  const { formatDateWithWeekday, formatDateTime, formatTimeRange } = useFormattedDateTime();
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [selectedTechnology, setSelectedTechnology] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [filteredInterviewers, setFilteredInterviewers] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!selectedTechnology) {
      toast({
        title: "Missing Information",
        description: "Please select at least a technology to search",
        variant: "destructive"
      });
      return;
    }

    let filtered = mockInterviewers.filter(interviewer => {
      const hasSkill = selectedTechnology === 'ALL' || 
                      interviewer.skills.some(skill => 
                        skill.toLowerCase().includes(selectedTechnology.toLowerCase())
                      );
      const matchesDept = selectedDepartment === 'ALL' || 
                         interviewer.department === selectedDepartment;
      const matchesSearch = !filterSearchTerm || 
                           interviewer.name.toLowerCase().includes(filterSearchTerm.toLowerCase()) ||
                           interviewer.skills.some(s => s.toLowerCase().includes(filterSearchTerm.toLowerCase()));
      return hasSkill && matchesDept && matchesSearch;
    });

    setFilteredInterviewers(filtered);
    setHasSearched(true);

    const events = [];
    filtered.forEach(interviewer => {
      interviewer.availability.forEach((slot, index) => {
        events.push({
          id: `${interviewer.id}-${index}`,
          title: `${interviewer.name}`,
          start: slot.start,
          end: slot.end,
          resource: {
            interviewer: interviewer.name,
            interviewerId: interviewer.id,
            skills: interviewer.skills,
            designation: interviewer.designation,
            department: interviewer.department,
          }
        });
      });
    });

    setCalendarEvents(events);

    toast({
      title: "Search Complete",
      description: `Found ${filtered.length} interviewer${filtered.length !== 1 ? 's' : ''} with ${events.length} available slot${events.length !== 1 ? 's' : ''}`,
    });
  };

  const handleClearFilters = () => {
    setSelectedCandidate('');
    setSelectedTechnology('');
    setSelectedDesignation('');
    setSelectedDepartment('ALL');
    setFilterSearchTerm('');
    setFilteredInterviewers([]);
    setCalendarEvents([]);
    setHasSearched(false);
  };

  const handleScheduleSlot = (event) => {
    setSelectedSlot(event);
    setIsScheduleDialogOpen(true);
  };

  const confirmSchedule = (candidateId) => {
    if (!candidateId) {
      toast({
        title: "Error",
        description: "Please select a candidate",
        variant: "destructive"
      });
      return;
    }

    const candidate = mockCandidates.find(c => c.id === parseInt(candidateId));
    
    toast({
      title: "Interview Scheduled",
      description: `Interview scheduled for ${candidate.name} with ${selectedSlot.resource.interviewer} on ${formatDateTime(selectedSlot.start)}`,
    });
    
    setIsScheduleDialogOpen(false);
    setSelectedSlot(null);
    setCandidateSearchTerm('');
  };

  const filteredCandidatesForSearch = mockCandidates.filter(c => 
    c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    c.designation.toLowerCase().includes(candidateSearchTerm.toLowerCase())
  );

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: 'hsl(var(--primary))',
        borderRadius: '8px',
        opacity: 0.95,
        color: 'white',
        border: 'none',
        display: 'block',
        fontWeight: '500',
        padding: '4px 8px',
      },
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-primary" />
              Schedule Interview
            </h1>
            <p className="text-muted-foreground mt-1">Find available interviewers and schedule candidate interviews</p>
          </div>
          {hasSearched && (
            <Button variant="outline" onClick={handleClearFilters} className="gap-2">
              <X className="w-4 h-4" />
              Clear All Filters
            </Button>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Filter Panel */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="shadow-elegant sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5 text-primary" />
                  Search Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Quick Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or skill..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Technology Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Required Technology</Label>
                  <Select value={selectedTechnology} onValueChange={setSelectedTechnology}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select technology" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Technologies</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="react">React</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="dotnet">.NET</SelectItem>
                      <SelectItem value="aws">AWS</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="QA">QA</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Designation Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Target Designation</Label>
                  <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="se">Software Engineer</SelectItem>
                      <SelectItem value="sse">Senior Software Engineer</SelectItem>
                      <SelectItem value="tl">Tech Lead</SelectItem>
                      <SelectItem value="arch">Architect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSearch} className="w-full gap-2 mt-2">
                  <Search className="w-4 h-4" />
                  Find Interviewers
                </Button>

                {/* Results Summary */}
                <AnimatePresence>
                  {filteredInterviewers.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-4 border-t space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Available Interviewers</h3>
                        <Badge variant="secondary" className="text-xs">
                          {filteredInterviewers.length} found
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {filteredInterviewers.map((interviewer) => (
                          <motion.div 
                            key={interviewer.id} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-3 bg-accent/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{interviewer.name}</p>
                                <p className="text-xs text-muted-foreground">{interviewer.designation}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {interviewer.skills.slice(0, 3).map(skill => (
                                    <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Calendar Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-9"
          >
            <Card className="shadow-elegant overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Available Interview Slots
                  </CardTitle>
                  {calendarEvents.length > 0 && (
                    <Badge className="bg-primary/10 text-primary border-0">
                      {calendarEvents.length} slots available
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on any slot to schedule an interview with a candidate
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {calendarEvents.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-24 px-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                      <CalendarIcon className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-xl font-semibold text-foreground mb-2">No Results Yet</p>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Use the filters on the left to search for available interviewers. 
                      Select a technology to get started.
                    </p>
                  </motion.div>
                ) : (
                  <div className="h-[650px] p-4">
                    <Calendar
                      localizer={calendarLocalizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: '100%' }}
                      eventPropGetter={eventStyleGetter}
                      views={['month', 'week', 'day']}
                      defaultView="week"
                      onSelectEvent={handleScheduleSlot}
                      tooltipAccessor={(event) => 
                        `${event.resource.interviewer} • ${event.resource.skills.join(', ')}`
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Schedule Dialog */}
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Schedule Interview
              </DialogTitle>
            </DialogHeader>
            {selectedSlot && (
              <div className="space-y-5">
                {/* Slot Info Card */}
                <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{selectedSlot.resource.interviewer}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {selectedSlot.resource.designation} • {selectedSlot.resource.department}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedSlot.resource.skills.map(skill => (
                          <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {formatDateWithWeekday(selectedSlot.start)}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span>{formatTimeRange(selectedSlot.start, selectedSlot.end)}</span>
                  </div>
                </div>

                {/* Candidate Search */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Candidate</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or role..."
                      value={candidateSearchTerm}
                      onChange={(e) => setCandidateSearchTerm(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Candidate List */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {filteredCandidatesForSearch.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No candidates found matching your search
                    </p>
                  ) : (
                    filteredCandidatesForSearch.map(candidate => (
                      <motion.div
                        key={candidate.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => confirmSchedule(candidate.id.toString())}
                        className="p-3 border rounded-xl hover:bg-accent hover:border-primary/30 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground">{candidate.designation}</p>
                            <p className="text-xs text-muted-foreground">{candidate.email}</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SchedulePage;
