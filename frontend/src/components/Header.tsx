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
    { code: 'en', label: 'English' },
  ];

  return (
    <header className="bg-white border-b border-ivory-dark sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Mobile Brand */}
        <div className="flex items-center space-x-2.5 lg:hidden">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-forest text-harvest p-1.5 rounded-md">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-forest-dark">{t('appTitle')}</span>
          </Link>
        </div>

        {/* Desktop Breadcrumb/Subtitle */}
        <div className="hidden lg:flex items-center space-x-3 text-xs text-charcoal-muted">
          <span className="font-semibold text-charcoal">{t('appSubtitle')}</span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            {isUp ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
            ) : health?.status === 'DEGRADED' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-harvest-dark" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span className="text-[11px] font-mono">
              APMC Telemetry: {isUp ? 'LIVE' : 'STANDALONE'}
            </span>
          </span>
        </div>

        {/* Right Action Utilities */}
        <div className="flex items-center space-x-2 sm:space-x-3 ml-auto">
          {/* Network Connection Indicator */}
          <NetworkStatusBadge />

          {/* Font Size Accessibility Toggle */}
          <button
            type="button"
            onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
            className={`p-1.5 rounded text-xs font-semibold border flex items-center space-x-1 transition-colors ${
              fontSize === 'large'
                ? 'bg-harvest text-forest-dark border-harvest-dark'
                : 'bg-ivory border-ivory-dark text-charcoal hover:bg-ivory-dark'
            }`}
            title="Toggle high-visibility text size"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">A+</span>
          </button>

          {/* Mobile Language Selector Dropdown */}
          <div className="flex lg:hidden items-center space-x-1 bg-ivory p-1 rounded border border-ivory-dark">
            <Globe className="w-3.5 h-3.5 text-forest ml-1" />
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-1.5 py-0.5 text-[11px] font-medium rounded ${
                  language === l.code ? 'bg-forest text-white font-bold' : 'text-charcoal'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Quick Voice Access CTA Button */}
          <Link
            to="/assistant"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-forest hover:bg-forest-light text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-harvest" />
            <span className="hidden sm:inline">{t('navVoice')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

