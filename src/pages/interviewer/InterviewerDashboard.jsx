// src/pages/interviewer/InterviewerDashboard.jsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, TrendingUp, Settings, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { toast } from '@/hooks/use-toast';
import { availabilityAPI } from '@/services/availabilityAPI';
import { interviewRequestAPI } from '@/services/interviewRequestAPI';
import { format } from 'date-fns';

const StatCard = ({ icon: Icon, title, value, description, color, loading }) => (
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
            <div className="animate-pulse bg-muted rounded w-20 h-8"></div>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    availableSlots: 0,
    bookedSlots: 0,
    upcomingInterviews: 0,
    completedThisMonth: 0,
  });
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        availabilityAPI.getAvailabilityStats(),
        interviewRequestAPI.getUpcomingInterviews(),
      ]);

      const [statsRes, upcomingRes] = results;

      const availabilityStats =
        statsRes.status === 'fulfilled' ? statsRes.value : { availableSlots: 0, bookedSlots: 0 };
      const upcomingData =
        upcomingRes.status === 'fulfilled' && Array.isArray(upcomingRes.value)
          ? upcomingRes.value
          : [];

      if (statsRes.status === 'rejected') {
        console.error('Failed to load availability stats:', statsRes.reason);
      }
      if (upcomingRes.status === 'rejected') {
        console.error('Failed to load upcoming interviews:', upcomingRes.reason);
        toast({
          title: 'Warning',
          description: 'Could not load upcoming interviews.',
          variant: 'destructive',
        });
      }

      setStats({
        availableSlots: availabilityStats.availableSlots ?? 0,
        bookedSlots: availabilityStats.bookedSlots ?? 0,
        upcomingInterviews: upcomingData.length,
        completedThisMonth: 0,
      });
      setUpcomingInterviews(upcomingData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: Calendar,
      title: 'Available Slots',
      value: stats.availableSlots,
      description: 'Open for scheduling',
      color: 'bg-primary',
    },
    {
      icon: Clock,
      title: 'Upcoming Interviews',
      value: stats.upcomingInterviews,
      description: 'Scheduled interviews',
      color: 'bg-warning',
    },
    {
      icon: CheckCircle,
      title: 'Booked Slots',
      value: stats.bookedSlots,
      description: 'Confirmed interviews',
      color: 'bg-success',
    },
    {
      icon: TrendingUp,
      title: 'This Month',
      value: stats.completedThisMonth,
      description: 'Interviews completed',
      color: 'bg-secondary',
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Interviewer Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your availability and interview schedule
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/interviewer/availability')}
              className="gap-2"
            >
              <Calendar className="w-4 h-4" />
              Manage Availability
            </Button>
            <Button
              onClick={() => navigate('/interviewer/profile')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Update Profile
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Interviews */}
          <Card className="shadow-elegant">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Upcoming Interviews</CardTitle>
                    <CardDescription>Your confirmed schedule</CardDescription>
                  </div>
                </div>
                {stats.upcomingInterviews > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {stats.upcomingInterviews}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingInterviews.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No upcoming interviews</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Interviews will appear here when HR schedules them
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingInterviews.map((interview, index) => (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-accent space-y-2 border hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            {interview.candidateName}
                            {interview.isUrgent && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {interview.candidateDesignationName || 'Position not specified'}
                          </p>
                        </div>
                        <Badge className="bg-success-light text-success border-success/20">
                          Scheduled
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {format(new Date(interview.preferredStartDateTime), 'MMM dd')} at{' '}
                        {format(new Date(interview.preferredStartDateTime), 'h:mm a')}
                      </div>
                      {interview.requiredTechnologies && interview.requiredTechnologies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {interview.requiredTechnologies.map((tech, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tech.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {interview.notes && (
                        <p className="text-xs text-muted-foreground italic border-l-2 pl-3 py-1">
                          {interview.notes}
                        </p>
                      )}
                    </motion.div>
                  ))}
                  {stats.upcomingInterviews > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => navigate('/interviewer/requests')}
                    >
                      View All ({stats.upcomingInterviews} total)
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-elegant">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate('/interviewer/availability')}
                  >
                    <Calendar className="w-4 h-4" />
                    Manage Availability
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate('/interviewer/requests')}
                  >
                    <Bell className="w-4 h-4" />
                    View All Interviews
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate('/interviewer/profile')}
                  >
                    <Settings className="w-4 h-4" />
                    Update Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="shadow-elegant border-primary/20">
              <CardHeader className="border-b bg-primary/5">
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: 'Set Your Availability',
                      desc: "Add time slots when you're available to interview",
                    },
                    {
                      step: 2,
                      title: 'Get Notified',
                      desc: 'HR will schedule interviews in your available slots',
                    },
                    {
                      step: 3,
                      title: 'Conduct Interviews',
                      desc: 'View your schedule and conduct scheduled interviews',
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold">{step}</span>
                      </div>
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InterviewerDashboard;