import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { googleCalendarAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleGoogleCalendarOAuthResult } from '@/lib/googleCalendarRedirect';
import {
  getDefaultDashboardPath,
  getNormalizedRoles,
  hasInterviewerRole,
} from '@/lib/roleHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';

const ConnectGoogleCalendarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const userRoles = useMemo(() => getNormalizedRoles(user), [user]);
  const requiresCalendar = hasInterviewerRole(userRoles);
  const returnPath = location.state?.from?.pathname || getDefaultDashboardPath(userRoles);

  useEffect(() => {
    if (!requiresCalendar) {
      navigate(getDefaultDashboardPath(userRoles), { replace: true });
      return;
    }

    const handled = handleGoogleCalendarOAuthResult({
      navigate,
      toast,
      dashboardPath: returnPath,
    });
    if (handled) {
      setLoading(false);
      return;
    }

    const verifyStatus = async () => {
      try {
        const status = await googleCalendarAPI.getStatus();
        if (status.connected) {
          navigate(returnPath, { replace: true });
          return;
        }
      } catch (error) {
        console.error('Failed to check Google Calendar status', error);
      } finally {
        setLoading(false);
      }
    };

    verifyStatus();
  }, [navigate, toast, requiresCalendar, returnPath, userRoles]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { authorizationUrl } = await googleCalendarAPI.connect(returnPath);
      window.location.href = authorizationUrl;
    } catch (error) {
      toast({
        title: 'Unable to start Google Calendar connection',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  if (!requiresCalendar) {
    return <Navigate to={getDefaultDashboardPath(userRoles)} replace />;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Connect Google Calendar</CardTitle>
            <CardDescription>
              Your account includes the Interviewer role, so Google Calendar access is required
              before using Mitra. This syncs your availability slots and interview bookings with
              Google Meet links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? 'Redirecting to Google...' : 'Connect Google Calendar'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </Layout>
  );
};

export default ConnectGoogleCalendarPage;
