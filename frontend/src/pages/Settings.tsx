import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage, ALL_RECOGNIZED_LANGUAGES } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { api } from '../services/apiClient';
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
  Search,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();
  const { isOnline } = useNetwork();

  const [cacheCount, setCacheCount] = useState<number>(0);
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);
  const [langSearch, setLangSearch] = useState<string>('');

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

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return ALL_RECOGNIZED_LANGUAGES;
    const term = langSearch.toLowerCase();
    return ALL_RECOGNIZED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.label.toLowerCase().includes(term) ||
        l.script.toLowerCase().includes(term) ||
        l.region.toLowerCase().includes(term) ||
        l.code.toLowerCase().includes(term)
    );
  }, [langSearch]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 lg:pb-8">
      {/* Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Sliders className="w-3.5 h-3.5 text-harvest-dark" />
            <span>{t('preferencesAndDisplay')}</span>
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
          <span>{t('regionalDialects')}</span>
        </div>
      </section>

      {/* Group 1: Language & Dialect Selection (10 Gnani-Supported Languages) */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              {t('languageSectionTitle')}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-forest bg-forest-50 border border-forest/20 px-2 py-0.5 rounded-full">
              {ALL_RECOGNIZED_LANGUAGES.find((l) => l.code === language)?.label} ({language.toUpperCase()}) Active
            </span>
            <span className="text-xs font-mono text-charcoal-muted hidden sm:inline">
              {t('gnaniVoicePowered')}
            </span>
          </div>
        </div>

        {/* Search bar for quick language finding */}
        <div className="p-3 border-b border-hairline bg-surface/20">
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              placeholder="Search by language, script, or region (e.g., Marathi, বাংলা, Telugu, தமிழ், Urdu)..."
              className="w-full pl-9 pr-8 py-2 bg-surface-white border border-hairline rounded-lg text-xs text-charcoal placeholder-charcoal-muted focus:outline-none focus:border-forest"
            />
            {langSearch && (
              <button
                type="button"
                onClick={() => setLangSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal text-xs cursor-pointer font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list of all 23 recognized languages */}
        <div className="divide-y divide-hairline max-h-[460px] overflow-y-auto">
          {filteredLanguages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`w-full p-4 text-left flex items-start justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-forest-50/50' : 'hover:bg-surface'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-sm text-charcoal">{l.label}</span>
                    <span className="text-xs font-semibold text-charcoal-muted">({l.name})</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface border border-hairline text-charcoal-muted">
                      {l.script}
                    </span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-forest-50 text-forest text-[11px]">
                      {l.bcp47}
                    </span>
                  </div>
                  <div className="text-xs text-forest font-medium">"{l.greeting}"</div>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {l.description}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 mt-1 rounded-full flex items-center justify-center shrink-0 border transition-all ${
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

          {filteredLanguages.length === 0 && (
            <div className="p-8 text-center text-xs text-charcoal-muted">
              No recognized language matching &quot;{langSearch}&quot;.
            </div>
          )}
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
          <span className="text-xs text-charcoal-muted font-mono">
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

      {/* Group 3: Regional Voice Synthesis */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Regional Voice Synthesis
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-forest-50 text-forest border border-forest/20">
            {health?.services.gnaniTimbreTts?.status === 'CONNECTED' ? 'LIVE AUDIO' : 'STANDARD'}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-xs uppercase font-semibold text-charcoal-subtle">Hindi Voice</div>
              <div className="font-bold text-charcoal text-sm">Nalini (नलिनि)</div>
              <div className="text-xs text-charcoal-muted font-mono">Model: timbre-v2.5</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-xs uppercase font-semibold text-charcoal-subtle">Punjabi Voice</div>
              <div className="font-bold text-charcoal text-sm">Nalini (ਨਲਿਨੀ)</div>
              <div className="text-xs text-charcoal-muted font-mono">Model: timbre-v2.5</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-xs uppercase font-semibold text-charcoal-subtle">Indian English</div>
              <div className="font-bold text-charcoal text-sm">Kaveri</div>
              <div className="text-xs text-charcoal-muted font-mono">Model: timbre-v2.5</div>
            </div>
          </div>
          <p className="text-xs text-charcoal-muted leading-relaxed">
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
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
            isOnline ? 'bg-forest-50 text-forest border border-forest/20' : 'bg-amber-100 text-amber-900'
          }`}>
            {isOnline ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-charcoal">IndexedDB Structured Price Cache</div>
            <p className="text-charcoal-muted text-xs mt-0.5 leading-relaxed">
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

      {/* Group 5: System Architecture & Verification */}
      <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-hairline bg-surface/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-forest" />
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              {t('systemArchitecturePreview')}
            </h2>
          </div>
          <span className="text-xs font-mono text-charcoal-muted">
            v{health?.version || '1.0.0-RC1'}
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
            <div className="font-bold text-forest">Backend Platform</div>
            <div className="text-charcoal text-xs">Java 21 • Spring Boot 3.3.5</div>
            <p className="text-xs text-charcoal-muted">Spring Data JPA, Hibernate, Actuator Health</p>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
            <div className="font-bold text-forest">Database Architecture</div>
            <div className="text-charcoal text-xs">PostgreSQL 16 • Flyway V1–V4</div>
            <p className="text-xs text-charcoal-muted">Strict composite unique constraints on auction dates</p>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
            <div className="font-bold text-forest">Data Source Grounding</div>
            <div className="text-charcoal text-xs">Agmarknet / data.gov.in</div>
            <p className="text-xs text-charcoal-muted">Nightly @Scheduled cron at 19:00 IST</p>
          </div>
        </div>
      </section>
    </div>
  );
};
