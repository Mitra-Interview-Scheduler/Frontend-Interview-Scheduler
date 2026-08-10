import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SPINNER_SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const STATE_HEIGHTS = {
  none: '',
  sm: 'min-h-[8rem]',
  md: 'min-h-[16rem]',
  lg: 'min-h-[60vh]',
  screen: 'min-h-screen',
};

const EASE_OUT = [0.22, 1, 0.36, 1];

const fadeUp = (reduceMotion) =>
  reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 10, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.99 },
      };

const fadeOnly = (reduceMotion) =>
  reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

/** Base spinner used everywhere. Prefer this over ad-hoc Loader2 / CSS rings. */
export function Spinner({ size = 'md', className }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className="inline-flex shrink-0"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <Loader2
        className={cn('animate-spin text-primary shrink-0', SPINNER_SIZES[size] || SPINNER_SIZES.md, className)}
        aria-hidden
      />
    </motion.span>
  );
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

/**
 * Content-area loading state. Use inside Layout / cards / dialogs —
 * do not replace the whole app chrome with a blank screen.
 */
export function LoadingState({
  label,
  size = 'md',
  minHeight = 'md',
  className,
  spinnerClassName,
}) {
  const reduceMotion = useReducedMotion();
  const motionProps = fadeUp(reduceMotion);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-foreground',
        STATE_HEIGHTS[minHeight] ?? STATE_HEIGHTS.md,
        className
      )}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <Spinner size={size} className={spinnerClassName} />
      {label ? (
        <motion.p
          className="text-sm font-medium text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06, ease: EASE_OUT }}
        >
          {label}
        </motion.p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </motion.div>
  );
}

LoadingState.propTypes = {
  label: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  minHeight: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'screen']),
  className: PropTypes.string,
  spinnerClassName: PropTypes.string,
};

/** Page content loading (keeps Navbar/Sidebar via Layout). */
export function PageLoading({ label = 'Loading…', className }) {
  return <LoadingState label={label} size="lg" minHeight="lg" className={className} />;
}

PageLoading.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
};

/**
 * Full-viewport loading for auth / route guards only —
 * before Layout is available.
 */
export function FullScreenLoading({ label, className }) {
  return (
    <LoadingState
      label={label}
      size="lg"
      minHeight="screen"
      className={cn('w-full bg-background', className)}
    />
  );
}

FullScreenLoading.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
};

/** Compact inline row (filters, lists, small panels). */
export function InlineLoading({ label, className, size = 'sm' }) {
  const reduceMotion = useReducedMotion();
  const motionProps = fadeOnly(reduceMotion);

  return (
    <motion.span
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      <Spinner size={size} className="text-muted-foreground" />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </motion.span>
  );
}

InlineLoading.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
};

/**
 * Absolute overlay for calendars / panels that should stay mounted
 * while data refreshes. Prefer `show` so exit fades play.
 */
export function LoadingOverlay({ show = true, label, className }) {
  const reduceMotion = useReducedMotion();
  const motionProps = fadeOnly(reduceMotion);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="loading-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
          className={cn(
            'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[1px]',
            className
          )}
          initial={motionProps.initial}
          animate={motionProps.animate}
          exit={motionProps.exit}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          <Spinner size="lg" />
          {label ? (
            <motion.p
              className="text-sm font-medium text-muted-foreground"
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.05, ease: EASE_OUT }}
            >
              {label}
            </motion.p>
          ) : (
            <span className="sr-only">Loading</span>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

LoadingOverlay.propTypes = {
  show: PropTypes.bool,
  label: PropTypes.string,
  className: PropTypes.string,
};

/**
 * Soft fade/rise when content appears after a load.
 * Wrap page or section content once data is ready.
 */
export function FadeIn({ children, className, delay = 0, y = 10 }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

FadeIn.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  delay: PropTypes.number,
  y: PropTypes.number,
};

/**
 * Crossfade between a loading state and ready content.
 * Use for lists/cards so the handoff is not abrupt.
 */
export function LoadingSwap({ loading, fallback, children, className, mode = 'wait' }) {
  const reduceMotion = useReducedMotion();
  const motionProps = fadeUp(reduceMotion);

  return (
    <div className={cn('relative min-h-0', className)}>
      <AnimatePresence mode={mode} initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            className="h-full min-h-0"
            initial={motionProps.initial}
            animate={motionProps.animate}
            exit={motionProps.exit}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            {fallback}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="flex h-full min-h-0 flex-col"
            initial={motionProps.initial}
            animate={motionProps.animate}
            exit={motionProps.exit}
            transition={{ duration: 0.32, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

LoadingSwap.propTypes = {
  loading: PropTypes.bool,
  fallback: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  mode: PropTypes.oneOf(['sync', 'wait', 'popLayout']),
};

/** Shared tab panel motion props (respects prefers-reduced-motion). */
export function useTabTransition() {
  const reduceMotion = useReducedMotion();
  return reduceMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.28, ease: EASE_OUT },
      };
}
