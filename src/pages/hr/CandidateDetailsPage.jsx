import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Briefcase, Network, Layers3, Hourglass, FileText, Eye, Download, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import StepProgressIndicator from '@/components/StepProgressIndicator';
import CandidateDetailsTabs from './components/CandidateDetailsTabs';
import InterviewDocumentPreviewDialog from '../interviewer/components/InterviewDocumentPreviewDialog';
import { candidateAPI } from '@/services/candidateAPI';
import { createDocumentObjectUrl, downloadBlobResponse, revokeObjectUrl } from '@/lib/documentUtils';
import { getInitial } from '@/lib/personUtils';

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
      setPreviewUrl(createDocumentObjectUrl(response, document));
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

  if (loading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-4rem)] flex justify-center items-center">
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
        <div className="h-[calc(100vh-4rem)] flex justify-center items-center">
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
    <Layout hasPadding={false} className="overflow-hidden">
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-blue-200 px-4 py-3 shadow-sm flex-shrink-0"
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

        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <StepProgressIndicator currentStatus={candidate.status} />
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden gap-6 px-4 py-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full md:w-80 bg-white rounded-lg border border-gray-200 flex-shrink-0 shadow-sm flex flex-col min-h-0 max-h-[40vh] md:max-h-[70vh] overflow-hidden"
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
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-600">Email</p>
                      <p className="text-sm text-gray-900 break-all">{candidate.email || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Phone</p>
                      <p className="text-sm text-gray-900">{candidate.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Network className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Department</p>
                      <p className="text-sm text-gray-900">{candidate.departmentName || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Target Designation</p>
                      <p className="text-sm text-gray-900">{candidate.targetDesignationName || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Layers3 className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Tier</p>
                      <p className="text-sm text-gray-900">{candidate.tierName || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Hourglass className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Experience</p>
                      <p className="text-sm text-gray-900">
                        {candidate.yearsOfExperience !== null && candidate.yearsOfExperience !== undefined
                          ? `${candidate.yearsOfExperience} years`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Location</p>
                      <p className="text-sm text-gray-900">{candidate.location || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-600">Resource Request Number</p>
                      <p className="text-sm text-gray-900">{candidate.resourceRequestNumber || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 flex flex-col overflow-auto py-4 pr-0 md:pr-4 md:pl-4 md:max-h-[70vh]"
          >
            <CandidateDetailsTabs
              candidate={candidate}
              readOnly={true}
              documents={documents}
              documentsLoading={documentsLoading}
              onPreviewDocument={handlePreviewDocument}
              onDownloadDocument={handleDownloadDocument}
            />
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
