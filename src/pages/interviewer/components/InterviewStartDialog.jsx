import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Briefcase, Award, TrendingUp, MapPin, Hash, Calendar, Clock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { candidateAPI } from '@/services/candidateAPI';
import { availabilityAPI } from '@/services/availabilityAPI';

function InterviewStartDialog({ open, interviewScheduleId, onOpenChange }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !interviewScheduleId) return;
    loadInterviewData();
  }, [open, interviewScheduleId]);

  const loadInterviewData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch interview details
      const interviewData = await availabilityAPI.getInterviewDetails(interviewScheduleId);
      setInterviewDetails(interviewData);

      // Fetch candidate details
      if (interviewData?.candidateId) {
        const candidateData = await candidateAPI.getCandidateById(interviewData.candidateId);
        setCandidate(candidateData);
      }
    } catch (err) {
      console.error('Failed to load interview data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = () => {
    onOpenChange(false);
    navigate(`/interviewer/feedback/${interviewScheduleId}`);
  };

  const getInitial = (name) => {
    if (!name || typeof name !== 'string') return 'C';
    return name.trim().charAt(0).toUpperCase() || 'C';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start Interview</DialogTitle>
          <DialogDescription>
            Review candidate details before starting the interview
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Candidate Card */}
            {candidate && (
              <Card className="border-t-4 border-t-primary">
                <CardContent className="pt-6 space-y-4">
                  {/* Candidate Header */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {getInitial(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base truncate">{candidate.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                    </div>
                  </div>

                  {/* Interview Schedule Info */}
                  {interviewDetails && (
                    <div className="border-t pt-3 space-y-2">
                      {interviewDetails.startDateTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span>{format(new Date(interviewDetails.startDateTime), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {interviewDetails.startDateTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span>
                            {format(new Date(interviewDetails.startDateTime), 'HH:mm')} –{' '}
                            {format(new Date(interviewDetails.endDateTime), 'HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Candidate Details */}
                  <div className="border-t pt-3 space-y-2 text-sm">
                    {candidate.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.departmentName && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-medium">{candidate.departmentName}</span>
                      </div>
                    )}
                    {candidate.tierName && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-medium">{candidate.tierName}</span>
                      </div>
                    )}
                    {candidate.targetDesignationName && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-medium">{candidate.targetDesignationName}</span>
                      </div>
                    )}
                    {candidate.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{candidate.location}</span>
                      </div>
                    )}
                    {candidate.yearsOfExperience && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{candidate.yearsOfExperience} years experience</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleStartInterview} disabled={loading || !candidate} className="gap-2">
            Start Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InterviewStartDialog;
