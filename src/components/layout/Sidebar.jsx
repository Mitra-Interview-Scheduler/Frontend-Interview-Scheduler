import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PropTypes from 'prop-types';
import { 
  LayoutDashboard, Users, Calendar, Settings, 
  UserCheck, BarChart3, Clock, FileText, 
  Shield, Briefcase, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: Shield, label: 'Designations', path: '/admin/designations' },
  { icon: Briefcase, label: 'Technologies', path: '/admin/technologies' },
  { icon: FileText, label: 'Custom Rules', path: '/admin/rules' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
];

const hrLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/hr/dashboard' },
  { icon: Users, label: 'Candidates', path: '/hr/candidates' },

  { icon: UserCheck, label: 'Interviewer Availability', path: '/hr/availability' },
  { icon: Bell, label: 'Urgent Requests', path: '/hr/urgent' },
  { icon: Shield, label: 'Designations', path: '/hr/designations' },
  { icon: Briefcase, label: 'Technologies', path: '/hr/technologies' },
  { icon: FileText, label: 'Custom Rules', path: '/hr/rules' },
];

const interviewerLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/interviewer/dashboard' },
  { icon: Calendar, label: 'My Availability', path: '/interviewer/availability' },
  { icon: Clock, label: 'Interview Requests', path: '/interviewer/requests' },
  { icon: Settings, label: 'Profile', path: '/interviewer/profile' },
];

const Sidebar = ({ isOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  const links = 
    user?.role === 'ADMIN' ? adminLinks :
    user?.role === 'HR' ? hrLinks :
    interviewerLinks;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-16 bottom-0 bg-sidebar text-sidebar-foreground transition-transform duration-300 z-30 overflow-y-auto",
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-0"
      )}
    >
      <nav className="p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          
          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default Sidebar;
