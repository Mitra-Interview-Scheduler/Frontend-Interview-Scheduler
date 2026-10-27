import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Clock, User, MapPin, CheckCircle, Play, 
  BarChart3, TrendingUp, Award, Target, Star, FileText,
  Video, MessageSquare, ThumbsUp, ThumbsDown, Timer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const RequestsPage = () => {
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Mock data for ongoing interviews
  const ongoingInterviews = [
    {
      id: 1,
      candidateName: 'Michael Chen',
      position: 'Senior Software Engineer - Java',
      scheduledBy: 'Sarah Johnson (HR)',
      date: 'Today',
      time: '2:00 PM - 3:30 PM',
      status: 'in-progress',
      technologies: ['Java', 'Spring Boot', 'Microservices'],
      location: 'Virtual - Teams',
      coInterviewer: 'John Doe',
      round: 'Technical Round 2',
      startedAt: '2:00 PM',
      duration: '45 mins elapsed',
    },
    {
      id: 2,
      candidateName: 'Emily Rodriguez',
      position: 'Tech Lead - React',
      scheduledBy: 'David Lee (HR)',
      date: 'Today',
      time: '4:00 PM - 5:30 PM',
      status: 'scheduled',
      technologies: ['React', 'TypeScript', 'Node.js'],
      location: 'Virtual - Zoom',
      coInterviewer: null,
      round: 'Technical Round 1',
      startedAt: null,
      duration: 'Starts in 2 hours',
    },
    {
      id: 3,
      candidateName: 'James Wilson',
      position: 'Backend Developer',
      scheduledBy: 'Sarah Johnson (HR)',
      date: 'Tomorrow',
      time: '10:00 AM - 11:00 AM',
      status: 'scheduled',
      technologies: ['Python', 'Django', 'PostgreSQL'],
      location: 'Virtual - Teams',
      coInterviewer: 'Alice Smith',
      round: 'Technical Round 1',
      startedAt: null,
      duration: 'Tomorrow',
    },
  ];

  // Mock data for completed interviews with detailed feedback
  const completedInterviews = [
    {
      id: 101,
      candidateName: 'Alice Johnson',
      position: 'Software Engineer',
      date: 'March 14, 2024',
      time: '4:00 PM - 5:30 PM',
      technologies: ['JavaScript', 'React', 'CSS'],
      location: 'Virtual - Teams',
      coInterviewer: 'Sarah Smith',
      round: 'Technical Round 2',
      duration: '1h 25m',
      outcome: 'recommended',
      overallRating: 4.5,
      feedback: {
        technicalSkills: 4,
        communication: 5,
        problemSolving: 4,
        cultureFit: 5,
      },
      notes: 'Strong candidate with excellent communication skills. Good problem-solving approach.',
      hiringStatus: 'Offer Extended',
    },
    {
      id: 102,
      candidateName: 'Robert Brown',
      position: 'DevOps Engineer',
      date: 'March 12, 2024',
      time: '11:00 AM - 12:30 PM',
      technologies: ['AWS', 'Docker', 'Kubernetes'],
      location: 'Virtual - Zoom',
      coInterviewer: null,
      round: 'Technical Round 1',
      duration: '1h 15m',
      outcome: 'not-recommended',
      overallRating: 2.5,
      feedback: {
        technicalSkills: 2,
        communication: 3,
        problemSolving: 2,
        cultureFit: 3,
      },
      notes: 'Lacks depth in container orchestration. Needs more hands-on experience.',
      hiringStatus: 'Rejected',
    },
    {
      id: 103,
      candidateName: 'Sarah Williams',
      position: 'Full Stack Developer',
      date: 'March 10, 2024',
      time: '2:00 PM - 3:30 PM',
      technologies: ['Node.js', 'React', 'MongoDB'],
      location: 'Virtual - Teams',
      coInterviewer: 'Mike Johnson',
      round: 'Final Round',
      duration: '1h 30m',
      outcome: 'recommended',
      overallRating: 4.8,
      feedback: {
        technicalSkills: 5,
        communication: 5,
        problemSolving: 4,
        cultureFit: 5,
      },
      notes: 'Exceptional candidate. Strong system design skills and great team player.',
      hiringStatus: 'Joined',
    },
    {
      id: 104,
      candidateName: 'David Martinez',
      position: 'Senior Java Developer',
      date: 'March 8, 2024',
      time: '10:00 AM - 11:30 AM',
      technologies: ['Java', 'Spring', 'Hibernate'],
      location: 'In-Person',
      coInterviewer: 'Emma Davis',
      round: 'Technical Round 1',
      duration: '1h 20m',
      outcome: 'hold',
      overallRating: 3.5,
      feedback: {
        technicalSkills: 4,
        communication: 3,
        problemSolving: 3,
        cultureFit: 4,
      },
      notes: 'Good technical skills but needs to improve communication. Consider for another role.',
      hiringStatus: 'On Hold',
    },
  ];

  // Analytics data
  const stats = {
    totalConducted: 45,
    thisMonth: 12,
    avgDuration: '1h 15m',
    recommendationRate: 67,
    avgRating: 3.8,
    upcomingCount: 3,
  };

  const monthlyTrend = [
    { month: 'Jan', count: 8 },
    { month: 'Feb', count: 12 },
    { month: 'Mar', count: 15 },
  ];

  const outcomeDistribution = {
    recommended: 30,
    notRecommended: 10,
    onHold: 5,
  };

  const StatCard = ({ icon: Icon, title, value, subtext, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  const getStatusBadge = (status) => {
    const styles = {
      'in-progress': 'bg-primary text-primary-foreground animate-pulse',
      'scheduled': 'bg-secondary text-secondary-foreground',
      'completed': 'bg-success-light text-success',
    };
    return styles[status] || styles.scheduled;
  };

  const getOutcomeBadge = (outcome) => {
    const styles = {
      'recommended': 'bg-success-light text-success',
      'not-recommended': 'bg-destructive text-destructive-foreground',
      'hold': 'bg-warning-light text-warning',
    };
    return styles[outcome] || '';
  };

  const getHiringStatusBadge = (status) => {
    const styles = {
      'Offer Extended': 'bg-primary/10 text-primary',
      'Joined': 'bg-success-light text-success',
      'Rejected': 'bg-destructive/10 text-destructive',
      'On Hold': 'bg-warning-light text-warning',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const RatingStars = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'text-warning fill-warning' : 'text-muted-foreground'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );

  const InterviewDetailsDialog = ({ interview }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>{interview.candidateName}</span>
          <Badge className={getOutcomeBadge(interview.outcome)}>
            {interview.outcome === 'recommended' ? 'Recommended' : 
             interview.outcome === 'not-recommended' ? 'Not Recommended' : 'On Hold'}
          </Badge>
        </DialogTitle>
        <DialogDescription>{interview.position} • {interview.round}</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 mt-4">
        {/* Interview Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{interview.date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{interview.time}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer className="w-4 h-4" />
            <span>Duration: {interview.duration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{interview.location}</span>
          </div>
        </div>

        {/* Overall Rating */}
        <div className="p-4 bg-accent rounded-lg">
          <h4 className="font-medium mb-2">Overall Rating</h4>
          <RatingStars rating={interview.overallRating} />
        </div>

        {/* Detailed Feedback */}
        <div>
          <h4 className="font-medium mb-3">Evaluation Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(interview.feedback).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-medium">{value}/5</span>
                </div>
                <Progress value={value * 20} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Technologies */}
        <div>
          <h4 className="font-medium mb-2">Technologies Assessed</h4>
          <div className="flex flex-wrap gap-2">
            {interview.technologies.map((tech) => (
              <Badge key={tech} variant="outline">{tech}</Badge>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h4 className="font-medium mb-2">Interview Notes</h4>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            {interview.notes}
          </p>
        </div>

        {/* Hiring Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <span className="font-medium">Current Hiring Status</span>
          <Badge className={getHiringStatusBadge(interview.hiringStatus)}>
            {interview.hiringStatus}
          </Badge>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Interviews</h1>
          <p className="text-muted-foreground">
            Track your ongoing and completed interviews with detailed analytics
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={BarChart3}
            title="Total Conducted"
            value={stats.totalConducted}
            subtext={`${stats.thisMonth} this month`}
            color="bg-primary"
          />
          <StatCard
            icon={Clock}
            title="Avg. Duration"
            value={stats.avgDuration}
            subtext="Per interview"
            color="bg-secondary"
          />
          <StatCard
            icon={TrendingUp}
            title="Recommendation Rate"
            value={`${stats.recommendationRate}%`}
            subtext="Candidates recommended"
            color="bg-success"
          />
          <StatCard
            icon={Calendar}
            title="Upcoming"
            value={stats.upcomingCount}
            subtext="Scheduled interviews"
            color="bg-warning"
          />
        </div>

        <Tabs defaultValue="ongoing" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ongoing" className="gap-2">
              <Play className="w-4 h-4" />
              Ongoing
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Ongoing Interviews Tab */}
          <TabsContent value="ongoing" className="space-y-4">
            {ongoingInterviews.length === 0 ? (
              <Card className="shadow-elegant">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No ongoing or scheduled interviews</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ongoingInterviews.map((interview, index) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="shadow-elegant hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-foreground">
                                {interview.candidateName}
                              </h3>
                              <Badge className={getStatusBadge(interview.status)}>
                                {interview.status === 'in-progress' ? '● Live' : 'Scheduled'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{interview.position}</p>
                            <p className="text-sm font-medium text-primary">{interview.round}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{interview.date}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{interview.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>{interview.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Timer className="w-4 h-4" />
                                <span>{interview.duration}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {interview.technologies.map((tech) => (
                                <Badge key={tech} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                            </div>

                            {interview.coInterviewer && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>Co-interviewer: {interview.coInterviewer}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {interview.status === 'in-progress' && (
                              <Button size="sm" className="gap-2">
                                <Video className="w-4 h-4" />
                                Join
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="gap-2">
                              <FileText className="w-4 h-4" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Interviews Tab */}
          <TabsContent value="completed" className="space-y-4">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Completed Interviews</CardTitle>
                <CardDescription>
                  View feedback and outcomes for your past interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedInterviews.map((interview) => (
                      <TableRow key={interview.id}>
                        <TableCell className="font-medium">
                          {interview.candidateName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {interview.position}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {interview.date}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-warning fill-warning" />
                            <span>{interview.overallRating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getOutcomeBadge(interview.outcome)}>
                            {interview.outcome === 'recommended' ? (
                              <><ThumbsUp className="w-3 h-3 mr-1" /> Yes</>
                            ) : interview.outcome === 'not-recommended' ? (
                              <><ThumbsDown className="w-3 h-3 mr-1" /> No</>
                            ) : (
                              'Hold'
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getHiringStatusBadge(interview.hiringStatus)}>
                            {interview.hiringStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
                            </DialogTrigger>
                            <InterviewDetailsDialog interview={interview} />
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Overview */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average Rating Given</span>
                      <RatingStars rating={stats.avgRating} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Recommendation Rate</span>
                      <div className="flex items-center gap-2">
                        <Progress value={stats.recommendationRate} className="w-24 h-2" />
                        <span className="text-sm font-medium">{stats.recommendationRate}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Interviews This Month</span>
                      <span className="text-lg font-bold text-primary">{stats.thisMonth}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Outcome Distribution */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Outcome Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-success" />
                        <span className="text-sm">Recommended</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(outcomeDistribution.recommended / stats.totalConducted) * 100} className="w-24 h-2" />
                        <span className="text-sm font-medium w-8">{outcomeDistribution.recommended}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive" />
                        <span className="text-sm">Not Recommended</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(outcomeDistribution.notRecommended / stats.totalConducted) * 100} className="w-24 h-2" />
                        <span className="text-sm font-medium w-8">{outcomeDistribution.notRecommended}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-warning" />
                        <span className="text-sm">On Hold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(outcomeDistribution.onHold / stats.totalConducted) * 100} className="w-24 h-2" />
                        <span className="text-sm font-medium w-8">{outcomeDistribution.onHold}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Monthly Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-around h-40 gap-4">
                    {monthlyTrend.map((item) => (
                      <div key={item.month} className="flex flex-col items-center gap-2">
                        <motion.div
                          className="bg-primary rounded-t-lg w-12"
                          initial={{ height: 0 }}
                          animate={{ height: `${(item.count / 20) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                        <span className="text-xs text-muted-foreground">{item.month}</span>
                        <span className="text-sm font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-success-light rounded-lg">
                      <p className="text-sm font-medium text-success">Top Strength</p>
                      <p className="text-lg font-bold mt-1">Problem Solving Assessments</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your candidates' problem-solving scores are 15% above average
                      </p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium text-primary">Most Interviewed Tech</p>
                      <p className="text-lg font-bold mt-1">React & TypeScript</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        12 interviews conducted with these technologies
                      </p>
                    </div>
                    <div className="p-4 bg-accent rounded-lg">
                      <p className="text-sm font-medium text-foreground">Avg. Feedback Time</p>
                      <p className="text-lg font-bold mt-1">2.5 hours</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        After interview completion
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default RequestsPage;
