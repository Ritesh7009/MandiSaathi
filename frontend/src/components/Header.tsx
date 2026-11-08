import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
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
    <header className="bg-surface/90 backdrop-blur-md border-b border-hairline sticky top-0 z-30 px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Mobile Brand */}
        <div className="flex items-center space-x-2.5 lg:hidden">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-forest text-harvest p-1.5 rounded-lg shadow-subtle">
              <Sprout className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-bold text-sm text-charcoal tracking-tight">{t('appTitle')}</span>
          </Link>
        </div>

        {/* Desktop Breadcrumb/Subtitle */}
        <div className="hidden lg:flex items-center space-x-3 text-xs text-charcoal-muted">
          <span className="font-medium text-charcoal-light">{t('appSubtitle')}</span>
          <span className="text-charcoal-subtle">•</span>
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-forest-50 border border-forest/15">
            {isUp ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
            ) : health?.status === 'DEGRADED' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-harvest-dark" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span className="text-[10px] font-mono font-medium text-forest-dark">
              APMC Telemetry: {isUp ? 'LIVE' : 'STANDALONE'}
            </span>
          </span>
        </div>

        {/* Right Action Utilities */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 ml-auto">
          {/* Network Connection Indicator */}
          <NetworkStatusBadge />

          {/* Font Size Accessibility Toggle */}
          <button
            type="button"
            onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 flex items-center space-x-1 cursor-pointer ${
              fontSize === 'large'
                ? 'bg-harvest-100 text-harvest-dark border-harvest'
                : 'bg-surface-white border-hairline text-charcoal-muted hover:text-charcoal hover:border-forest/20'
            }`}
            title="Toggle high-visibility text size"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono hidden sm:inline">A+</span>
          </button>

          {/* Mobile Language Selector */}
          <div className="flex lg:hidden items-center space-x-0.5 bg-ivory-dark/60 p-0.5 rounded-lg border border-hairline">
            <Globe className="w-3 h-3 text-forest ml-1 mr-0.5" />
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  language === l.code
                    ? 'bg-surface-white text-forest font-semibold shadow-subtle'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Quick Voice Access CTA Button */}
          <Link
            to="/assistant"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest hover:bg-forest-light text-white text-xs font-semibold shadow-subtle transition-all duration-150 active:scale-[0.98]"
          >
            <Mic className="w-3.5 h-3.5 text-harvest stroke-[2.2]" />
            <span className="hidden sm:inline font-medium">{t('navVoice')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
