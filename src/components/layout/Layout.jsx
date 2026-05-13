import { useState } from 'react';
import PropTypes from 'prop-types';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

const Layout = ({ children, noPadding = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background relative"> {/* Add relative here */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />
      
      <main 
        className={cn(
          "pt-16 transition-all duration-300 relative z-0",
          sidebarOpen ? "pl-64" : "pl-0",
          !noPadding && "p-6"
        )}
      >
        {noPadding ? children : <div className="p-6">{children}</div>}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  noPadding: PropTypes.bool,
};

export default Layout;
