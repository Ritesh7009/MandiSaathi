import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';

interface PriceSpreadBarProps {
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
  unit?: string;
  className?: string;
}

export const PriceSpreadBar: React.FC<PriceSpreadBarProps> = ({
  minPrice,
  modalPrice,
  maxPrice,
  unit = '₹/Qtl',
  className = '',
}) => {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const range = maxPrice - minPrice;
  const percentage = range > 0 ? Math.min(100, Math.max(0, ((modalPrice - minPrice) / range) * 100)) : 50;

  return (
    <div className={`space-y-2 py-1 ${className}`}>
      <div className="relative w-full h-2 bg-surface-subtle rounded-full overflow-visible flex items-center">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-gradient-to-r from-canopy/60 to-canopy-bright rounded-full"
        />
        <motion.div
          initial={reduce ? false : { left: '0%' }}
          whileInView={{ left: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute w-3.5 h-3.5 rounded-full bg-canopy-bright border-2 border-surface shadow-subtle -translate-x-1/2"
          title={`${t('modalPrice')}: ₹${modalPrice.toLocaleString('en-IN')}`}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted tnum">
        <span>₹{minPrice.toLocaleString('en-IN')}</span>
        <span className="font-semibold text-canopy dark:text-canopy-bright">
          ₹{modalPrice.toLocaleString('en-IN')}{' '}
          <span className="font-normal text-[10px] text-ink-subtle">({unit})</span>
        </span>
        <span>₹{maxPrice.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};
