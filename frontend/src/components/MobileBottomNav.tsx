import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sprout, TrendingUp, Mic, Landmark, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { t } = useLanguage();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ivory-dark z-50 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-bold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <Sprout className="w-5 h-5 mb-0.5" />
          <span>{t('navHome')}</span>
        </NavLink>

        <NavLink
          to="/prices"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-bold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span>{t('navPrices')}</span>
        </NavLink>

        {/* Prominent Center Voice Button for Thumb Zone */}
        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            `relative -top-4 flex flex-col items-center justify-center w-13 h-13 rounded-full bg-forest text-harvest shadow-md border-2 ${
              isActive ? 'border-harvest ring-2 ring-forest/30' : 'border-ivory'
            } transition-transform active:scale-95`
          }
          aria-label={t('navVoice')}
        >
          <Mic className="w-6 h-6 stroke-[2.3]" />
        </NavLink>

        <NavLink
          to="/schemes"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-bold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <Landmark className="w-5 h-5 mb-0.5" />
          <span>{t('navSchemes')}</span>
        </NavLink>

        <NavLink
          to="/complaints"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-forest font-bold' : 'text-charcoal-muted hover:text-charcoal'
            }`
          }
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>{t('navComplaints')}</span>
        </NavLink>
      </div>
    </nav>
  );
};
