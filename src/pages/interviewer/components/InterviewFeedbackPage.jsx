import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Mail, Briefcase, Award, TrendingUp, FileText, ArrowLeft, MapPin, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import { feedbackAPI } from '@/services/feedbackAPI';
import { candidateAPI } from '@/services/candidateAPI';
import { availabilityAPI } from '@/services/availabilityAPI';

function InterviewFeedbackPage() {
  const navigate = useNavigate();
  const { interviewScheduleId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Questions and form state
  const [questions, setQuestions] = useState([]);
  const [formResponses, setFormResponses] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Interview and candidate data
  const [interviewDetails, setInterviewDetails] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

// Initialize on mount
  useEffect(() => {
    if (!interviewScheduleId) return;
    loadFeedbackPage();
  }, [interviewScheduleId]);

  const loadFeedbackPage = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch questions
      const questionsData = await feedbackAPI.getFeedbackQuestions();
      setQuestions(questionsData.questions || []);

      // Initialize form responses from questions
      const initialResponses = {};
      (questionsData.questions || []).forEach((q) => {
        initialResponses[q.order] = '';
      });
      setFormResponses(initialResponses);

      // Fetch interview details (interviewScheduleId → interviewDetails with candidateId, etc.)
      const interviewData = await availabilityAPI.getInterviewDetails(interviewScheduleId);
      setInterviewDetails(interviewData);

      if (interviewData?.candidateId) {
        // Fetch candidate details
        const candidateData = await candidateAPI.getCandidateById(interviewData.candidateId);
        setCandidate(candidateData);

        // Fetch candidate documents
        await loadCandidateDocuments(interviewData.candidateId);
      }
    } catch (err) {
      console.error('Failed to load feedback page:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load feedback form');
    } finally {
      setLoading(false);
    }
  };

  const loadCandidateDocuments = async (candidateId) => {
    if (!candidateId) return;
    setDocumentsLoading(true);
    try {
      const data = await candidateAPI.getCandidateDocuments(candidateId);
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleFormChange = (questionOrder, value) => {
    setFormResponses((prev) => ({
      ...prev,
      [questionOrder]: value,
    }));
    // Clear validation error for this field if it exists
    if (validationErrors[questionOrder]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionOrder];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    questions.forEach((q) => {
      if (q.required && (!formResponses[q.order] || formResponses[q.order].toString().trim() === '')) {
        errors[q.order] = `${q.label} is required`;
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await feedbackAPI.submitFeedback(interviewScheduleId, formResponses);
      toast({
        title: 'Success',
        description: 'Feedback submitted successfully',
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDocument = async (document) => {
    if (!candidate?.id || !document?.id) return;
    try {
      const response = await candidateAPI.downloadCandidateDocument(candidate.id, document.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: document.contentType }));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download document');
    }
  };

  const getInitial = (name) => {
    if (!name || typeof name !== 'string') return 'C';
    return name.trim().charAt(0).toUpperCase() || 'C';
  };

  const renderFormField = (question) => {
    const value = formResponses[question.order] || '';
    const error = validationErrors[question.order];

    switch (question.type) {
      case 'text':
        return (
          <div key={question.order} className="space-y-2">
            <Label htmlFor={`q-${question.order}`}>
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.helpText && <p className="text-xs text-muted-foreground">{question.helpText}</p>}
            <Input
              id={`q-${question.order}`}
              type="text"
              placeholder={question.placeholder}
              value={value}
              onChange={(e) => handleFormChange(question.order, e.target.value)}
              disabled={submitting}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={question.order} className="space-y-2">
            <Label htmlFor={`q-${question.order}`}>
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.helpText && <p className="text-xs text-muted-foreground">{question.helpText}</p>}
            <Textarea
              id={`q-${question.order}`}
              placeholder={question.placeholder}
              value={value}
              onChange={(e) => handleFormChange(question.order, e.target.value)}
              disabled={submitting}
              rows={4}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={question.order} className="space-y-2">
            <Label htmlFor={`q-${question.order}`}>
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.helpText && <p className="text-xs text-muted-foreground">{question.helpText}</p>}
            <Select value={value} onValueChange={(v) => handleFormChange(question.order, v)} disabled={submitting}>
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={question.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case 'rating':
        return (
          <div key={question.order} className="space-y-3">
            <Label>
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.helpText && <p className="text-xs text-muted-foreground">{question.helpText}</p>}
            <div className="flex gap-2">
              {question.options?.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={value === opt.value.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFormChange(question.order, opt.value.toString())}
                  disabled={submitting}
                  className={error ? 'border-red-500' : ''}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
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
            <h1 className="text-4xl font-bold text-foreground mb-1 tracking-tight">Interview Feedback</h1>
            <p className="text-muted-foreground">Complete the feedback form for the candidate's interview performance</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Loading feedback form...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Candidate Info + Documents */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 space-y-4">
              {/* Candidate Card */}
              {candidate && (
                <Card className="border-t-4 border-t-primary shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
                          {getInitial(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg truncate">{candidate.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-t pt-4 space-y-3">
                      {candidate.email && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Email</p>
                            <p className="text-sm break-all">{candidate.email}</p>
                          </div>
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Phone</p>
                            <p className="text-sm">{candidate.phone}</p>
                          </div>
                        </div>
                      )}
                      {candidate.departmentName && (
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Department</p>
                            <p className="text-sm font-medium">{candidate.departmentName}</p>
                          </div>
                        </div>
                      )}
                      {candidate.tierName && (
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Tier</p>
                            <p className="text-sm font-medium">{candidate.tierName}</p>
                          </div>
                        </div>
                      )}
                      {candidate.targetDesignationName && (
                        <div className="flex items-start gap-2">
                          <Award className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Target Designation</p>
                            <p className="text-sm font-medium">{candidate.targetDesignationName}</p>
                          </div>
                        </div>
                      )}
                      {candidate.location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Location</p>
                            <p className="text-sm">{candidate.location}</p>
                          </div>
                        </div>
                      )}
                      {candidate.yearsOfExperience && (
                        <div className="flex items-start gap-2">
                          <Hash className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-semibold">Experience</p>
                            <p className="text-sm">{candidate.yearsOfExperience} years</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      <FileText className="w-5 h-5" /> Documents
                    </Label>
                    {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 italic">
                      {documentsLoading ? 'Loading documents...' : 'No documents available'}
                    </p>
                  ) : (
                    documents.map((document) => (
                      <motion.div
                        key={document.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{document.fileName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {document.documentType}
                            </Badge>
                            <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 shrink-0"
                          onClick={() => handleDownloadDocument(document)}
                          disabled={submitting}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Panel: Feedback Form */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
                <div className="space-y-4">
                  {questions.map((question) => (
                    <motion.div
                      key={question.order}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: question.order * 0.05 }}
                    >
                      {renderFormField(question)}
                    </motion.div>
                  ))}
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                  <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="flex-1 min-h-[44px]">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      'Submit Feedback'
                    )}
                  </Button>
                </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default InterviewFeedbackPage;
