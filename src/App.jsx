import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { TimeFormatProvider } from "@/context/TimeFormatContext";
import { TimeZoneProvider } from "@/context/TimeZoneContext";
import { PrivateRoute } from "@/components/PrivateRoute";

import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import DesignationsPage from "./pages/admin/DesignationsPage";
import TechnologiesPage from "./pages/admin/TechnologiesPage";
import RulesPage from "./pages/admin/RulesPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import FeedbackQuestionsPage from "./pages/admin/FeedbackQuestionsPage";
import FeedbackFormsPage from "./pages/admin/FeedbackFormsPage";
import HRDashboard from "./pages/hr/HRDashboard";
import CandidatesPage from "./pages/hr/CandidatesPage";
import CandidateDetailsPage from "./pages/hr/CandidateDetailsPage";
import SchedulePage from "./pages/hr/SchedulePage";
import AvailabilityViewPage from "./pages/hr/AvailabilityViewPage";
import UrgentRequestsPage from "./pages/hr/UrgentRequestsPage";
import InterviewerDashboard from "./pages/interviewer/InterviewerDashboard";
import AvailabilityPage from "./pages/interviewer/AvailabilityPage";
import InterviewFeedbackPage from "./pages/interviewer/components/InterviewFeedbackPage";
import RequestsPage from "./pages/interviewer/RequestsPage";
import PreferencesPage from "./pages/interviewer/PreferencesPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TimeZoneProvider>
        <TimeFormatProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <UsersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/designations"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <DesignationsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/technologies"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <TechnologiesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={<Navigate to="/admin/technologies?tab=categories" replace />}
            />
            <Route
              path="/admin/rules"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <RulesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <AnalyticsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/feedback-questions"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <FeedbackQuestionsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/feedback-forms"
              element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <FeedbackFormsPage />
                </PrivateRoute>
              }
            />
            
            {/* HR Routes */}
            <Route
              path="/hr/dashboard"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <HRDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/hr/candidates"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <CandidatesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/hr/candidates/:candidateId/details"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <CandidateDetailsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/hr/schedule"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <SchedulePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/hr/availability"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <AvailabilityViewPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/hr/urgent"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <UrgentRequestsPage />
                </PrivateRoute>
              }
            />
            {/* <Route
              path="/hr/designations"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <DesignationsPage />
                </PrivateRoute>
              }
            /> */}
            {/* <Route
              path="/hr/technologies"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <TechnologiesPage />
                </PrivateRoute>
              }
            /> */}
            <Route
              path="/hr/rules"
              element={
                <PrivateRoute allowedRoles={['HR']}>
                  <RulesPage />
                </PrivateRoute>
              }
            />
            
            {/* Interviewer Routes */}
            <Route
              path="/interviewer/dashboard"
              element={
                <PrivateRoute allowedRoles={['INTERVIEWER']}>
                  <InterviewerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/interviewer/availability"
              element={
                <PrivateRoute allowedRoles={['INTERVIEWER']}>
                  <AvailabilityPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/interviewer/feedback/:interviewScheduleId"
              element={
                <PrivateRoute allowedRoles={['INTERVIEWER']}>
                  <InterviewFeedbackPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/interviewer/requests"
              element={
                <PrivateRoute allowedRoles={['INTERVIEWER']}>
                  <RequestsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/interviewer/preferences"
              element={
                <PrivateRoute allowedRoles={['INTERVIEWER']}>
                  <PreferencesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/interviewer/profile"
              element={<Navigate to="/profile" replace />}
            />

            <Route
              path="/profile"
              element={
                <PrivateRoute allowedRoles={['ADMIN', 'HR', 'INTERVIEWER']}>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            
            {/* Settings Route - Available to all authenticated users */}
            <Route
              path="/settings"
              element={
                <PrivateRoute allowedRoles={['ADMIN', 'HR', 'INTERVIEWER']}>
                  <SettingsPage />
                </PrivateRoute>
              }
            />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TimeFormatProvider>
      </TimeZoneProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
