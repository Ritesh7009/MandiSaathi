import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage, ALL_RECOGNIZED_LANGUAGES } from '../context/LanguageContext';
import { Sprout, Mic, Globe, Type, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { Language } from '../types';
import { NetworkStatusBadge } from './NetworkStatusBadge';

export const Header: React.FC = () => {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();

  const { data: health } = useQuery({
    queryKey: ['systemHealthHeader'],
    queryFn: api.checkHealth,
    staleTime: 60000,
  });

  const isUp = health?.status === 'UP';

  const languages: { code: Language; label: string }[] = [
    { code: 'hi', label: 'हिन्दी' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <header className="bg-surface-white border-b border-hairline sticky top-0 z-30 px-4 sm:px-6 py-2.5 shadow-subtle">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Mobile Brand */}
        <div className="flex items-center space-x-2.5 lg:hidden">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-forest text-white p-1.5 rounded-lg shadow-subtle">
              <Sprout className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-bold text-sm text-charcoal tracking-tight">{t('appTitle')}</span>
          </Link>
        </div>

        {/* Desktop Breadcrumb/Subtitle */}
        <div className="hidden lg:flex items-center space-x-3 text-xs text-charcoal-muted">
          <span className="font-medium text-charcoal">{t('appSubtitle')}</span>
          <span className="text-charcoal-subtle">•</span>
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-forest-50 border border-forest/20">
            {isUp ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
            ) : health?.status === 'DEGRADED' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-harvest-dark" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span className="text-xs font-mono font-semibold text-forest-dark">
              {isUp ? t('marketDataVerified') : t('marketDataOffline')}
            </span>
          </span>
        </div>

        {/* Right Action Utilities */}
        <div className="flex items-center space-x-2 sm:space-x-3 ml-auto">
          {/* Network Connection Indicator */}
          <NetworkStatusBadge />

          {/* Font Size Accessibility Toggle (Minimum 40px touch target) */}
          <button
            type="button"
            onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 flex items-center space-x-1 cursor-pointer active:scale-[0.98] ${
              fontSize === 'large'
                ? 'bg-harvest-100 text-harvest-dark border-harvest'
                : 'bg-surface border-hairline text-charcoal hover:border-forest/40'
            }`}
            title="Toggle high-visibility text size"
            aria-label="Toggle text size"
          >
            <Type className="w-4 h-4" />
            <span className="text-xs font-mono font-bold hidden sm:inline">A+</span>
          </button>

          {/* Language Selector for All 23 Recognized Languages (Comfortable 38px touch height) */}
          <div className="flex items-center bg-surface p-1 rounded-lg border border-hairline shadow-subtle">
            <Globe className="w-3.5 h-3.5 text-forest ml-1 mr-1.5 shrink-0" />
            
            {/* Quick dialect buttons for fast 1-tap switching */}
            <div className="hidden md:flex items-center space-x-1 mr-1 pr-1 border-r border-hairline">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`min-h-[30px] px-2 py-0.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                    language === l.code
                      ? 'bg-forest text-white shadow-subtle'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Native dropdown for all 23 officially recognized Indian languages */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none cursor-pointer pr-1 py-1 max-w-[140px] truncate"
              aria-label="Select from all recognized Indian languages"
              title="Select language"
            >
              <optgroup label={t('gnaniVoicePowered')}>
                {ALL_RECOGNIZED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.name})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Quick Voice Access CTA Button */}
          <Link
            to="/assistant"
            className="inline-flex items-center space-x-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-forest hover:bg-forest-light text-white text-xs font-semibold shadow-subtle transition-all duration-150 active:scale-[0.98]"
          >
            <Mic className="w-4 h-4 text-white stroke-[2.2]" />
            <span className="hidden sm:inline font-medium">{t('navVoice')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
