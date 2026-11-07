import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  Sprout,
  Mic,
  TrendingUp,
  Scale,
  Landmark,
  FileText,
  Sliders,
  Globe,
} from 'lucide-react';
import { Language } from '../types';

export const Sidebar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { to: '/', label: t('navHome'), icon: Sprout },
    { to: '/assistant', label: t('navVoice'), icon: Mic, highlight: true },
    { to: '/prices', label: t('navPrices'), icon: TrendingUp },
    { to: '/compare', label: t('navCompare'), icon: Scale },
    { to: '/schemes', label: t('navSchemes'), icon: Landmark },
    { to: '/complaints', label: t('navComplaints'), icon: FileText },
    { to: '/settings', label: t('navSettings'), icon: Sliders },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'hi', label: 'हिन्दी' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'en', label: 'English' },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-forest text-ivory border-r border-forest-dark shrink-0 h-screen sticky top-0 z-40">
      {/* Brand Header */}
      <div className="p-5 border-b border-forest-light/20 flex items-center space-x-3">
        <div className="bg-harvest text-forest-dark p-2 rounded-md shadow-xs">
          <Sprout className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="font-bold text-lg tracking-tight text-white">{t('appTitle')}</h1>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-harvest text-forest-dark">
              PROD
            </span>
          </div>
          <p className="text-[11px] text-ivory/70 leading-tight">
            {language === 'hi' ? 'कृषि बाज़ार आसूचना' : language === 'pa' ? 'ਖੇਤੀਬਾੜੀ ਮੰਡੀ ਮੰਚ' : 'Agritech Intelligence'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-harvest text-forest-dark shadow-xs'
                    : item.highlight
                    ? 'text-harvest hover:bg-forest-light/40 border border-harvest/30'
                    : 'text-ivory/80 hover:text-white hover:bg-forest-light/30'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.highlight && (
                <span className="ml-auto text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-harvest-dark text-white">
                  VOICE
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Language Switcher Footer */}
      <div className="p-4 border-t border-forest-light/20 bg-forest-dark/40">
        <div className="flex items-center space-x-1.5 mb-2.5 text-xs text-ivory/70">
          <Globe className="w-3.5 h-3.5 text-harvest" />
          <span className="font-medium text-[11px]">Dialect / भाषा</span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-forest-dark p-1 rounded-md border border-forest-light/20">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`py-1 text-center text-xs font-medium rounded transition-colors ${
                language === l.code
                  ? 'bg-harvest text-forest-dark font-bold'
                  : 'text-ivory/70 hover:text-white hover:bg-forest-light/30'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

