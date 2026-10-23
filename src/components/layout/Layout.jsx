import { createContext, useContext, useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

const DEFAULT_OPTIONS = { hasPadding: true, className: undefined };

const LayoutOptionsContext = createContext(() => {});

/**
 * Lets a page rendered inside the persistent layout change the content wrapper
 * (padding / extra classes). Options reset to the defaults when the page unmounts.
 */
export const useLayoutOptions = ({ hasPadding = true, className } = {}) => {
  const setOptions = useContext(LayoutOptionsContext);

  useLayoutEffect(() => {
    setOptions({ hasPadding, className });
  }, [setOptions, hasPadding, className]);

  useLayoutEffect(() => () => setOptions(DEFAULT_OPTIONS), [setOptions]);
};

const isMobileViewport = () => {
  try {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  } catch (e) {
    return false;
  }
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileViewport());
  const [options, setOptions] = useState(DEFAULT_OPTIONS);

  const closeSidebarOnMobile = () => {
    // The layout persists across navigation, so only close the overlay sidebar on small screens
    if (isMobileViewport()) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebarOnMobile} />

      {/* Scroll lives on main (below the fixed navbar), not on the document —
          otherwise the scrollbar runs the full viewport height over the header. */}
      <main
        className={cn(
          'relative z-0 h-full overflow-x-hidden overflow-y-auto pt-16 transition-all duration-300',
          sidebarOpen ? 'pl-64' : 'pl-0',
          'bg-gradient-to-br from-slate-50 to-slate-100'
        )}
      >
        <div className={cn(options.hasPadding ? 'p-6' : 'p-0', options.className)}>
          <LayoutOptionsContext.Provider value={setOptions}>
            {children ?? <Outlet />}
          </LayoutOptionsContext.Provider>
        </div>
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node,
};

export default Layout;
