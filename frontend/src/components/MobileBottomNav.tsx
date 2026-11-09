import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sprout, TrendingUp, Scale, LayoutGrid, Mic } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const isHomeActive = location.pathname === '/';
  const isVoiceActive = location.pathname === '/assistant' || location.pathname === '/voice';
  const isPricesActive = location.pathname.startsWith('/prices');
  const isCompareActive = location.pathname.startsWith('/compare');
  const isMoreActive =
    location.pathname.startsWith('/more') ||
    location.pathname.startsWith('/schemes') ||
    location.pathname.startsWith('/complaints') ||
    location.pathname.startsWith('/settings');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-white border-t border-hairline z-50 px-2 py-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-float select-none">
      <div className="grid grid-cols-5 items-end max-w-md mx-auto">
        {/* 1. Home */}
        <NavLink
          to="/"
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-150 active:scale-95 ${
            isHomeActive ? 'text-forest font-bold' : 'text-charcoal hover:text-forest'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isHomeActive ? 'bg-forest text-white shadow-subtle' : 'text-charcoal'
            }`}
          >
            <Sprout className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] mt-1 font-semibold truncate tracking-tight">
            {t('navHome')}
          </span>
        </NavLink>

        {/* 2. Rates */}
        <NavLink
          to="/prices"
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-150 active:scale-95 ${
            isPricesActive ? 'text-forest font-bold' : 'text-charcoal hover:text-forest'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isPricesActive ? 'bg-forest text-white shadow-subtle' : 'text-charcoal'
            }`}
          >
            <TrendingUp className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] mt-1 font-semibold truncate tracking-tight">
            {t('navPrices')}
          </span>
        </NavLink>

        {/* 3. Center Raised Action Button: Voice Assistant */}
        <NavLink
          to="/assistant"
          aria-label={t('navVoice')}
          className="flex flex-col items-center justify-center relative -top-3.5 group cursor-pointer"
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-voice border-2 border-surface-white tactile-press transition-all duration-200 group-active:scale-95 ${
              isVoiceActive
                ? 'bg-harvest-dark text-white ring-2 ring-forest'
                : 'bg-forest text-white hover:bg-forest-light'
            }`}
          >
            <Mic className="w-6 h-6 stroke-[2.4] text-white" />
          </div>
          <span className="text-[10px] font-bold text-forest uppercase tracking-wider mt-0.5">
            {t('navVoice')}
          </span>
        </NavLink>

        {/* 4. Compare */}
        <NavLink
          to="/compare"
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-150 active:scale-95 ${
            isCompareActive ? 'text-forest font-bold' : 'text-charcoal hover:text-forest'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isCompareActive ? 'bg-forest text-white shadow-subtle' : 'text-charcoal'
            }`}
          >
            <Scale className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] mt-1 font-semibold truncate tracking-tight">
            {t('navCompare')}
          </span>
        </NavLink>

        {/* 5. More */}
        <NavLink
          to="/more"
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-150 active:scale-95 ${
            isMoreActive ? 'text-forest font-bold' : 'text-charcoal hover:text-forest'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isMoreActive ? 'bg-forest text-white shadow-subtle' : 'text-charcoal'
            }`}
          >
            <LayoutGrid className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] mt-1 font-semibold truncate tracking-tight">
            {t('navMore')}
          </span>
        </NavLink>
      </div>
    </nav>
  );
};
