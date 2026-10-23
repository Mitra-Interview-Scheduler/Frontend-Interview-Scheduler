import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPage from '@/components/StatusPage';
import { useAuth } from '@/context/AuthContext';
import { useHomePath } from '@/hooks/useHomePath';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const homePath = useHomePath();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <StatusPage
      code="404"
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      fullScreen
      actions={(
        <>
          <Button asChild size="lg" className="gap-2">
            <Link to={homePath}>
              <Home className="h-4 w-4" />
              {user ? 'Go to dashboard' : 'Go to login'}
            </Link>
          </Button>
          {window.history.length > 1 && (
            <Button variant="outline" size="lg" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          )}
        </>
      )}
    />
  );
};

export default NotFound;
