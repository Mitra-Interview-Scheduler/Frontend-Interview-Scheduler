import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase, Award, TrendingUp, MapPin, Hash, Calendar, Clock, Mail, Phone, User } from 'lucide-react';
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
      console.log('Full interview data response:', interviewData);
      console.log('Interview data type:', typeof interviewData);
      console.log('Is array?', Array.isArray(interviewData));

      // Handle array response (if backend returns array)
      const interview = Array.isArray(interviewData) ? interviewData[0] : interviewData;
      console.log('Extracted interview object:', interview);
      console.log('Candidate ID field:', interview?.candidateId);
      console.log('Has startDateTime?', !!interview?.startDateTime);
      console.log('startDateTime value:', interview?.startDateTime);
      console.log('Interview keys:', Object.keys(interview || {}));

      
      setInterviewDetails(interview);

      // Fetch candidate details
      if (interview?.candidateId) {
        const candidateData = await candidateAPI.getCandidateById(interview.candidateId);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Interview Session</DialogTitle>
          <DialogDescription>
            Review candidate information before starting the interview
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold text-base mb-1">Failed to Load Interview Details</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      
            {/* Candidate Profile Section */}
            {candidate && (
              <div className="space-y-4 p-4 ">
                {/* Candidate Header */}
                <div className="flex items-start gap-4 pb-4 border-b">
                  <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-lg font-bold">
                      {getInitial(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900">{candidate.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{candidate.email}</p>
                    {candidate.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                 {/* Schedule Section - Top Priority */}
            {interviewDetails && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Interview Schedule</h3>
                <div className="grid grid-cols-2 gap-4">
                  {interviewDetails.preferredStartDateTime && (
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Date</p>
                        <p className="font-semibold text-sm">{format(new Date(interviewDetails.preferredStartDateTime), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  )}
                  {interviewDetails.preferredStartDateTime && (
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Time</p>
                        <p className="font-semibold text-sm">
                          {format(new Date(interviewDetails.preferredStartDateTime), 'HH:mm')} – {format(new Date(interviewDetails.preferredEndDateTime), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

                {/* Professional Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {candidate.targetDesignationName && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <Award className="w-4 h-4  text-blue-600 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-600">Target Position</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{candidate.targetDesignationName}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {candidate.departmentName && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <Briefcase className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-600">Department</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{candidate.departmentName}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {candidate.tierName && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-600">Experience Level</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{candidate.tierName}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {candidate.yearsOfExperience && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <Hash className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-600">Experience</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{candidate.yearsOfExperience} years</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {candidate.location && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-600">Location</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{candidate.location}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        <DialogFooter className="flex gap-3 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleStartInterview} disabled={loading || !candidate} className="gap-2">
            <User className="w-4 h-4" />
            Start Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InterviewStartDialog;
