import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage, ALL_RECOGNIZED_LANGUAGES } from '../context/LanguageContext';
import {
  Sprout,
  TrendingUp,
  Scale,
  LayoutGrid,
  Globe,
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
          <div className="w-8 h-8 rounded-lg bg-forest text-white flex items-center justify-center shadow-subtle shrink-0">
            <Sprout className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-charcoal">{t('appTitle')}</span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-forest-50 text-forest border border-forest/20">
                APMC
              </span>
            </div>
            <p className="text-xs text-charcoal-muted leading-tight mt-0.5">
              {t('mandiPriceService')}
            </p>
          </div>
        </div>
      </div>

      {/* Primary 4-Destination Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2 text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider">
          {t('mainNavigation')}
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
      </nav>

      {/* Language Dialect Selector (All 23 Recognized Languages) */}
      <div className="p-3 border-t border-hairline bg-surface-white space-y-2">
        <div className="flex items-center justify-between px-1 text-charcoal-subtle">
          <div className="flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-forest" />
            <span className="text-xs font-bold uppercase tracking-wider">Dialect / भाषा</span>
          </div>
          <span className="text-xs font-mono text-charcoal-muted">10 Gnani AI</span>
        </div>

        {/* Quick top 3 buttons */}
        <div className="grid grid-cols-3 gap-1 bg-surface p-1 rounded-lg border border-hairline">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`min-h-[30px] py-1 text-center text-xs font-semibold rounded transition-all duration-150 cursor-pointer ${
                language === l.code
                  ? 'bg-forest text-white shadow-subtle'
                  : 'text-charcoal hover:text-forest'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Full selector for all 22 official languages + English */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full bg-surface border border-hairline rounded-lg px-2.5 py-1.5 text-xs font-semibold text-charcoal focus:outline-none focus:border-forest cursor-pointer"
            aria-label="Select recognized language"
          >
            {ALL_RECOGNIZED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} — {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
};
