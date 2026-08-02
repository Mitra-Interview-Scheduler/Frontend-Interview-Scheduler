import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Shield, Clock, Loader2, RefreshCw } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { tierAPI } from '@/services/tierAPI';
import { usersAPI } from '@/services/api';
import { useNavigate } from 'react-router-dom';

import { sortRoles } from '@/lib/roleHelpers';

const StatCard = ({ icon: Icon, title, value, description, loading }) => (
  <Card className="shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="h-9 flex items-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Derived counts from real data
  const totalUsers = users.length;
  const admins = users.filter((u) => {
    const userRoles = u.roles || (u.role ? [u.role] : []);
    return userRoles.includes('ADMIN');
  }).length;
  const hrs = users.filter((u) => {
    const userRoles = u.roles || (u.role ? [u.role] : []);
    return userRoles.includes('HR');
  }).length;
  const interviewers = users.filter((u) => {
    const userRoles = u.roles || (u.role ? [u.role] : []);
    return userRoles.includes('INTERVIEWER');
  }).length;
  const activeUsers = users.filter((u) => u.active !== false).length;

  // Recent 5 users (most recently added, assuming sorted by id desc or just last 5)
  const recentUsers = [...users].reverse().slice(0, 5);

  const stats = [
    { icon: Users, title: 'Total Users', value: totalUsers, description: `${activeUsers} active` },
    { icon: Shield, title: 'Interviewers', value: interviewers, description: 'Interview panel members' },
    { icon: Calendar, title: 'HR Users', value: hrs, description: 'HR team members' },
    { icon: Clock, title: 'Admins', value: admins, description: 'System administrators' },
  ];

  const roleColor = (role) => {
    const map = { ADMIN: 'bg-purple-100 text-purple-700', HR: 'bg-blue-100 text-blue-700', INTERVIEWER: 'bg-green-100 text-green-700' };
    return map[role] ?? 'bg-muted text-muted-foreground';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <StatCard {...stat} loading={loading} />
            </motion.div>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Last added accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((user, i) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
                          {user.lastName?.[0]?.toUpperCase() ?? ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {sortRoles(user.roles || (user.role ? [user.role] : [])).map((role) => (
                          <Badge key={role} className={`text-xs shrink-0 ${roleColor(role)}`}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Manage Users', icon: Users, path: '/admin/users' },
                  { label: 'Technologies', icon: Shield, path: '/admin/technologies' },
                  { label: 'Domains', icon: Shield, path: '/admin/domains' },
                  { label: 'Designations', icon: Calendar, path: '/admin/designations' },
                  { label: 'Interview Types', icon: Calendar, path: '/admin/interview-types' },
                  { label: 'Departments', icon: Clock, path: '/admin/departments' },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => navigate(action.path)}
                    >
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role breakdown */}
        {!loading && users.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 flex-wrap">
                {[
                  { label: 'Admins', count: admins, total: totalUsers, color: 'bg-purple-500' },
                  { label: 'HR', count: hrs, total: totalUsers, color: 'bg-blue-500' },
                  { label: 'Interviewers', count: interviewers, total: totalUsers, color: 'bg-green-500' },
                ].map((item) => (
                  <div key={item.label} className="flex-1 min-w-[140px] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalUsers ? (item.count / totalUsers) * 100 : 0}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {totalUsers ? Math.round((item.count / totalUsers) * 100) : 0}% of total
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;