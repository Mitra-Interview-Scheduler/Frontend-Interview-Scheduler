import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { googleCalendarAPI } from '@/services/api';
import {
  getDefaultDashboardPath,
  getNormalizedRoles,
  hasInterviewerRole,
} from '@/lib/roleHelpers';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleBtnWidth, setGoogleBtnWidth] = useState(0);
  const googleBtnRef = useRef(null);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const el = googleBtnRef.current;
    if (!el) return;

    const updateWidth = () => {
      const width = Math.floor(el.getBoundingClientRect().width);
      if (width > 0) {
        // Google Identity Services caps button width at 400px.
        setGoogleBtnWidth(Math.min(400, Math.max(40, width)));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const navigateByRole = async (user) => {
    const roles = getNormalizedRoles(user);

    if (roles.length === 0) {
      setError('Your account has no assigned role. Contact an administrator.');
      return;
    }

    if (hasInterviewerRole(roles)) {
      try {
        const status = await googleCalendarAPI.getStatus();
        if (!status.connected) {
          navigate('/interviewer/connect-calendar', { replace: true });
          return;
        }
      } catch {
        navigate('/interviewer/connect-calendar', { replace: true });
        return;
      }
    }

    navigate(getDefaultDashboardPath(roles), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationErrors = { email: '', password: '' };
    if (!email.trim()) validationErrors.email = 'Email is required';
    if (!password.trim()) validationErrors.password = 'Password is required';

    if (validationErrors.email || validationErrors.password) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({ email: '', password: '' });
    setLoading(true);

    try {
      const user = await login(email, password);
      navigateByRole(user);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const user = await loginWithGoogle(credentialResponse);
      navigateByRole(user);
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            className="flex items-center justify-center mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Mitra Interview Scheduler
          </h1>
          <p className="text-muted-foreground">
            Streamline your technical interview scheduling
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@mitra.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    className={`pl-10 ${fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-invalid={!!fieldErrors.email}
                  />
                </div>
                {fieldErrors.email && <p className="text-destructive text-sm">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    className={`pl-10 ${fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-invalid={!!fieldErrors.password}
                  />
                </div>
                {fieldErrors.password && <p className="text-destructive text-sm">{fieldErrors.password}</p>}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="my-4 flex items-center">
              <div className="h-px flex-1 bg-border" />
              <span className="px-3 text-xs text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div ref={googleBtnRef} className="w-full">
              {googleBtnWidth > 0 && (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google login failed. Please try again.')}
                  width={googleBtnWidth}
                  size="large"
                  theme="outline"
                  text="signin_with"
                  shape="rectangular"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
