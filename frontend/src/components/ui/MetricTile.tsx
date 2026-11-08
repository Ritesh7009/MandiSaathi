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
 * Editorial AgriTech Metric Block
 * High-density, tabular numeric presentation inspired by Linear and Apple.
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
      ? 'border-forest/20 bg-forest-50/50'
      : variant === 'harvest'
      ? 'border-harvest/30 bg-harvest-50/40'
      : 'border-hairline bg-surface';

  const valueColor =
    variant === 'forest'
      ? 'text-forest'
      : variant === 'harvest'
      ? 'text-harvest-600'
      : 'text-charcoal';

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-150 hover:border-forest/30 ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-forest-100/60 text-forest border border-forest/20 font-mono">
            {badge}
          </span>
        )}
        {icon && !badge && <div className="text-forest-light shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline space-x-1.5">
        <span className={`text-2xl font-bold tracking-tight tnum font-mono ${valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-charcoal-muted">{unit}</span>}
      </div>

      {subtext && <p className="mt-1 text-xs text-charcoal-muted leading-relaxed">{subtext}</p>}
    </div>
  );
};
