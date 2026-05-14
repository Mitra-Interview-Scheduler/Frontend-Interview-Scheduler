
import { useState } from 'react';
import { isAfter } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, Trash2, Calendar as CalendarIcon, User, Pencil,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

const UPCOMING_SLOTS_PER_PAGE = 10;

const STATUS_COLORS = {
  available: {
    bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: '#312e81',
    solid: '#6366f1',
    label: 'Available',
  },
  booked: {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '#065f46',
    solid: '#10b981',
    label: 'Booked',
  },
  blocked: {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '#92400e',
    solid: '#f59e0b',
    label: 'Blocked',
  },
};

const UpcomingCard = ({
  events = [],
  stats = { availableSlots: 0, bookedSlots: 0 },
  onEventClick,
  onDeleteClick,
}) => {
  const { formatDate, formatTimeRange } = useFormattedDateTime();
  const [availablePage, setAvailablePage] = useState(1);
  const [bookedPage, setBookedPage] = useState(1);

  // Derive upcoming events
  const upcomingEvents = events
    .filter((e) => isAfter(new Date(e.start), new Date()))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  const availableUpcomingEvents = upcomingEvents.filter((e) => e.status === 'available');
  const bookedUpcomingEvents = upcomingEvents.filter((e) => e.status === 'booked');

  const availableTotalPages = Math.max(1, Math.ceil(availableUpcomingEvents.length / UPCOMING_SLOTS_PER_PAGE));
  const bookedTotalPages = Math.max(1, Math.ceil(bookedUpcomingEvents.length / UPCOMING_SLOTS_PER_PAGE));

  const availablePageItems = availableUpcomingEvents.slice(
    (availablePage - 1) * UPCOMING_SLOTS_PER_PAGE,
    availablePage * UPCOMING_SLOTS_PER_PAGE
  );
  const bookedPageItems = bookedUpcomingEvents.slice(
    (bookedPage - 1) * UPCOMING_SLOTS_PER_PAGE,
    bookedPage * UPCOMING_SLOTS_PER_PAGE
  );


  
  const totalUpcomingHours = upcomingEvents.reduce(
    (sum, e) => sum + (e.durationHours || 0), 0
  );

  return (
    <Card className="shadow-lg border-t-4 border-indigo-500 h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 bg-slate-50/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> Upcoming Slots
        </CardTitle>
        

        {/* INTEGRATED AVAILABILITY OVERVIEW */}
        <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-200">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Available</p>
            <p className="text-lg font-bold text-indigo-600">{stats.availableSlots}</p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Booked</p>
            <p className="text-lg font-bold text-emerald-600">{stats.bookedSlots}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Hrs</p>
             <p className="text-lg font-bold text-amber-600">
              {totalUpcomingHours}h
            </p> 
          </div>
        </div> 
      </CardHeader>

      <CardContent className="flex-grow flex flex-col overflow-hidden p-2 max-h-[60vh]">
        <Tabs defaultValue="available" className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b bg-slate-50 p-0">
            <TabsTrigger
              value="available"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-white"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-semibold">Available</span>
                <Badge className="text-xs" variant="outline">{availableUpcomingEvents.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="booked"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Booked</span>
                <Badge className="text-xs" variant="outline">{bookedUpcomingEvents.length}</Badge>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Available Slots Tab */}
          <TabsContent value="available" className="flex-grow overflow-hidden p-3">
            <div className="flex-grow overflow-y-auto pr-1 space-y-2 custom-scrollbar h-full">
              {availableUpcomingEvents.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                  <CalendarIcon className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs text-muted-foreground font-medium">No available slots</p>
                </div>
              ) : (
                availablePageItems.map((event, index) => {
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group relative flex flex-col p-2.5 rounded-xl border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all cursor-pointer"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{formatDate(event.start)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimeRange(event.start, event.end)}
                      </div>

                      {event.description && (
                        <p className="text-[10px] text-slate-600 mt-1 truncate">{event.description}</p>
                      )}

                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-indigo-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-indigo-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          onClick={(e) => onDeleteClick(event, e)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
              {availableUpcomingEvents.length > (UPCOMING_SLOTS_PER_PAGE - 1) && (
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="text-[11px] text-muted-foreground">
                    Page {availablePage} of {availableTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={availablePage === 1}
                      onClick={() => setAvailablePage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={availablePage === availableTotalPages}
                      onClick={() => setAvailablePage((p) => Math.min(availableTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Booked Slots Tab */}
          <TabsContent value="booked" className="flex-grow overflow-hidden p-3">
            <div className="flex-grow overflow-y-auto pr-1 space-y-2 custom-scrollbar h-full">
              {bookedUpcomingEvents.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                  <CalendarIcon className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs text-muted-foreground font-medium">No booked slots</p>
                </div>
              ) : (
                bookedPageItems.map((event, index) => {
                  const colors = STATUS_COLORS[event.status];
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex flex-col p-2.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{formatDate(event.start)}</span>
                        <Badge className="text-[9px] h-4 px-1 capitalize" style={{ backgroundColor: colors.solid }}>
                          Booked
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimeRange(event.start, event.end)}
                      </div>

                      {event.candidateName && (
                        <div className="mt-1.5 flex items-center gap-1 bg-emerald-100 p-1.5 rounded border border-emerald-200">
                          <User className="w-3 h-3 text-emerald-700" />
                          <p className="text-[10px] font-semibold text-emerald-700 truncate">{event.candidateName}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              {bookedUpcomingEvents.length > (UPCOMING_SLOTS_PER_PAGE-1) && (
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="text-[11px] text-muted-foreground">
                    Page {bookedPage} of {bookedTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={bookedPage === 1}
                      onClick={() => setBookedPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={bookedPage === bookedTotalPages}
                      onClick={() => setBookedPage((p) => Math.min(bookedTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UpcomingCard;
