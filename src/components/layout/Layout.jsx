import { useState } from 'react';
import PropTypes from 'prop-types';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

const Layout = ({ children ,hasPadding = true, className }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    } catch (e) {
      return true;
    }
  });

  const closeSidebarOnMobile = () => {
    // Always close sidebar when navigation occurs to ensure single-click behavior
    setSidebarOpen(false);
  };

    return (
      <div className="h-screen bg-background relative overflow-hidden"> {/* full height and prevent page scroll */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebarOnMobile} />
      
      <main 
        className={cn(
          "pt-16 transition-all duration-300 relative z-0 h-full overflow-hidden",
          sidebarOpen ? "pl-64" : "pl-0",
          "bg-gradient-to-br from-slate-50 to-slate-100"
        )}
      >
        <div className={cn(hasPadding ? "p-6 h-full overflow-hidden" : "p-0 h-full overflow-hidden", className)}>
          {children}
        </div>
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  hasPadding: PropTypes.bool,
};

export default Layout;