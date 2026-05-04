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
  // { icon: Shield, label: 'Designations', path: '/hr/designations' },
  // { icon: Briefcase, label: 'Technologies', path: '/hr/technologies' }
  
];

const interviewerLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/interviewer/dashboard' },
  { icon: Calendar, label: 'My Availability', path: '/interviewer/availability' },
  { icon: Settings, label: 'Profile', path: '/interviewer/profile' },
];

const Sidebar = ({ isOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Get links grouped by role
  const getRoleGroupedLinks = () => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
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
      <nav className="p-4 space-y-6 flex flex-col h-full">
        <div className="space-y-6">
          {roleGroupedLinks.map((roleGroup) => (
            <div key={roleGroup.role} className="space-y-2">
              {/* Role Header */}
              <div className={cn("px-4 py-2 font-semibold text-sm uppercase tracking-wider", getRoleColor(roleGroup.role))}>
                {roleGroup.role}
              </div>

              {/* Role Links */}
              <div className="space-y-1">
                {roleGroup.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ml-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Separator and Settings */}
        <div className="mt-auto pt-6 border-t border-sidebar-accent/30">
          <div className="space-y-1">
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ml-2",
                location.pathname === '/settings'
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default Sidebar;
