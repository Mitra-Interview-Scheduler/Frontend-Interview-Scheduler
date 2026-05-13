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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Loader2, Mail, Briefcase, Award, TrendingUp, FileText, ArrowLeft, MapPin, Hash, Phone, Eye, X } from 'lucide-react';
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
  
  // Document preview state
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
        // Initialize comment field if enabled
        if (q.commentsEnabled) {
          initialResponses[`${q.order}_comment`] = '';
        }
      });
      setFormResponses(initialResponses);

      // Fetch interview details (interviewScheduleId → interviewDetails with candidateId, etc.)
      const interviewData = await availabilityAPI.getInterviewDetails(interviewScheduleId);
      
      // Handle array response (if backend returns array)
      const interview = Array.isArray(interviewData) ? interviewData[0] : interviewData;
      console.log('Interview details:', interview);
      setInterviewDetails(interview);

      if (interview?.candidateId) {
        // Fetch candidate details
        const candidateData = await candidateAPI.getCandidateById(interview.candidateId);
        setCandidate(candidateData);

        // Fetch candidate documents
        await loadCandidateDocuments(interview.candidateId);
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
      console.log('Loaded documents:', data);
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

  const handlePreviewDocument = async (document) => {
    if (!candidate?.id || !document?.id) return;
    setSelectedDocument(document);
    setPreviewLoading(true);
    try {
      console.log('Fetching preview for document:', document.fileName);
      const response = await candidateAPI.downloadCandidateDocument(candidate.id, document.id);
      console.log('Document response:', response, 'Content Type:', document.contentType);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: document.contentType }));
      console.log('Preview URL created:', url);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview error:', err);
      toast({
        title: 'Preview Error',
        description: err.message || 'Failed to load document preview',
        variant: 'destructive',
      });
      setSelectedDocument(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setSelectedDocument(null);
    setPreviewUrl(null);
  };

  const getInitial = (name) => {
    if (!name || typeof name !== 'string') return 'C';
    return name.trim().charAt(0).toUpperCase() || 'C';
  };

  const renderFormField = (question) => {
    const value = formResponses[question.order] || '';
    const commentValue = formResponses[`${question.order}_comment`] || '';
    const error = validationErrors[question.order];

    const mainField = (() => {
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
    })();

    return (
      <div className="space-y-4">
        {mainField}
        {question.commentsEnabled && (
          <div className="mt-4 pl-4 border-l-2 border-blue-200">
            <Label htmlFor={`q-${question.order}-comment`} className="text-sm text-gray-700">
              Comments
            </Label>
            <Textarea
              id={`q-${question.order}-comment`}
              placeholder="Add any additional comments about this response..."
              value={commentValue}
              onChange={(e) => handleFormChange(`${question.order}_comment`, e.target.value)}
              disabled={submitting}
              rows={3}
              className="mt-2 text-sm"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout noPadding>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        
        {/* Fixed Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-8 py-6 shadow-sm flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2 bg-blue-100 border-blue-300 text-blue-600 hover:bg-blue-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-blue-900">Interview Feedback</h1>
                <p className="text-blue-600 text-sm mt-1">Evaluate candidate's interview performance</p>
              </div>
            </div>
            {loading && <Loader2 className="w-6 h-6 animate-spin text-blue-600" />}
          </div>
        </motion.div>

        {/* Main Content Area */}
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Loading feedback form...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar - Fixed */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="w-80 bg-white border-r border-gray-200 flex-shrink-0 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Candidate Card */}
                {candidate && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-16 w-16 border-4 border-white shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold">
                            {getInitial(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{candidate.name}</h3>
                          <p className="text-xs text-gray-600 truncate">{candidate.email}</p>
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-blue-200 pt-4">
                        {candidate.email && (
                          <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-600">Email</p>
                              <p className="text-sm text-gray-900 break-all">{candidate.email}</p>
                            </div>
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-start gap-2">
                            <Phone className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-600">Phone</p>
                              <p className="text-sm text-gray-900">{candidate.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 gap-2">
                      {candidate.departmentName && (
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">Department</p>
                          <p className="text-sm font-semibold text-gray-900">{candidate.departmentName}</p>
                        </div>
                      )}
                      {candidate.targetDesignationName && (
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Position</p>
                          <p className="text-sm font-semibold text-gray-900">{candidate.targetDesignationName}</p>
                        </div>
                      )}
                      {candidate.tierName && (
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Level</p>
                          <p className="text-sm font-semibold text-gray-900">{candidate.tierName}</p>
                        </div>
                      )}
                      {candidate.yearsOfExperience && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Experience</p>
                          <p className="text-sm font-semibold text-gray-900">{candidate.yearsOfExperience} years</p>
                        </div>
                      )}
                      {candidate.location && (
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Location</p>
                          <p className="text-sm font-semibold text-gray-900">{candidate.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents
                  </h3>
                  {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
                  {!documentsLoading && documents.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4 italic">No documents</p>
                  )}
                  <div className="space-y-2">
                    {documents.map((document) => (
                      <motion.div
                        key={document.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handlePreviewDocument(document)}
                          disabled={submitting}
                          className="min-w-0 flex-1 text-left hover:text-blue-600 transition-colors"
                        >
                          <p className="text-xs font-medium text-gray-900 truncate">{document.fileName}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {document.documentType}
                          </Badge>
                        </button>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePreviewDocument(document)}
                            disabled={submitting}
                            title="Preview"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownloadDocument(document)}
                            disabled={submitting}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Content Area - Scrollable */}
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Scrollable Questions */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex-1 overflow-y-auto"
              >
                <div className="p-8 space-y-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Feedback Questions</h2>
                    <p className="text-sm text-gray-600">Please provide your assessment for each question</p>
                  </div>

                  {/* Questions */}
                  <div className="space-y-5">
                    {questions.map((question, index) => (
                      <motion.div
                        key={question.order}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <Label className="text-base font-bold text-gray-900">
                                {question.label}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                            </div>
                            {question.helpText && (
                              <p className="text-xs text-gray-600 mt-1 italic">{question.helpText}</p>
                            )}
                          </div>
                        </div>
                        {renderFormField(question)}
                      </motion.div>
                    ))}
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg"
                      >
                        <p className="font-semibold text-base mb-1">Error</p>
                        <p className="text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Spacing for footer */}
                  <div className="h-6" />
                </div>
              </motion.div>

              {/* Fixed Footer - Action Buttons */}
              <div className="border-t bg-white px-8 py-4 flex gap-3 flex-shrink-0 shadow-lg">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)} 
                  disabled={submitting}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 min-h-[44px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={closePreview}>
        <DialogContent className="max-w-full h-[90vh] flex flex-col p-0 bg-gradient-to-br from-slate-50 to-slate-100 border-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-blue-900 truncate">{selectedDocument?.fileName}</h2>
              <p className="text-blue-600 text-sm mt-1">{selectedDocument?.documentType} • Preview</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 shrink-0 ml-4 hover:bg-blue-100 text-blue-600"
              onClick={closePreview}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden gap-0">
            {/* Preview Area */}
            <div className="flex-1 flex items-center justify-center bg-white p-8 border-b border-gray-200">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  <p className="text-gray-600">Loading document preview...</p>
                </div>
              ) : previewUrl ? (
                (() => {
                  const docType = selectedDocument?.documentType?.toLowerCase() || '';
                  const fileName = selectedDocument?.fileName?.toLowerCase() || '';
                  const isPdf = docType.includes('pdf') || fileName.endsWith('.pdf');
                  
                  return isPdf ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0 rounded-lg"
                      title="Document Preview"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Document Preview"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                      onError={(e) => {
                        console.error('Image load error:', e);
                        e.target.style.display = 'none';
                      }}
                    />
                  );
                })()
              ) : (
                <div className="text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Unable to display preview</p>
                </div>
              )}
            </div>

            {/* Bottom Info Panel */}
            <div className="bg-slate-700 border-t border-slate-600 flex flex-col shrink-0 max-h-48">
              {/* Info Header */}
              {/* <div className="px-6 py-4 border-b border-slate-600">
                <h3 className="font-bold text-white text-base mb-0 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Document Info
                </h3>
              </div> */}

              {/* Info Content */}
                          <div className="flex-1 overflow-y-auto px-8 py-4">
                <div className="flex gap-8 flex-wrap items-center">
                  {/* File Name */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">File Name</p>
                    <p className="text-sm text-gray-900 font-medium">{selectedDocument?.fileName}</p>
                  </div>


                  {/* Document Type */}
                <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Type</p>
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                      {selectedDocument?.documentType}
                    </Badge>
                  </div>

                  {/* File Size */}
                  {selectedDocument?.fileSize && (
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Size</p>
                      <p className="text-sm text-gray-700 font-medium">
                        {(selectedDocument.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  {/* Upload Date */}
                  {selectedDocument?.createdAt && (
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Uploaded</p>
                      <p className="text-sm text-gray-700 font-medium">
                        {new Date(selectedDocument.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 ml-3 mr-3">
                    <Button
                      onClick={() => handleDownloadDocument(selectedDocument)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 text-sm h-9"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    {/* <Button
                      onClick={closePreview}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white gap-2 text-sm h-9"
                    >
                      <X className="w-4 h-4" />
                      Close
                    </Button> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default InterviewFeedbackPage;
