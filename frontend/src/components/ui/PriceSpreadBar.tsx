import React from 'react';

interface PriceSpreadBarProps {
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
  unit?: string;
  className?: string;
}

/**
 * Editorial AgriTech Price Spread Gauge
 * Visualizes where the APMC modal price falls between the day's auction floor (min) and ceiling (max).
 * Provides immediate visual clarity to farmers regarding market price distribution.
 */
export const PriceSpreadBar: React.FC<PriceSpreadBarProps> = ({
  minPrice,
  modalPrice,
  maxPrice,
  unit = '₹/Qtl',
  className = '',
}) => {
  const range = maxPrice - minPrice;
  const percentage = range > 0 ? Math.min(100, Math.max(0, ((modalPrice - minPrice) / range) * 100)) : 50;

  return (
    <div className={`space-y-1.5 py-1 ${className}`}>
      {/* Track & Marker */}
      <div className="relative w-full h-2 bg-ivory-dark/70 rounded-full overflow-visible flex items-center">
        {/* Subtle filled gradient bar up to modal rate */}
        <div
          className="h-full bg-forest-100 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        {/* Marker Dot */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-forest border-2 border-white shadow-subtle -translate-x-1/2 transition-all duration-300"
          style={{ left: `${percentage}%` }}
          title={`Modal Rate: ₹${modalPrice.toLocaleString('en-IN')}`}
        />
      </div>

      {/* Min / Max Range Floor & Ceiling Labels */}
      <div className="flex items-center justify-between text-[10px] font-mono text-charcoal-muted">
        <span>Min: ₹{minPrice.toLocaleString('en-IN')}</span>
        <span className="font-semibold text-forest">
          Modal: ₹{modalPrice.toLocaleString('en-IN')} <span className="font-normal text-[9px] text-charcoal-muted">({unit})</span>
        </span>
        <span>Max: ₹{maxPrice.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};
