import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { api } from '../services/apiClient';
import { Language } from '../types';
import { clearOfflineCache, getCachedPrices } from '../services/offlineStorage';
import {
  Sliders,
  Globe,
  Type,
  Check,
  Server,
  Database,
  Trash2,
  Volume2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();
  const { isOnline } = useNetwork();

  const [cacheCount, setCacheCount] = useState<number>(0);
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);

  useEffect(() => {
    getCachedPrices()
      .then((res) => setCacheCount(res.totalCached))
      .catch(() => setCacheCount(0));
  }, [cacheCleared]);

  const handleClearCache = async () => {
    await clearOfflineCache();
    setCacheCleared(true);
    setCacheCount(0);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const { data: health } = useQuery({
    queryKey: ['systemHealthDetails'],
    queryFn: () => api.checkHealth(),
    refetchInterval: 30000,
  });

  const supportedLanguages: {
    code: Language;
    label: string;
    script: string;
    greeting: string;
    description: string;
  }[] = [
    {
      code: 'hi',
      label: 'हिन्दी (Hindi)',
      script: 'Devanagari',
      greeting: 'राम राम, किसान साथी',
      description: 'उत्तर एवं मध्य भारत के किसानों के लिए पूर्ण समर्थन',
    },
    {
      code: 'pa',
      label: 'ਪੰਜਾਬੀ (Punjabi)',
      script: 'Gurmukhi',
      greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਸਾਥੀ',
      description: 'ਪੰਜਾਬ ਅਤੇ ਹਰਿਆਣਾ ਦੇ ਮੰਡੀ ਕਿਸਾਨਾਂ ਲਈ ਵਿਸ਼ੇਸ਼ ਸਹਾਇਤਾ',
    },
    {
      code: 'en',
      label: 'English (Indian)',
      script: 'Latin / Inter',
      greeting: 'Welcome, Farmer Partner',
      description: 'Pan-India technical and agricultural market interface',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 lg:pb-8">
      {/* Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Sliders className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Preferences & Diagnostics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {t('settingsTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5 max-w-2xl">
            {t('settingsSubtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-surface border border-hairline px-3 py-1.5 rounded-lg text-charcoal-muted self-start sm:self-center">
          <Globe className="w-3.5 h-3.5 text-forest" />
          <span>Multilingual Engine v2.0</span>
        </div>
      </section>

      {/* Group 1: Language & Dialect Selection (Clean Linear/Apple Grouped Rows) */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              {t('languageSectionTitle')}
            </h2>
          </div>
          <span className="text-[11px] text-charcoal-muted font-mono">
            {language.toUpperCase()} Active
          </span>
        </div>

        <div className="divide-y divide-hairline">
          {supportedLanguages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`w-full p-4 text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-forest-50/40' : 'hover:bg-surface'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-charcoal">{l.label}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-hairline text-charcoal-muted">
                      {l.script}
                    </span>
                  </div>
                  <div className="text-xs text-forest font-medium">"{l.greeting}"</div>
                  <p className="text-[11px] text-charcoal-muted leading-relaxed">
                    {l.description}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isSelected
                      ? 'bg-forest text-white border-forest'
                      : 'border-hairline-dark bg-surface-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Group 2: Display & Accessibility Font Sizing */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Type className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              {t('fontSizeTitle')}
            </h2>
          </div>
          <span className="text-[11px] text-charcoal-muted font-mono">
            {fontSize === 'large' ? 'Large (+2px)' : 'Standard'}
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFontSize('normal')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              fontSize === 'normal'
                ? 'border-forest bg-forest-50/50 shadow-subtle'
                : 'border-hairline bg-surface hover:bg-surface-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-charcoal">{t('fontNormal')}</span>
              {fontSize === 'normal' && (
                <div className="w-4 h-4 rounded-full bg-forest text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Standard body text size (14px/16px) optimized for high-density mobile and desktop screens.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFontSize('large')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              fontSize === 'large'
                ? 'border-forest bg-forest-50/50 shadow-subtle'
                : 'border-hairline bg-surface hover:bg-surface-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-base text-charcoal">{t('fontLarge')}</span>
              {fontSize === 'large' && (
                <div className="w-4 h-4 rounded-full bg-forest text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-sm text-charcoal-muted leading-relaxed">
              High-visibility enlarged text (+2px) designed for outdoor use under bright sunlight in mandis.
            </p>
          </button>
        </div>
      </section>

      {/* Group 3: Voice & AI Audio Preferences */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Voice Synthesis & AI Stack
            </h2>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-forest-50 text-forest border border-forest/20">
            {health?.services.gnaniTimbreTts?.status === 'CONNECTED' ? 'LIVE TIMBRE' : 'SANDBOX'}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] uppercase font-semibold text-charcoal-subtle">Hindi Voice</div>
              <div className="font-bold text-charcoal text-sm">Nalini (नलिनि)</div>
              <div className="text-[10px] text-charcoal-muted font-mono">Model: timbre-v2.5</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] uppercase font-semibold text-charcoal-subtle">Punjabi Voice</div>
              <div className="font-bold text-charcoal text-sm">Nalini (ਨਲਿਨੀ)</div>
              <div className="text-[10px] text-charcoal-muted font-mono">Model: timbre-v2.5</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] uppercase font-semibold text-charcoal-subtle">Indian English</div>
              <div className="font-bold text-charcoal text-sm">Kaveri</div>
              <div className="text-[10px] text-charcoal-muted font-mono">Model: timbre-v2.5</div>
            </div>
          </div>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            All voice processing operates server-side via Spring Boot proxying to Gnani.ai Prisma STT and Timbre TTS. Audio is streamed as raw 16-bit PCM WAV binaries without exposing client credentials.
          </p>
        </div>
      </section>

      {/* Group 4: Network & Offline Cache Storage */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Network & Offline Storage
            </h2>
          </div>
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
            isOnline ? 'bg-forest-50 text-forest border border-forest/20' : 'bg-amber-100 text-amber-900'
          }`}>
            {isOnline ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-charcoal">IndexedDB Structured Price Cache</div>
            <p className="text-charcoal-muted text-[11px] mt-0.5 leading-relaxed">
              MandiSaathi caches retrieved APMC records in client IndexedDB (`mandisaathi_offline_db`) for zero-connectivity field use. Currently caching <strong>{cacheCount}</strong> price records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearCache}
            disabled={cacheCount === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-surface hover:bg-red-50 text-charcoal-muted hover:text-red-700 border border-hairline hover:border-red-200 transition-all text-xs font-semibold cursor-pointer disabled:opacity-40 self-start sm:self-auto shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{cacheCleared ? 'Cache Cleared!' : 'Clear Offline Cache'}</span>
          </button>
        </div>
      </section>

      {/* Group 5: System Telemetry & Provenance Disclosure */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              {t('systemArchitecturePreview')}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-charcoal-muted">
            v{health?.version || '1.0.0-RC1'}
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
            <div className="font-bold text-forest">Backend Platform</div>
            <div className="text-charcoal text-xs">Java 21 • Spring Boot 3.3.5</div>
            <p className="text-[10px] text-charcoal-muted">Spring Data JPA, Hibernate, Actuator Health</p>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
            <div className="font-bold text-forest">Database Architecture</div>
            <div className="text-charcoal text-xs">PostgreSQL 16 • Flyway V1–V4</div>
            <p className="text-[10px] text-charcoal-muted">Strict composite unique constraints on auction dates</p>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
            <div className="font-bold text-forest">Data Source Grounding</div>
            <div className="text-charcoal text-xs">Agmarknet / data.gov.in</div>
            <p className="text-[10px] text-charcoal-muted">Nightly @Scheduled cron at 19:00 IST</p>
          </div>
        </div>
      </section>
    </div>
  );
};
