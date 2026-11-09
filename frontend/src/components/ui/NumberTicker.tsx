import React, { useEffect, useState, useRef } from 'react';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number; // ms
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * NumberTicker (Motion Primitives pattern)
 * Smoothly interpolates and ticks numerical values (modal rates, quantities, spreads).
 * Uses requestAnimationFrame with cubic-out deceleration and tabular figure styling.
 * Respects prefers-reduced-motion by rendering the target number instantly.
 */
export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  direction = 'up',
  delay = 0,
  duration = 800,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(() => {
    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return value;
    }
    return direction === 'down' ? value * 1.25 : 0;
  });

  const prevValueRef = useRef<number>(displayValue);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    let startTime: number | null = null;

    const timeoutId = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic: 1 - pow(1 - x, 3)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startVal + (endVal - startVal) * easeProgress);

        setDisplayValue(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          prevValueRef.current = endVal;
        }
      };

      animationRef.current = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, delay]);

  return (
    <span className={`inline-block font-mono tnum tabular-nums tracking-tight ${className}`}>
      {prefix}
      {displayValue.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};
