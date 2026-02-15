import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock, CheckCircle, AlertCircle, Plus, TrendingUp, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { toast } from '@/hooks/use-toast';
import { candidateAPI } from '@/services/candidateAPI';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { format } from 'date-fns';

const StatCard = ({ icon: Icon, title, value, description, color, trend, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="shadow-elegant overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 ${color}/5 rounded-full -mr-16 -mt-16`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {loading ? (
          <div className="h-12 flex items-center">
            <div className="animate-pulse bg-muted rounded w-24 h-8"></div>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground">{value}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {trend && (
                <span className={`flex items-center ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
                  <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(trend)}%
                </span>
              )}
              {description}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const HRDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    scheduledToday: 0,
    pendingScheduling: 0,
    completedThisWeek: 0,
    availableSlots: 0
  });
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load candidates
      const candidates = await candidateAPI.getAllCandidates();
      
      // Load HR's interview requests
      const requests = await hrAvailabilityAPI.getHRRequests();
      
      // Calculate stats
      const appliedCandidates = candidates.filter(c => 
        c.status === 'APPLIED' || c.status === 'SCREENING'
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const scheduledToday = requests.filter(r => {
        const reqDate = new Date(r.preferredStartDateTime);
        return reqDate >= today && reqDate < tomorrow && 
               (r.status === 'PENDING' || r.status === 'ACCEPTED');
      });
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      
      const completedThisWeek = requests.filter(r => 
        r.status === 'ACCEPTED' && 
        new Date(r.createdAt) >= thisWeekStart
      );
      
      // Get upcoming interviews (next 5)
      const upcoming = requests
        .filter(r => 
          (r.status === 'PENDING' || r.status === 'ACCEPTED') &&
          new Date(r.preferredStartDateTime) >= new Date()
        )
        .sort((a, b) => 
          new Date(a.preferredStartDateTime) - new Date(b.preferredStartDateTime)
        )
        .slice(0, 5);
      
      setStats({
        totalCandidates: candidates.length,
        scheduledToday: scheduledToday.length,
        pendingScheduling: appliedCandidates.length,
        completedThisWeek: completedThisWeek.length,
        availableSlots: 0 // This could be fetched from availability API
      });
      
      setRecentCandidates(candidates.slice(0, 5));
      setUpcomingInterviews(upcoming);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-warning-light text-warning border-warning/20',
      ACCEPTED: 'bg-success-light text-success border-success/20',
      REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
      CANCELLED: 'bg-muted text-muted-foreground border-border',
    };
    return styles[status] || styles.PENDING;
  };

  const handleCancelInterview = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this interview? The slot will become available again.')) {
      return;
    }

    try {
      await hrAvailabilityAPI.cancelInterviewRequest(requestId);
      toast({
        title: "Success",
        description: "Interview cancelled successfully"
      });
      loadDashboardData(); // Reload data
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel interview",
        variant: "destructive"
      });
    }
  };

  const statCards = [
    {
      icon: Users,
      title: 'Active Candidates',
      value: stats.totalCandidates,
      description: `${stats.pendingScheduling} pending scheduling`,
      color: 'bg-primary',
      trend: 12
    },
    {
      icon: Calendar,
      title: 'Scheduled Today',
      value: stats.scheduledToday,
      description: 'Interviews today',
      color: 'bg-secondary',
    },
    {
      icon: Clock,
      title: 'Pending Scheduling',
      value: stats.pendingScheduling,
      description: 'Awaiting interview',
      color: 'bg-warning',
    },
    {
      icon: CheckCircle,
      title: 'Completed This Week',
      value: stats.completedThisWeek,
      description: 'Interviews scheduled',
      color: 'bg-success',
      trend: 8
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">HR Dashboard</h1>
            <p className="text-muted-foreground">
              Manage candidates and schedule interviews
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/hr/availability')}
              className="gap-2"
            >
              <Calendar className="w-4 h-4" />
              View Availability
            </Button>
            <Button 
              onClick={() => navigate('/hr/candidates')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Candidate
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCard {...stat} loading={loading} />
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Interviews */}
          <Card className="lg:col-span-2 shadow-elegant">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Interviews</CardTitle>
                  <CardDescription>Next scheduled interviews</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/hr/availability')}
                >
                  Schedule New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingInterviews.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No upcoming interviews</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate('/hr/schedule')}
                  >
                    Schedule Interview
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingInterviews.map((interview, index) => (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group flex items-start justify-between p-4 rounded-lg border hover:bg-accent transition-all hover:shadow-md"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">
                            {interview.candidateName}
                          </h4>
                          <Badge className={getStatusBadge(interview.status)}>
                            {interview.status}
                          </Badge>
                          {interview.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Interviewer: {interview.assignedInterviewerName || 'Not assigned'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {format(new Date(interview.preferredStartDateTime), 'MMM dd, yyyy')} at{' '}
                          {format(new Date(interview.preferredStartDateTime), 'h:mm a')}
                        </div>
                        {interview.requiredTechnologies && interview.requiredTechnologies.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {interview.requiredTechnologies.map((tech, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tech.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {interview.status === 'PENDING' || interview.status === 'ACCEPTED' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInterview(interview.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Recent Candidates */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {/* <Card className="shadow-elegant">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used functions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[
                   
                    { label: 'View Availability', icon: Clock, path: '/hr/availability', color: 'text-secondary' },
                    { label: 'Manage Candidates', icon: Users, path: '/hr/candidates', color: 'text-success' },
                  ].map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.div
                        key={action.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 hover:bg-accent"
                          onClick={() => navigate(action.path)}
                        >
                          <Icon className={`w-4 h-4 ${action.color}`} />
                          {action.label}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card> */}

            {/* Recent Candidates */}
            <Card className="shadow-elegant">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Candidates</CardTitle>
                    <CardDescription>Latest applications</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/hr/candidates')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : recentCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No candidates yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCandidates.map((candidate, index) => (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors border"
                        onClick={() => navigate('/hr/candidates')}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {candidate.targetDesignationName || 'No position'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 ml-2">
                            {candidate.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HRDashboard;