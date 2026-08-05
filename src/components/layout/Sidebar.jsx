import { Link, useLocation } from 'react-router-dom';
import { getNormalizedRoles } from '@/lib/roleHelpers';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  LayoutDashboard, Users, Calendar, Settings, 
  UserCheck, BarChart3, Clock, FileText, 
  Shield, Briefcase, Bell, ChevronDown, MessageSquare, Globe2, ListChecks, ClipboardList, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const adminLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: Shield, label: 'Designations', path: '/admin/designations' },
  { icon: Briefcase, label: 'Technologies', path: '/admin/technologies' },
  { icon: Globe2, label: 'Domains', path: '/admin/domains' },
  { icon: ListChecks, label: 'Interview Types', path: '/admin/interview-types' },
  { icon: FileText, label: 'Document & Resource Types', path: '/admin/catalog-types' },
  // { icon: FileText, label: 'Custom Rules', path: '/admin/rules' },
  // { icon: MessageSquare, label: 'Feedback Questions', path: '/admin/feedback-questions' },
  // { icon: MessageSquare, label: 'Feedback Forms', path: '/admin/feedback-forms' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Mail, label: 'Email Logs', path: '/admin/email-logs' },
];

const hrLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/hr/dashboard' },
  { icon: Users, label: 'Candidates', path: '/hr/candidates' },
  { icon: UserCheck, label: 'Interviewer Availability', path: '/hr/availability' },
  { icon: MessageSquare, label: 'Feedback Forms', path: '/admin/feedback-forms' },
];

const interviewerLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/interviewer/dashboard' },
  { icon: Calendar, label: 'My Availability', path: '/interviewer/availability' },
  { icon: ClipboardList, label: 'Assessments', path: '/interviewer/assessments' },
];

const Sidebar = ({ isOpen, onNavigate }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedRoles, setExpandedRoles] = useState({});

  // Get links grouped by role
  const getRoleGroupedLinks = () => {
    const userRoles = getNormalizedRoles(user);
    const roleLinks = [];

    const roleConfig = {
      ADMIN: adminLinks,
      HR: hrLinks,
      INTERVIEWER: interviewerLinks,
    };

    userRoles.forEach((role) => {
      if (roleConfig[role]) {
        roleLinks.push({
          role,
          links: roleConfig[role],
        });
      }
    });

    return roleLinks;
  };

  const toggleRole = (role) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const roleGroupedLinks = getRoleGroupedLinks();

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'text-primary';
      case 'HR':
        return 'text-secondary';
      case 'INTERVIEWER':
        return 'text-emerald-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-16 bottom-0 bg-sidebar text-sidebar-foreground transition-transform duration-300 z-30 overflow-y-auto",
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-0"
      )}
    >
      <nav className="p-4 space-y-2 flex flex-col h-full">
        <div className="space-y-2 flex-1 overflow-y-auto">
          {roleGroupedLinks.map((roleGroup) => {
            const isExpanded = expandedRoles[roleGroup.role] !== true; // Default to expanded

            return (
              <div key={roleGroup.role} className="space-y-1">
                {/* Role Header - Clickable */}
                <button
                  onClick={() => toggleRole(roleGroup.role)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-sidebar-accent/30 hover:scale-100"
                  )}
                >
                  <span className={cn("font-semibold text-xs uppercase tracking-wider", getRoleColor(roleGroup.role))}>
                    {roleGroup.role}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      getRoleColor(roleGroup.role),
                      isExpanded ? "rotate-180" : ""
                    )}
                  />
                </button>

                {/* Role Links - Animated */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {roleGroup.links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;

                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => { if (onNavigate && typeof onNavigate === 'function') onNavigate(); }}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ml-2 text-sm",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "hover:bg-sidebar-accent/50 text-sidebar-foreground  hover:scale-105"
                            )}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Separator and Settings - Stays at bottom */}
        <div className="pt-4 border-t border-sidebar-accent/30">
          <div className="space-y-1">
            <Link
              to="/settings"
              onClick={() => { try { if (onNavigate && typeof onNavigate === 'function') onNavigate(); } catch (e) {} }}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm",
                location.pathname === '/settings'
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Settings</span>
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onNavigate: PropTypes.func,
};

export default Sidebar;
