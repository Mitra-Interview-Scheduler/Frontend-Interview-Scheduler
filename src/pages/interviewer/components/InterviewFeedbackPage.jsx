import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Mail, Briefcase, Award, TrendingUp, FileText, ArrowLeft, MapPin, Hash, Phone, Eye, Network, Layers3, Hourglass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import { feedbackAPI } from '@/services/feedbackAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { candidateAPI } from '@/services/candidateAPI';
import { availabilityAPI } from '@/services/availabilityAPI';
import InterviewDocumentPreviewDialog from './InterviewDocumentPreviewDialog';
import { createDocumentObjectUrl, downloadBlobResponse, revokeObjectUrl } from '@/lib/documentUtils';
import { getInitial } from '@/lib/personUtils';

function InterviewFeedbackPage() {
  const navigate = useNavigate();
  const { interviewScheduleId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState(null);
  
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

  // Derive the selected form from the backend-filtered list
  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) || forms[0] || null,
    [forms, selectedFormId]
  );

  const completedCount = useMemo(
    () => Object.values(formResponses).filter((value) => value && value.toString().trim() !== '').length,
    [formResponses]
  );

  // Initialize on mount
  useEffect(() => {
    if (!interviewScheduleId) return;
    loadFeedbackPage();
  }, [interviewScheduleId]);

  // Set default selected form when forms load
  useEffect(() => {
    if (!forms.length) {
      setSelectedFormId(null);
      return;
    }

    if (!selectedFormId || !forms.some((form) => form.id === selectedFormId)) {
      setSelectedFormId(forms[0].id);
    }
  }, [forms, selectedFormId]);

  // Load questions when form changes
  useEffect(() => {
    if (!selectedForm) {
      setQuestions([]);
      setFormResponses({});
      setValidationErrors({});
      return;
    }

    const selectedQuestions = selectedForm.questions || [];
    setQuestions(selectedQuestions);

    const initialResponses = {};
    selectedQuestions.forEach((question) => {
      initialResponses[question.order] = '';
      if (question.commentsEnabled) {
        initialResponses[`${question.order}_comment`] = '';
      }
    });

    setFormResponses(initialResponses);
    setValidationErrors({});
  }, [selectedForm]);

  const loadFeedbackPage = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch Interview Details
      const interviewData = await availabilityAPI.getInterviewDetails(interviewScheduleId);
      const interview = Array.isArray(interviewData) ? interviewData[0] : interviewData;
      setInterviewDetails(interview);

      // 2. Fetch Candidate Details
      let currentCandidate = null;
      if (interview?.candidateId) {
        currentCandidate = await candidateAPI.getCandidateById(interview.candidateId);
        setCandidate(currentCandidate);
        
        // Kick off document loading in the background
        loadCandidateDocuments(interview.candidateId);
      }

      // 3. Extract Department and Role IDs (Prioritize candidate data)
      const deptId = currentCandidate?.departmentId ?? interview?.departmentId ?? null;
      // Handle potential naming variations depending on your candidate object shape
      const roleId = currentCandidate?.targetDesignationId ?? interview?.targetDesignationId ?? null; 

      // 4. Fetch Forms using the extracted IDs
      const formsData = await feedbackQuestionsAPI.getByDepartmentAndRole(deptId, roleId);
      console.log ('Fetched feedback forms:', formsData);
      const formList = Array.isArray(formsData) ? formsData : formsData?.forms || [];
      
      setForms(formList);

    } catch (err) {
      console.error('Failed to load feedback page:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load feedback data');
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
    if (!selectedForm) {
      toast({
        title: 'No feedback form selected',
        description: 'Choose a feedback form before submitting the interview assessment.',
        variant: 'destructive',
      });
      return;
    }

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
      await feedbackAPI.submitFeedback(interviewScheduleId, formResponses, selectedForm.id);
      toast({
        title: 'Success',
        description: 'Feedback submitted successfully',
      });
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
      downloadBlobResponse(response, document);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download document');
    }
  };

  const handlePreviewDocument = async (document) => {
    if (!candidate?.id || !document?.id) return;
    setSelectedDocument(document);
    setPreviewLoading(true);
    try {
      const response = await candidateAPI.downloadCandidateDocument(candidate.id, document.id);
      const url = createDocumentObjectUrl(response, document);
      setPreviewUrl(url);
    } catch (err) {
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
    revokeObjectUrl(previewUrl);
    setSelectedDocument(null);
    setPreviewUrl(null);
  };

  const renderFormField = (question) => {
    const value = formResponses[question.order] || '';
    const commentValue = formResponses[`${question.order}_comment`] || '';
    const error = validationErrors[question.order];

    const mainField = (() => {
    switch (question.type) {
      case 'text':
        return (
          <div key={question.order} className="space-y-2 mt-4 px-4 ">
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
          <div key={question.order} className="space-y-2 mt-4 px-4 ">
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

      case 'dropdown':
      case 'select':
        return (
          <div key={question.order} className="space-y-2 mt-4 px-4 ">
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
          <div key={question.order} className="space-y-3 mt-4 px-4 ">
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
      <div className="space-y-4 ">
        {mainField}
        {question.commentsEnabled && (
          <div className=" mt-4 px-4  ">
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
    <Layout hasPadding={false}>
      <div className="max-h-[90vh] flex flex-col ">
        
        {/* Fixed Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className=" px-6 pb-2 pt-6 shadow-sm flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Interview Feedback</h1>
                <p className="text-muted-foreground text-sm mt-1">Evaluate candidate's interview performance</p>
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
          <div className="flex-1 flex overflow-hidden gap-4 rounded-lg p-1 border  border-gray-200 ">
            
            {/* Left Sidebar - Fixed */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="w-80 bg-white border-r rounded-lg px-1 border border-gray-200 flex-shrink-0 shadow-sm flex flex-col max-h-[80vh] overflow-hidden"
            >
                <div className="flex-1 space-y-2 overflow-y-auto p-2  custom-scrollbar scrollbar-none">
                  {/* Candidate Card */}
                {candidate && (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4  border border-blue-200">
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
                        {candidate.departmentName && (
                          <div className="flex items-start gap-2">
                            <Network className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-600">Department</p>
                              <p className="text-sm text-gray-900">{candidate.departmentName}</p>
                            </div>
                          </div>
                        )}
                        {candidate.targetDesignationName && (
                          <div className="flex items-start gap-2">
                            <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-600">Target Designation</p>
                              <p className="text-sm text-gray-900">{candidate.targetDesignationName}</p>
                            </div>
                          </div>
                        )}
                        {candidate.tierName && (
                          <div className="flex items-start gap-2">
                            <Layers3 className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-600">Tier</p>
                              <p className="text-sm text-gray-900">{candidate.tierName}</p>
                            </div>
                          </div>
                        )}
                        {candidate.yearsOfExperience !== null && candidate.yearsOfExperience !== undefined && (
                          <div className="flex items-start gap-2">
                            <Hourglass className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-600">Experience</p>
                              <p className="text-sm text-gray-900">{candidate.yearsOfExperience} years</p>
                            </div>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-600">Location</p>
                              <p className="text-sm text-gray-900">{candidate.location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                <div className="border-t pt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2  border border-blue-200">
                  <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2 ">
                    <FileText className="w-4 h-4" /> Documents
                  </h3>
                  {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
                  {!documentsLoading && documents.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4 italic">No documents</p>
                  )}
                  <div className="space-y-2 p-1">
                    {documents.map((document) => (
                      <motion.div
                        key={document.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors "
                      >
                        <button
                          type="button"
                          onClick={() => handlePreviewDocument(document)}
                          disabled={submitting}
                          className="min-w-0 flex-1 text-left hover:text-blue-600 transition-colors "
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
            <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              
              {/* Fixed Header with Progress */}
              <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Feedback Questions</h2>
                <p className="text-xs text-gray-600 mb-3">
                  {selectedForm
                    ? `You are filling out feedback form${candidate ? ` for ${candidate.name}` : ''}.`
                    : 'No feedback form matched this candidate yet.'}
                </p>
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-blue-600">
                      {completedCount} / {questions.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: questions.length > 0 
                          ? `${(completedCount / questions.length) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Questions Only */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex-1 overflow-y-auto"
              >
                <div className="p-4 space-y-4">
                  {forms.length > 0 && (
                    <div className="space-y-3">
                      {forms.length > 1 && (
                        <div className="space-y-2">
                          <Label htmlFor="feedback-form-select" className="text-xs text-gray-700">
                            Select feedback form
                          </Label>
                          <Select
                            value={selectedFormId?.toString() || ''}
                            onValueChange={(value) => setSelectedFormId(Number(value))}
                            disabled={submitting}
                          >
                            <SelectTrigger id="feedback-form-select" className="bg-white">
                              <SelectValue placeholder="Choose a feedback form" />
                            </SelectTrigger>
                            <SelectContent>
                              {forms.map((form) => (
                                <SelectItem key={form.id} value={form.id.toString()}>
                                  {form.name} {form.versionNumber ? `(v${form.versionNumber})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedForm?.description && (
                            <p className="text-xs text-gray-600">
                              {selectedForm.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {forms.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                      No feedback forms matched this candidate's department or role.
                    </div>
                  )}

                  {/* Questions */}
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <motion.div
                        key={question.order}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <Label className="text-sm font-bold text-gray-900">
                                {question.label}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                            </div>
                            {question.helpText && (
                              <p className="text-xs text-gray-600 mt-1 italic">{question.helpText}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3  bg-slate-100 border  rounded-lg py-3" >
                        {renderFormField(question)}
                        </div>
                        
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
                </div>
              </motion.div>

              {/* Fixed Footer - Action Buttons */}
              <div className=" bg-white px-8 py-2 flex gap-3 flex-shrink-0 shadow-lg">
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
                  disabled={submitting || !selectedForm || questions.length === 0}
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

      <InterviewDocumentPreviewDialog
        open={!!selectedDocument}
        document={selectedDocument}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        onClose={closePreview}
        onDownload={handleDownloadDocument}
      />
    </Layout>
  );
}

export default InterviewFeedbackPage;