import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sprout, TrendingUp, Mic, Scale, Landmark } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { t } = useLanguage();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-white/95 backdrop-blur-md border-t border-hairline z-50 px-3 py-1.5 shadow-float">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-semibold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <Sprout className="w-5 h-5 mb-0.5 stroke-[1.8]" />
          <span>{t('navHome')}</span>
        </NavLink>

        {/* Prices */}
        <NavLink
          to="/prices"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-semibold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <TrendingUp className="w-5 h-5 mb-0.5 stroke-[1.8]" />
          <span>{t('navPrices')}</span>
        </NavLink>

        {/* Center Floating Voice Action for One-Handed Thumb Reach */}
        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            `relative -top-5 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-forest text-harvest shadow-voice border-2 ${
              isActive ? 'border-harvest ring-2 ring-forest/30 scale-105' : 'border-surface-white'
            } transition-all duration-150 active:scale-95 cursor-pointer`
          }
          aria-label={t('navVoice')}
        >
          <Mic className="w-5 h-5 stroke-[2.4]" />
        </NavLink>

        {/* Compare */}
        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-semibold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <Scale className="w-5 h-5 mb-0.5 stroke-[1.8]" />
          <span>{t('navCompare')}</span>
        </NavLink>

        {/* Schemes */}
        <NavLink
          to="/schemes"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-semibold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <Landmark className="w-5 h-5 mb-0.5 stroke-[1.8]" />
          <span>{t('navSchemes')}</span>
        </NavLink>
      </div>
    </nav>
  );
};
