import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Calendar, Clock, Target, 
  CheckCircle, XCircle, AlertCircle, ArrowRight, Activity, Zap,
  UserCheck, FileText, Download
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  RadialBarChart, RadialBar
} from 'recharts';
import { motion } from 'framer-motion';

const interviewData = [
  { month: 'Jan', interviews: 45, scheduled: 50, completed: 42, cancelled: 3 },
  { month: 'Feb', interviews: 52, scheduled: 58, completed: 48, cancelled: 4 },
  { month: 'Mar', interviews: 48, scheduled: 53, completed: 45, cancelled: 3 },
  { month: 'Apr', interviews: 61, scheduled: 65, completed: 58, cancelled: 3 },
  { month: 'May', interviews: 55, scheduled: 60, completed: 52, cancelled: 3 },
  { month: 'Jun', interviews: 67, scheduled: 70, completed: 64, cancelled: 3 },
];

const departmentData = [
  { name: 'Engineering', value: 45, interviews: 156, hired: 23 },
  { name: 'QA', value: 25, interviews: 87, hired: 12 },
  { name: 'DevOps', value: 15, interviews: 52, hired: 8 },
  { name: 'Data Science', value: 15, interviews: 47, hired: 7 },
];

const interviewerStats = [
  { name: 'John Doe', conducted: 23, utilization: 85, rating: 4.8, pending: 3 },
  { name: 'Jane Smith', conducted: 19, utilization: 78, rating: 4.6, pending: 5 },
  { name: 'Mike Johnson', conducted: 17, utilization: 72, rating: 4.9, pending: 2 },
  { name: 'Sarah Wilson', conducted: 21, utilization: 82, rating: 4.7, pending: 4 },
  { name: 'David Brown', conducted: 15, utilization: 65, rating: 4.5, pending: 6 },
];

const weeklyFlow = [
  { day: 'Mon', requests: 12, scheduled: 10, completed: 8 },
  { day: 'Tue', requests: 15, scheduled: 14, completed: 12 },
  { day: 'Wed', requests: 18, scheduled: 16, completed: 14 },
  { day: 'Thu', requests: 14, scheduled: 12, completed: 11 },
  { day: 'Fri', requests: 10, scheduled: 9, completed: 8 },
];

const technologyDemand = [
  { tech: 'Java', demand: 35, available: 12 },
  { tech: 'React', demand: 28, available: 8 },
  { tech: 'Python', demand: 22, available: 6 },
  { tech: '.NET', demand: 15, available: 5 },
  { tech: 'AWS', demand: 18, available: 4 },
];

const funnelData = [
  { stage: 'Requests Received', count: 150, fill: '#3b82f6' },
  { stage: 'Scheduled', count: 120, fill: '#10b981' },
  { stage: 'Conducted', count: 98, fill: '#f59e0b' },
  { stage: 'Selected', count: 45, fill: '#8b5cf6' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const StatCard = ({ icon: Icon, title, value, change, changeType, subtitle, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold">{value}</h3>
            {change && (
              <p className={`text-sm flex items-center gap-1 ${changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {changeType === 'positive' ? <TrendingUp className="w-4 h-4" /> : changeType === 'negative' ? <TrendingDown className="w-4 h-4" /> : null}
                {change}
              </p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-7 h-7 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const FlowCard = ({ title, steps, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
  >
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step.color} mb-2`}>
                  <span className="text-lg font-bold text-white">{step.value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{step.label}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [department, setDepartment] = useState('all');

  const todayFlow = [
    { label: 'Requests', value: 12, color: 'bg-blue-500' },
    { label: 'Scheduled', value: 10, color: 'bg-green-500' },
    { label: 'In Progress', value: 4, color: 'bg-yellow-500' },
    { label: 'Completed', value: 6, color: 'bg-purple-500' },
  ];

  const weekFlow = [
    { label: 'Total Requests', value: 67, color: 'bg-blue-500' },
    { label: 'Scheduled', value: 58, color: 'bg-green-500' },
    { label: 'Completed', value: 52, color: 'bg-purple-500' },
    { label: 'Pending', value: 15, color: 'bg-orange-500' },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics & Insights</h1>
            <p className="text-muted-foreground">Complete overview of interview operations and performance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="eng">Engineering</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="devops">DevOps</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Quick Flow Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FlowCard title="Today's Interview Flow" steps={todayFlow} delay={0} />
          <FlowCard title="This Week's Summary" steps={weekFlow} delay={0.1} />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={Calendar} 
            title="Total Interviews" 
            value="342" 
            change="+12.5% vs last period"
            changeType="positive"
            subtitle="This period"
            delay={0.1} 
          />
          <StatCard 
            icon={Users} 
            title="Active Interviewers" 
            value="45" 
            change="+5 new this month"
            changeType="positive"
            subtitle="12 currently busy"
            delay={0.2} 
          />
          <StatCard 
            icon={CheckCircle} 
            title="Success Rate" 
            value="87%" 
            change="+3.2% improvement"
            changeType="positive"
            subtitle="Interviews leading to hire"
            delay={0.3} 
          />
          <StatCard 
            icon={Clock} 
            title="Avg. Scheduling Time" 
            value="2.4h" 
            change="-15min faster"
            changeType="positive"
            subtitle="From request to scheduled"
            delay={0.4} 
          />
        </div>

        {/* Alerts & Actions */}
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800 dark:text-orange-200">Action Required:</span>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-background">
                <XCircle className="w-3 h-3 mr-1 text-red-500" />
                5 Unassigned Requests
              </Badge>
              <Badge variant="outline" className="bg-white dark:bg-background">
                <Clock className="w-3 h-3 mr-1 text-yellow-500" />
                3 Pending Confirmations
              </Badge>
              <Badge variant="outline" className="bg-white dark:bg-background">
                <Zap className="w-3 h-3 mr-1 text-purple-500" />
                2 Urgent Interviews Today
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Different Views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interviewers">Interviewers</TabsTrigger>
            <TabsTrigger value="demand">Demand Analysis</TabsTrigger>
            <TabsTrigger value="funnel">Hiring Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Trends</CardTitle>
                  <CardDescription>Scheduled vs Completed vs Cancelled</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={interviewData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="scheduled" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="completed" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="cancelled" stackId="3" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                  <CardDescription>Interviews by department with hiring stats</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Interview Flow</CardTitle>
                <CardDescription>Daily breakdown of requests, scheduling, and completion</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="requests" fill="#3b82f6" name="Requests" />
                    <Bar dataKey="scheduled" fill="#10b981" name="Scheduled" />
                    <Bar dataKey="completed" fill="#8b5cf6" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interviewers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interviewer Performance</CardTitle>
                <CardDescription>Conducted interviews and utilization rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={interviewerStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="conducted" fill="#3b82f6" name="Conducted" />
                    <Bar dataKey="utilization" fill="#10b981" name="Utilization %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interviewerStats.slice(0, 3).map((interviewer, index) => (
                <Card key={interviewer.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{interviewer.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{interviewer.conducted} interviews</span>
                          <span>•</span>
                          <span>⭐ {interviewer.rating}</span>
                        </div>
                      </div>
                      <Badge variant={interviewer.pending > 3 ? "destructive" : "secondary"}>
                        {interviewer.pending} pending
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="demand" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Technology Demand vs Availability</CardTitle>
                <CardDescription>Interview requests by technology and available interviewers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={technologyDemand}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tech" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="demand" fill="#ef4444" name="Demand (Requests)" />
                    <Bar dataKey="available" fill="#10b981" name="Available Interviewers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                <CardHeader>
                  <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    High Demand Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Java Backend</span>
                      <Badge variant="destructive">23 pending</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>React Frontend</span>
                      <Badge variant="destructive">18 pending</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>AWS/Cloud</span>
                      <Badge variant="outline">12 pending</Badge>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Well Covered Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Python</span>
                      <Badge className="bg-green-600">Balanced</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>.NET</span>
                      <Badge className="bg-green-600">Balanced</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>QA Automation</span>
                      <Badge className="bg-green-600">Surplus</Badge>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Funnel</CardTitle>
                  <CardDescription>From request to hire conversion</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {funnelData.map((stage, index) => (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{stage.stage}</span>
                          <span className="font-semibold">{stage.count}</span>
                        </div>
                        <div className="h-8 rounded-md overflow-hidden bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(stage.count / funnelData[0].count) * 100}%` }}
                            transition={{ delay: index * 0.2, duration: 0.5 }}
                            className="h-full rounded-md"
                            style={{ backgroundColor: stage.fill }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Overall Conversion Rate</span>
                      <span className="text-2xl font-bold text-green-600">30%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department-wise Hiring</CardTitle>
                  <CardDescription>Interviews conducted vs hired</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departmentData.map((dept) => (
                      <div key={dept.name} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{dept.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {dept.hired}/{dept.interviews} hired
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(dept.hired / dept.interviews) * 100}%` }}
                            />
                          </div>
                        </div>
                        <Badge variant="outline">
                          {Math.round((dept.hired / dept.interviews) * 100)}%
                        </Badge>
                      </div>
                    ))}
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

export default AnalyticsPage;