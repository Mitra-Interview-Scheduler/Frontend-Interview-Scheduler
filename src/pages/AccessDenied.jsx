import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPage from '@/components/StatusPage';
import { useHomePath } from '@/hooks/useHomePath';

/** Shown inside the layout when a signed-in user opens a page their roles don't allow. */
const AccessDenied = () => {
  const navigate = useNavigate();
  const homePath = useHomePath();

  return (
    <StatusPage
      code="403"
      title="Access denied"
      message="You don't have permission to view this page. If you think you should, ask an administrator to update your roles."
      actions={(
        <>
          <Button asChild className="gap-2">
            <Link to={homePath}>
              <Home className="h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
          {window.history.length > 1 && (
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          )}
        </>
      )}
    />
  );
};

export default AccessDenied;
