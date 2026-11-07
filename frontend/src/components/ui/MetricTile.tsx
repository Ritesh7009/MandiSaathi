import React from 'react';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badge?: string;
  variant?: 'forest' | 'harvest' | 'default';
  icon?: React.ReactNode;
}

/**
 * Adapted from Cult UI:
 * Refined metric indicator with subtle border highlight, status badge, and clean typography.
 */
export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  subtext,
  badge,
  variant = 'default',
  icon,
}) => {
  const borderClass =
    variant === 'forest'
      ? 'border-forest/30 bg-forest-50/40'
      : variant === 'harvest'
      ? 'border-harvest/50 bg-harvest-50/50'
      : 'border-ivory-dark bg-white';

  const valueClass =
    variant === 'forest'
      ? 'text-forest font-bold'
      : variant === 'harvest'
      ? 'text-harvest-dark font-bold'
      : 'text-charcoal font-bold';

  return (
    <div
      className={`rounded-md border p-4 transition-all hover:border-forest/50 hover:shadow-subtle ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest border border-forest/20">
            {badge}
          </span>
        )}
        {icon && !badge && <div className="text-forest-light">{icon}</div>}
      </div>

      <div className="flex items-baseline space-x-1.5">
        <span className={`text-2xl tracking-tight ${valueClass}`}>{value}</span>
        {unit && <span className="text-xs font-medium text-charcoal-muted">{unit}</span>}
      </div>

      {subtext && <p className="mt-1.5 text-xs text-charcoal-muted font-normal">{subtext}</p>}
    </div>
  );
};
