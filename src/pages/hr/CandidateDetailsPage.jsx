import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Briefcase, Network, Layers3, Hourglass, FileText, Eye, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import StepProgressIndicator from '@/components/StepProgressIndicator';
import CandidateDetailsTabs from './components/CandidateDetailsTabs';
import InterviewDocumentPreviewDialog from '../interviewer/components/InterviewDocumentPreviewDialog';
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

const getInitial = (name) => {
  if (!name || typeof name !== 'string') return 'C';
  return name.trim().charAt(0).toUpperCase() || 'C';
};

function CandidateDetailsPage() {
  const navigate = useNavigate();
  const { candidateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
      await loadCandidateDocuments(candidateId);
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

  const loadCandidateDocuments = async (id) => {
    if (!id) return;
    setDocumentsLoading(true);
    try {
      const data = await candidateAPI.getCandidateDocuments(id);
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
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
      const response = await candidateAPI.downloadCandidateDocument(candidate.id, document.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: document.contentType }));
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
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setSelectedDocument(null);
    setPreviewUrl(null);
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
    <Layout hasPadding={false}>
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
        <div className="flex-1 min-h-0 flex overflow-hidden gap-6 px-4 py-2">
          {/* Left Sidebar - Candidate Basic Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-80 bg-white rounded-lg border border-gray-200 flex-shrink-0 shadow-sm flex flex-col min-h-0 max-h-[70vh] overflow-hidden"
          >
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-2 custom-scrollbar scrollbar-none">
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

                  {candidate.yearsOfExperience && (
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

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2 border border-blue-200">
                <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Documents
                </h3>

                {documentsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
                {!documentsLoading && documents.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4 italic">No documents</p>
                )}

                <div className="space-y-2 p-1">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handlePreviewDocument(document)}
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
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Tabs Scrollable */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden py-4 pr-4 max-h-[65vh]"
          >
            <CandidateDetailsTabs candidate={candidate} readOnly={true} />
          </motion.div>
        </div>

        <InterviewDocumentPreviewDialog
          open={!!selectedDocument}
          document={selectedDocument}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          onClose={closePreview}
          onDownload={handleDownloadDocument}
        />
      </div>
    </Layout>
  );
}

export default CandidateDetailsPage;
