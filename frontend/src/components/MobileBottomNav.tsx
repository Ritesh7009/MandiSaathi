import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sprout, TrendingUp, Scale, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const isHomeActive =
    location.pathname === '/' ||
    location.pathname === '/assistant' ||
    location.pathname === '/voice';

  const isMoreActive =
    location.pathname.startsWith('/more') ||
    location.pathname.startsWith('/schemes') ||
    location.pathname.startsWith('/complaints') ||
    location.pathname.startsWith('/settings');

  const navItems = [
    {
      to: '/',
      label: t('navHome'),
      icon: Sprout,
      isActive: isHomeActive,
    },
    {
      to: '/prices',
      label: t('navPrices'),
      icon: TrendingUp,
      isActive: location.pathname.startsWith('/prices'),
    },
    {
      to: '/compare',
      label: t('navCompare'),
      icon: Scale,
      isActive: location.pathname.startsWith('/compare'),
    },
    {
      to: '/more',
      label: t('navMore'),
      icon: LayoutGrid,
      isActive: isMoreActive,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-white/95 backdrop-blur-md border-t border-hairline z-50 px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-float select-none">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 active:scale-95 ${
                item.isActive ? 'text-forest font-bold' : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <div
                className={`p-1 rounded-full transition-colors ${
                  item.isActive ? 'bg-forest-50 text-forest' : 'text-charcoal-muted'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[10px] mt-0.5 truncate tracking-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
