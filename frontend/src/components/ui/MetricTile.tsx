import React from 'react';
import { cn } from '../../utils/cn';
import { SlidingNumber } from './MotionPrimitives';

interface MetricTileProps {
  label: string;
  value: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  unit?: string;
  subtext?: string;
  badge?: string;
  variant?: 'emerald' | 'saffron' | 'default';
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Editorial Agrarian Metric Block.
 * Supports animated SlidingNumber when numericValue is supplied, with clean token contrast across light/dark modes.
 */
export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  numericValue,
  prefix = '',
  suffix = '',
  unit,
  subtext,
  badge,
  variant = 'default',
  icon,
  className = '',
}) => {
  const containerTheme =
    variant === 'emerald'
      ? 'bg-canopy-soft border-canopy/20'
      : variant === 'saffron'
      ? 'bg-saffron-soft border-saffron/25'
      : 'bg-surface border-line';

  const valueColor =
    variant === 'emerald'
      ? 'text-canopy dark:text-canopy-bright'
      : variant === 'saffron'
      ? 'text-saffron-ink dark:text-saffron'
      : 'text-ink';

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:border-line-strong shadow-subtle',
        containerTheme,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider truncate">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface border border-line text-ink-muted font-mono shrink-0">
            {badge}
          </span>
        )}
        {icon && !badge && <div className="text-canopy dark:text-canopy-bright shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline flex-wrap gap-x-1.5">
        {numericValue !== undefined ? (
          <SlidingNumber
            value={numericValue}
            prefix={prefix}
            suffix={suffix}
            className={`text-2xl sm:text-[26px] font-bold ${valueColor}`}
          />
        ) : (
          <span className={`text-2xl sm:text-[26px] font-bold tracking-tight tnum font-mono ${valueColor}`}>
            {value}
          </span>
        )}
        {unit && <span className="text-xs font-medium text-ink-muted">{unit}</span>}
      </div>

      {subtext && <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">{subtext}</p>}
    </div>
  );
};
