import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail } from 'lucide-react';
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
    <div className="min-h-screen grid lg:grid-cols-2 font-login-body">
      {/* Brand panel — shown on all sizes; stacked above form on small screens */}
      <motion.aside
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col justify-center overflow-hidden px-6 py-10 text-white sm:px-10 sm:py-12 lg:min-h-screen lg:justify-between lg:px-12 lg:py-14"
        style={{
          background:
            'linear-gradient(145deg, #0b2740 0%, #0f3d66 42%, #145a8a 78%, #1a6f8f 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 22%, rgba(241, 90, 36, 0.45), transparent 42%), radial-gradient(circle at 88% 78%, rgba(56, 189, 196, 0.35), transparent 45%), radial-gradient(circle at 70% 18%, rgba(255,255,255,0.08), transparent 30%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 85%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.img
            src="/mitra-wordmark.png"
            alt="Mitra"
            className="mb-5 h-11 w-auto object-contain drop-shadow-md sm:h-12 lg:mb-0 lg:h-14"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-lg space-y-3 text-center sm:space-y-4 lg:mx-0 lg:space-y-5 lg:text-left">
          <motion.h1
            className="font-login-display text-[1.75rem] font-semibold tracking-tight leading-tight sm:text-4xl lg:text-5xl lg:leading-[1.1]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
          >
            Mitra Interview Scheduler
          </motion.h1>
          <motion.p
            className="mx-auto max-w-md text-sm leading-relaxed text-white/75 sm:text-base lg:mx-0 lg:max-w-none lg:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
          >
            Streamlining candidate management, interviewer availability, and hiring workflows in one central platform.
          </motion.p>
        </div>

        <motion.p
          className="relative z-10 mt-6 text-center text-xs text-white/45 sm:text-sm lg:mt-0 lg:text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Mitra Interview Process Management System
        </motion.p>
      </motion.aside>

      {/* Sign-in panel */}
      <main className="relative flex items-start justify-center bg-[hsl(210,24%,97%)] px-4 py-8 sm:px-8 sm:py-10 lg:min-h-screen lg:items-center lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(15,61,102,0.35)] sm:p-9">
            <div className="mb-6 sm:mb-7">
              <h2 className="font-login-display text-2xl font-semibold tracking-tight text-foreground">
                Sign in
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Use your Mitra account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@mitrai.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    className={`h-11 pl-10 ${fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-invalid={!!fieldErrors.email}
                  />
                </div>
                {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
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
                    className={`h-11 pl-10 ${fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-invalid={!!fieldErrors.password}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}

              <Button type="submit" className="h-11 w-full text-base" loading={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="my-5 flex items-center">
              <div className="h-px flex-1 bg-border" />
              <span className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Or
              </span>
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
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Login;
