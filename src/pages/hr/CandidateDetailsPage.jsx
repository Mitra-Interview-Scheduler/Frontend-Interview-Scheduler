import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Briefcase, Award, Hash, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import StepProgressIndicator from '@/components/StepProgressIndicator';
import CandidateDetailsTabs from './components/CandidateDetailsTabs';
import { candidateAPI } from '@/services/candidateAPI';

const STATUS_COLORS = {
  APPLIED: 'bg-blue-100 text-blue-800',
  SCREENING: 'bg-yellow-100 text-yellow-800',
  SCHEDULED: 'bg-purple-100 text-purple-800',
  INTERVIEWED: 'bg-indigo-100 text-indigo-800',
  TECHNICAL_ROUND: 'bg-cyan-100 text-cyan-800',
  HR_ROUND: 'bg-pink-100 text-pink-800',
  SELECTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
};

const getInitials = (name) => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function CandidateDetailsPage() {
  const navigate = useNavigate();
  const { candidateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    if (!candidateId) return;
    loadCandidateDetails();
  }, [candidateId]);

  const loadCandidateDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await candidateAPI.getCandidateById(candidateId);
      console.log('Candidate details:', data);
      setCandidate(data);
    } catch (err) {
      console.error('Failed to load candidate details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load candidate details');
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to load candidate details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="h-screen flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Loading candidate details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !candidate) {
    return (
      <Layout>
        <div className="h-screen flex justify-center items-center">
          <div className="text-center">
            <p className="text-red-500 text-lg mb-4">{error || 'Candidate not found'}</p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout noPadding>
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className=" border-blue-200 px-4 py-3 shadow-sm flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-blue-900">Candidate Details</h1>
                <p className="text-blue-600 text-sm mt-1">View comprehensive candidate information</p>
              </div>
            </div>
           
          </div>
        </motion.div>

        {/* Step Progress Indicator */}
        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50  flex-shrink-0">
          <StepProgressIndicator currentStatus={candidate.status} />
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 flex overflow-hidden gap-6 px-4 py-2">
          {/* Left Sidebar - Candidate Basic Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-80 flex flex-col gap-1 flex-shrink-0"
          >
            {/* Candidate Card */}
            <Card className="border-0 shadow-md bg-white flex-shrink-0">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 border-4 border-blue-200 mb-4">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                      {getInitials(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{candidate.targetDesignationName || 'N/A'}</p>
                  {candidate.tierName && (
                    <Badge className="mt-2 bg-indigo-100 text-indigo-700 border border-indigo-300">
                      {candidate.tierName}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card className="border-0 shadow-md bg-white flex-shrink-0">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Contact Information</h3>
                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 font-medium">Email</p>
                      <p className="text-xs text-gray-900 break-all">{candidate.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  {candidate.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 font-medium">Phone</p>
                        <p className="text-xs text-gray-900">{candidate.phone}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {candidate.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 font-medium">Location</p>
                        <p className="text-xs text-gray-900">{candidate.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Additional Info Card */}
            <Card className="border-0 shadow-md bg-white flex-shrink-0">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Additional Info</h3>
                <div className="space-y-2">
                  {candidate.yearsOfExperience && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-gray-600">
                        <span className="font-medium">{candidate.yearsOfExperience}</span> years
                      </span>
                    </div>
                  )}
                  {candidate.departmentName && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-gray-600 font-medium">{candidate.departmentName}</span>
                    </div>
                  )}
                  {candidate.jobReferenceCode && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-gray-600 font-medium">{candidate.jobReferenceCode}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Content - Tabs Scrollable */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 flex flex-col overflow-y-auto py-4 pr-4"
          >
            <CandidateDetailsTabs candidate={candidate} readOnly={true} />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

export default CandidateDetailsPage;
