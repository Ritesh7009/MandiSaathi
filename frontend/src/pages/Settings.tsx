import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../types';
import {
  Sliders,
  Globe,
  Type,
  Check,
  Server,
  Layers,
  Database,
  Radio,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();

  const supportedLanguages: {
    code: Language;
    label: string;
    script: string;
    greeting: string;
    description: string;
  }[] = [
    {
      code: 'hi',
      label: 'हिन्दी',
      script: 'Devanagari',
      greeting: 'राम राम, किसान साथी',
      description: 'उत्तर एवं मध्य भारत के किसानों के लिए पूर्ण समर्थन',
    },
    {
      code: 'pa',
      label: 'ਪੰਜਾਬੀ',
      script: 'Gurmukhi',
      greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਸਾਥੀ',
      description: 'ਪੰਜਾਬ ਅਤੇ ਹਰਿਆਣਾ ਦੇ ਮੰਡੀ ਕਿਸਾਨਾਂ ਲਈ ਵਿਸ਼ੇਸ਼ ਸਹਾਇਤਾ',
    },
    {
      code: 'en',
      label: 'English',
      script: 'Latin / Inter',
      greeting: 'Welcome, Farmer Partner',
      description: 'Pan-India technical and agricultural market interface',
    },
  ];

  const upcomingLanguages = [
    { name: 'मराठी (Marathi)', script: 'Devanagari', region: 'Maharashtra APMC' },
    { name: 'ગુજરાતી (Gujarati)', script: 'Gujarati', region: 'Saurashtra / Gujarat Mandis' },
    { name: 'తెలుగు (Telugu)', script: 'Telugu', region: 'Andhra Pradesh & Telangana' },
    { name: 'বাংলা (Bengali)', script: 'Bengali', region: 'West Bengal' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Header */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4 text-harvest-dark" />
              <span>{t('settingsTitle')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
              {t('settingsTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1 max-w-2xl">
              {t('settingsSubtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-ivory border border-ivory-dark px-3 py-1.5 rounded text-charcoal-muted self-start sm:self-center">
            <Globe className="w-4 h-4 text-forest" />
            <span>Multilingual Engine v2.0</span>
          </div>
        </div>
      </div>

      {/* Language Selection Grid */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle space-y-4">
        <div>
          <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
            <Globe className="w-4 h-4 text-forest" />
            <span>{t('languageSectionTitle')}</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-1">
            {t('languageDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {supportedLanguages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`p-4 rounded-md text-left border transition-all relative ${
                  isSelected
                    ? 'border-forest bg-forest/5 ring-2 ring-forest/20 shadow-xs'
                    : 'border-ivory-dark bg-white hover:bg-ivory/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-base text-charcoal">{l.label}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      isSelected
                        ? 'bg-forest text-white border-forest'
                        : 'border-charcoal/20 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="text-xs font-medium text-forest-dark mb-1 font-hindi">
                  &quot;{l.greeting}&quot;
                </div>

                <p className="text-[11px] text-charcoal-muted leading-relaxed">
                  {l.description}
                </p>

                <div className="mt-3 pt-2 border-t border-ivory-dark/60 flex items-center justify-between text-[10px] text-charcoal-muted font-mono">
                  <span>Script: {l.script}</span>
                  {isSelected && (
                    <span className="font-bold text-forest uppercase tracking-wider">
                      Active Dialect
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Future Expansion Architecture Notice */}
        <div className="mt-4 pt-4 border-t border-ivory-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Multilingual Expansion Roadmap (Phase 3 Prep)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ivory border border-ivory-dark text-charcoal-muted">
              Gnani Prisma Indic Pack
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {upcomingLanguages.map((u) => (
              <div
                key={u.name}
                className="p-2.5 rounded border border-dashed border-ivory-dark bg-ivory/30 text-xs"
              >
                <div className="font-semibold text-charcoal-muted">{u.name}</div>
                <div className="text-[10px] text-charcoal-muted/80 mt-0.5">{u.region}</div>
                <span className="inline-block mt-2 text-[9px] font-semibold text-harvest-dark uppercase tracking-wider">
                  Queued for Pipeline
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accessibility: Font Sizing & High Contrast */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle space-y-4">
        <div>
          <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
            <Type className="w-4 h-4 text-forest" />
            <span>{t('fontSizeTitle')}</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-1">
            {t('fontSizeDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Normal Size */}
          <button
            type="button"
            onClick={() => setFontSize('normal')}
            className={`p-4 rounded-md text-left border transition-all ${
              fontSize === 'normal'
                ? 'border-forest bg-forest/5 ring-2 ring-forest/20 shadow-xs'
                : 'border-ivory-dark bg-white hover:bg-ivory/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-charcoal">{t('fontNormal')}</span>
              {fontSize === 'normal' && (
                <div className="w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Standard body text size (14px/16px) optimized for desktop and high-density mobile screens.
            </p>
            <div className="mt-3 p-2 bg-ivory rounded text-xs text-charcoal">
              गेहूं: ₹2,450 / क्विंटल (खन्ना मंडी)
            </div>
          </button>

          {/* Large Size */}
          <button
            type="button"
            onClick={() => setFontSize('large')}
            className={`p-4 rounded-md text-left border transition-all ${
              fontSize === 'large'
                ? 'border-forest bg-forest/5 ring-2 ring-forest/20 shadow-xs'
                : 'border-ivory-dark bg-white hover:bg-ivory/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-base text-charcoal">{t('fontLarge')}</span>
              {fontSize === 'large' && (
                <div className="w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-sm text-charcoal-muted leading-relaxed">
              High-visibility enlarged text (+2px) designed for outdoor use under bright sunlight.
            </p>
            <div className="mt-3 p-2 bg-ivory rounded text-sm font-semibold text-charcoal">
              गेहूं: ₹2,450 / क्विंटल (खन्ना मंडी)
            </div>
          </button>
        </div>
      </div>

      {/* System Architecture & Provenance Governance (Mandatory Engineering Rule) */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle space-y-4">
        <div>
          <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
            <Layers className="w-4 h-4 text-forest" />
            <span>{t('systemArchitecturePreview')}</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-1">
            Enterprise agritech architecture ensuring zero frontend secrets, verified government telemetry, and transparent AI boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* AI Voice Stack */}
          <div className="p-3.5 rounded bg-ivory/40 border border-ivory-dark space-y-2">
            <div className="flex items-center space-x-2 font-bold text-forest">
              <Radio className="w-4 h-4 text-harvest-dark" />
              <span>Gnani AI Gateway</span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Prisma v2.5 STT & Timbre v2.5 TTS operating behind server-side Spring Boot abstractions. No vendor API keys exposed to browser clients.
            </p>
            <div className="text-[10px] font-mono text-forest bg-white px-2 py-0.5 rounded border border-ivory-dark inline-block">
              Dialect Boundary Protected
            </div>
          </div>

          {/* Data Provenance */}
          <div className="p-3.5 rounded bg-ivory/40 border border-ivory-dark space-y-2">
            <div className="flex items-center space-x-2 font-bold text-forest">
              <Database className="w-4 h-4 text-harvest-dark" />
              <span>Agmarknet Provenance</span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              All market prices, modal rates, and daily arrivals originate strictly from verified APMC market committee auctions. Zero fake or simulated live bids.
            </p>
            <div className="text-[10px] font-mono text-forest bg-white px-2 py-0.5 rounded border border-ivory-dark inline-block">
              Rule 2 Compliant
            </div>
          </div>

          {/* Infrastructure */}
          <div className="p-3.5 rounded bg-ivory/40 border border-ivory-dark space-y-2">
            <div className="flex items-center space-x-2 font-bold text-forest">
              <Server className="w-4 h-4 text-harvest-dark" />
              <span>Production Stack</span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Java 21, Spring Boot 3.3.5, PostgreSQL 16 with Flyway schema versioning, React 19, TypeScript strict mode, and Docker containerization.
            </p>
            <div className="text-[10px] font-mono text-forest bg-white px-2 py-0.5 rounded border border-ivory-dark inline-block">
              Flyway V2__phase2_schema
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
