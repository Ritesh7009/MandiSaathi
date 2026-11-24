import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plant, TrendUp, Scales, SquaresFour, BookOpenText } from '@phosphor-icons/react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Floating Mobile Bottom Dock (Cult UI & Motion Primitives inspired).
 * Clean rounded frosted capsule without overlapping protruding circles above content.
 */
export const MobileBottomNav: React.FC = () => {
  const { language, t } = useLanguage();
  const location = useLocation();

  const isHomeActive =
    location.pathname === '/' ||
    location.pathname === '/assistant' ||
    location.pathname === '/voice';

  const isPricesActive = location.pathname.startsWith('/prices');
  const isCompareActive = location.pathname.startsWith('/compare');
  const isCropsActive = location.pathname.startsWith('/crops');
  const isMoreActive =
    location.pathname.startsWith('/more') ||
    location.pathname.startsWith('/schemes') ||
    location.pathname.startsWith('/complaints') ||
    location.pathname.startsWith('/settings');

  const items = [
    { to: '/', label: t('navHome'), icon: Plant, active: isHomeActive },
    { to: '/prices', label: t('navPrices'), icon: TrendUp, active: isPricesActive },
    { to: '/compare', label: t('navCompare'), icon: Scales, active: isCompareActive },
    {
      to: '/crops',
      label: language === 'hi' ? 'फसलें' : language === 'pa' ? 'ਫ਼ਸਲਾਂ' : 'Crops',
      icon: BookOpenText,
      active: isCropsActive,
    },
    { to: '/more', label: t('navMore'), icon: SquaresFour, active: isMoreActive },
  ];

  return (
    <nav
      aria-label={t('mainNavigation')}
      className="md:hidden fixed bottom-3 left-3 right-3 z-50 ms-glass-dock rounded-2xl shadow-dock p-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] select-none"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center min-h-[48px] py-1.5 px-1 rounded-xl transition-colors ${
                item.active ? 'text-white font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.active && (
                <motion.span
                  layoutId="mobile-dock-pill"
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className="absolute inset-0 rounded-xl bg-canopy shadow-subtle -z-0"
                />
              )}
              <Icon
                weight={item.active ? 'duotone' : 'regular'}
                className="w-5 h-5 relative z-10"
              />
              <span className="text-[11px] mt-0.5 truncate max-w-full px-1 relative z-10">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
