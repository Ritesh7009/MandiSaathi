import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, ALL_RECOGNIZED_LANGUAGES } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  Plant,
  TrendUp,
  Scales,
  SquaresFour,
  Globe,
  TextAa,
  Sun,
  Moon,
  Check,
  CaretDown,
  MagnifyingGlass,
  BookOpenText,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { useNetwork } from '../context/NetworkContext';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { ScrollProgressRail } from './ui/MotionPrimitives';
import { useCommandSpotlight } from './AstryxRootProvider';

export const Header: React.FC = () => {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useNetwork();
  const { openSpotlight } = useCommandSpotlight();
  const location = useLocation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const { data: health } = useQuery({
    queryKey: ['systemHealthHeader'],
    queryFn: api.checkHealth,
    staleTime: 60000,
  });

  const isUp = isOnline && health?.status !== 'DOWN';
  const currentLang = ALL_RECOGNIZED_LANGUAGES.find((l) => l.code === language) || ALL_RECOGNIZED_LANGUAGES[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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
    { to: '/', label: t('navHome'), icon: Plant, customActive: isHomeActive },
    { to: '/prices', label: t('navPrices'), icon: TrendUp },
    { to: '/compare', label: t('navCompare'), icon: Scales },
    {
      to: '/crops',
      label: language === 'hi' ? 'फसल ज्ञान' : language === 'pa' ? 'ਫ਼ਸਲ ਗਿਆਨ' : 'Crops',
      icon: BookOpenText,
    },
    { to: '/more', label: t('navMore'), icon: SquaresFour, customActive: isMoreActive },
  ];

  return (
    <header className="sticky top-0 z-40 ms-glass-dock border-x-0 border-t-0 border-b border-line">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Anchor */}
        <Link to="/" className="flex items-center space-x-2.5 min-h-[44px] shrink-0 min-w-0 group">
          <img
            src="/icon.svg"
            alt="MandiSaathi"
            className="w-8 h-8 rounded-lg shadow-subtle transition-transform duration-200 group-hover:scale-105 shrink-0"
          />
          <div className="flex items-center space-x-2 min-w-0">
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-ink whitespace-nowrap">
              {t('appTitle')}
            </span>
            <span
              className="hidden xl:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-canopy-soft text-canopy dark:text-canopy-bright border border-canopy/20 whitespace-nowrap"
              title={isUp ? t('marketDataVerified') : t('marketDataOffline')}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-canopy-bright' : 'bg-saffron'}`} />
              <span>{isUp ? 'APMC' : t('offline')}</span>
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Tabs (Skiper UI Animated Pill Indicator) */}
        <nav
          aria-label={t('mainNavigation')}
          className="hidden md:flex items-center bg-surface-subtle/90 border border-line p-1 rounded-full gap-0.5"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => {
                  const active = item.customActive !== undefined ? item.customActive : isActive;
                  return `relative inline-flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    active ? 'text-white' : 'text-ink-muted hover:text-ink'
                  }`;
                }}
              >
                {({ isActive }) => {
                  const active = item.customActive !== undefined ? item.customActive : isActive;
                  return (
                    <>
                      {active && (
                        <motion.span
                          layoutId="desktop-nav-pill"
                          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                          className="absolute inset-0 rounded-full bg-canopy shadow-subtle -z-0"
                        />
                      )}
                      <Icon
                        weight={active ? 'duotone' : 'regular'}
                        className={`w-4 h-4 relative z-10 ${active ? 'text-white' : ''}`}
                      />
                      <span className="relative z-10">{item.label}</span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>

        {/* Compact Single Right Utility Strip (Fits cleanly at 390px and 768px without clipping) */}
        <div className="flex items-center space-x-1.5 lg:space-x-2 shrink-0">
          <button
            type="button"
            onClick={openSpotlight}
            aria-label="Open quick command search"
            title="Quick Command Search (Cmd+K / Ctrl+K)"
            className="hidden md:inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] lg:px-3 rounded-full bg-surface border border-line hover:border-canopy/50 text-xs text-ink-muted hover:text-ink transition-all cursor-pointer active:scale-95"
          >
            <MagnifyingGlass weight="bold" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
            <span className="hidden xl:inline font-medium">Search</span>
            <kbd className="hidden xl:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle border border-line text-ink-subtle">
              ⌘K
            </kbd>
          </button>

          <div className="hidden xl:block">
            <NetworkStatusBadge />
          </div>

          {/* Font Size Accessibility Toggle */}
          <button
            type="button"
            onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
            aria-label="Toggle high-visibility text size"
            title="Toggle text size"
            className={`min-h-[44px] min-w-[44px] px-2 rounded-full border text-xs font-mono font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer active:scale-95 ${
              fontSize === 'large'
                ? 'bg-saffron-soft text-saffron-ink dark:text-saffron border-saffron/40'
                : 'bg-surface border-line text-ink hover:border-line-strong'
            }`}
          >
            <TextAa weight="bold" className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">{fontSize === 'large' ? 'A+' : 'A'}</span>
          </button>

          {/* Daylight / Dark Observatory Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to daylight mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Daylight mode' : 'Dark observatory mode'}
            className="min-h-[44px] min-w-[44px] rounded-full bg-surface border border-line hover:border-line-strong text-ink flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun weight="duotone" className="w-4 h-4 text-saffron" />
            ) : (
              <Moon weight="duotone" className="w-4 h-4 text-canopy" />
            )}
          </button>

          {/* Single Authoritative Language Popover */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              aria-expanded={langMenuOpen}
              aria-label="Select interface and voice language"
              className="min-h-[44px] px-3 rounded-full bg-surface border border-line hover:border-line-strong text-xs font-semibold text-ink flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Globe weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
              <span className="max-w-[72px] truncate">{currentLang?.label ?? 'English'}</span>
              <CaretDown weight="bold" className={`w-3 h-3 text-ink-muted transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {langMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-line-strong shadow-dock p-2 z-50"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-muted border-b border-line mb-1">
                    {t('gnaniVoicePowered')}
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {ALL_RECOGNIZED_LANGUAGES.map((l) => {
                      const active = language === l.code;
                      return (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => {
                            setLanguage(l.code);
                            setLangMenuOpen(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            active
                              ? 'bg-canopy-soft text-canopy dark:text-canopy-bright font-semibold'
                              : 'text-ink hover:bg-surface-subtle'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="font-semibold">{l.label}</span>
                            <span className="text-[11px] text-ink-muted truncate">{l.name}</span>
                          </div>
                          {active && <Check weight="bold" className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <ScrollProgressRail />
    </header>
  );
};
