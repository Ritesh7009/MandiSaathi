import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Check, SpinnerGap, X } from '@phosphor-icons/react';
import { cn } from '../../utils/cn';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Motion Primitives TextEffect: Word-level blur & rise entrance.
 * Preserves actual spaces between words so Devanagari/Gurmukhi/Latin copy/paste & screen readers never merge tokens.
 */
export const TextEffect: React.FC<{
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
}> = ({ text, className = '', as = 'h1' }) => {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const Tag = as;

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className}>
      {words.map((word, idx) => (
        <React.Fragment key={`${idx}-${word}`}>
          <motion.span
            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.34,
              delay: Math.min(idx * 0.032, 0.32),
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
          {idx < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </Tag>
  );
};

/**
 * Motion Primitives SlidingNumber: Interpolates Indian tabular metrics smoothly.
 * Immediately syncs to `value` if not in view so off-fold stat tiles never stall at 0.
 */
export const SlidingNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}> = ({ value, prefix = '', suffix = '', duration = 380, className = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.05 });
  const reduce = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    if (reduce || !isInView) {
      setDisplayValue(value);
      return;
    }

    const startVal = prevRef.current;
    const endVal = value;
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    let rafId = 0;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = endVal;
    };
  }, [value, isInView, reduce, duration]);

  return (
    <span ref={ref} className={cn('inline-block font-mono tnum tracking-tight', className)}>
      {prefix}
      {displayValue.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

/**
 * Motion Primitives TransitionPanel: Cross-fade animated step/route container.
 */
export const TransitionPanel: React.FC<{
  activeKey: string;
  children: React.ReactNode;
  className?: string;
}> = ({ activeKey, children, className = '' }) => {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Motion Primitives BorderTrailCard: Subtle perimeter light trail for active voice recording studio.
 */
export const BorderTrailCard: React.FC<{
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ active = false, children, className = '' }) => {
  return (
    <div
      className={cn(
        'relative rounded-2xl p-[1px] transition-shadow duration-300',
        active ? 'shadow-emeraldGlow' : 'shadow-card',
        className
      )}
    >
      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <div className="absolute -inset-[100%] ms-border-trail bg-[conic-gradient(from_0deg,transparent_0deg,transparent_280deg,#10b981_325deg,#d97706_360deg)] opacity-75" />
        </div>
      )}
      <div
        className={cn(
          'relative rounded-[19px] bg-surface border border-line h-full w-full',
          active && 'border-transparent'
        )}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * GSAP Grid Stagger Reveal Wrapper (uses @gsap/react + ScrollTrigger + gsap.matchMedia).
 */
export const GsapStaggerGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  itemSelector?: string;
  depKey?: unknown;
}> = ({ children, className = '', itemSelector = '.gs-stagger-item', depKey }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray<HTMLElement>(itemSelector, containerRef.current);
        if (items.length === 0) return;

        gsap.fromTo(
          items,
          { opacity: 0.9, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            ease: 'power2.out',
            stagger: { each: 0.035, from: 'start' },
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 92%',
              once: true,
            },
          }
        );
      });
      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [depKey] }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

/**
 * Skiper UI-inspired top hairline scroll progress rail anchored inside sticky header.
 */
export const ScrollProgressRail: React.FC = () => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 260, damping: 32, restDelta: 0.001 });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="h-[2px] w-full bg-gradient-to-r from-canopy-bright via-canopy-bright to-saffron opacity-90"
    />
  );
};

/**
 * Watermelon UI-inspired state-morphing action button (`idle -> loading -> success`).
 */
export const MorphingActionButton: React.FC<{
  state: 'idle' | 'loading' | 'success';
  idleLabel: string;
  loadingLabel: string;
  successLabel: string;
  icon: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}> = ({
  state,
  idleLabel,
  loadingLabel,
  successLabel,
  icon,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}) => {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || state === 'loading'}
      layout={!reduce}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={cn(
        'min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-subtle active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        state === 'success'
          ? 'bg-emerald-700 text-white'
          : 'bg-canopy hover:brightness-110 text-white',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'loading' ? (
          <motion.span
            key="loading"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="inline-flex items-center gap-2"
          >
            <SpinnerGap weight="bold" className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingLabel}</span>
          </motion.span>
        ) : state === 'success' ? (
          <motion.span
            key="success"
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2"
          >
            <Check weight="bold" className="w-4 h-4 shrink-0" />
            <span>{successLabel}</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="inline-flex items-center gap-2"
          >
            {icon}
            <span>{idleLabel}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

/**
 * Motion Primitives MorphingDialog: Accessible modal sheet with Escape key, backdrop close & reduced-motion fallback.
 */
export const MorphingDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-surface border border-line shadow-dock p-5 sm:p-6 max-h-[85dvh] overflow-y-auto space-y-4"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-lg text-ink tracking-tight truncate">
                  {title}
                </h2>
                {subtitle && <p className="text-xs text-ink-muted mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-surface-subtle border border-line text-ink-muted hover:text-ink transition-colors cursor-pointer shrink-0"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
