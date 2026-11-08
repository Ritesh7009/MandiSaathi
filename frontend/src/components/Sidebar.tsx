import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  Sprout,
  TrendingUp,
  Scale,
  LayoutGrid,
  Globe,
  Landmark,
  FileText,
  Sliders,
} from 'lucide-react';
import { Language } from '../types';

export const Sidebar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
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

  const primaryNavItems = [
    { to: '/', label: t('navHome'), icon: Sprout, isActiveCustom: isHomeActive },
    { to: '/prices', label: t('navPrices'), icon: TrendingUp },
    { to: '/compare', label: t('navCompare'), icon: Scale },
    { to: '/more', label: t('navMore'), icon: LayoutGrid, isActiveCustom: isMoreActive },
  ];

  const secondaryNavItems = [
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
    <aside className="hidden lg:flex lg:flex-col w-60 bg-surface border-r border-hairline shrink-0 h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-forest text-harvest flex items-center justify-center shadow-subtle shrink-0">
            <Sprout className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-charcoal">{t('appTitle')}</span>
              <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded-full bg-forest-50 text-forest border border-forest/20">
                APMC
              </span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-tight">
              {language === 'hi' ? 'कृषि बाज़ार आसूचना' : language === 'pa' ? 'ਖੇਤੀਬਾੜੀ ਮੰਡੀ ਮੰਚ' : 'Agri Intelligence'}
            </p>
          </div>
        </div>
      </div>

      {/* Primary 4-Destination Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2 text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider">
          Main Navigation
        </div>
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => {
                const active = item.isActiveCustom !== undefined ? item.isActiveCustom : isActive;
                return `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  active
                    ? 'bg-forest text-white font-semibold shadow-subtle'
                    : 'text-charcoal-light hover:text-charcoal hover:bg-black/[0.03]'
                }`;
              }}
            >
              {({ isActive }) => {
                const active = item.isActiveCustom !== undefined ? item.isActiveCustom : isActive;
                return (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 stroke-[2] ${
                        active ? 'text-harvest' : 'text-charcoal-muted'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}

        {/* Secondary Services (Sub-grouped under More) */}
        <div className="pt-4 mt-4 border-t border-hairline/60">
          <div className="px-2 mb-2 text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider">
            More Services
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-forest font-semibold bg-forest-50/60'
                      : 'text-charcoal-muted hover:text-charcoal hover:bg-black/[0.02]'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0 stroke-[1.8] text-charcoal-muted" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Language Dialect Selector */}
      <div className="p-3 border-t border-hairline bg-surface/40">
        <div className="flex items-center space-x-1.5 mb-2 px-1 text-charcoal-subtle">
          <Globe className="w-3.5 h-3.5 text-forest" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Dialect / भाषा</span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-ivory-dark/60 p-1 rounded-lg border border-hairline">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`py-1 text-center text-[11px] font-medium rounded transition-all duration-150 cursor-pointer ${
                language === l.code
                  ? 'bg-surface-white text-forest font-semibold shadow-subtle'
                  : 'text-charcoal-muted hover:text-charcoal'
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
