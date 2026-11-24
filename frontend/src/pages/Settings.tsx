import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { useToast } from '@astryxdesign/core/Toast';
import { useLanguage, ALL_RECOGNIZED_LANGUAGES } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { api } from '../services/apiClient';
import { getCachedPrices, clearOfflineCache } from '../services/offlineStorage';
import {
  GearSix,
  Globe,
  MagnifyingGlass,
  TextAa,
  Sun,
  Moon,
  SpeakerHigh,
  Database,
  Trash,
  Check,
  Cpu,
  ShieldCheck,
  WifiHigh,
  WifiSlash,
} from '@phosphor-icons/react';

export const Settings: React.FC = () => {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isOnline } = useNetwork();
  const showToast = useToast();

  const [langSearch, setLangSearch] = useState<string>('');
  const [cachedCount, setCachedCount] = useState<number>(0);

  const { data: health } = useQuery({
    queryKey: ['systemHealthSettings'],
    queryFn: () => api.checkHealth(),
    staleTime: 60000,
    enabled: isOnline,
  });

  useEffect(() => {
    getCachedPrices()
      .then((res) => setCachedCount(res.records.length))
      .catch(() => setCachedCount(0));
  }, []);

  const filteredLanguages = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return ALL_RECOGNIZED_LANGUAGES;
    return ALL_RECOGNIZED_LANGUAGES.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.script.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [langSearch]);

  const activeLangMeta =
    ALL_RECOGNIZED_LANGUAGES.find((l) => l.code === language) || ALL_RECOGNIZED_LANGUAGES[0];

  const handleClearCache = async () => {
    try {
      await clearOfflineCache();
      setCachedCount(0);
      showToast({ body: copy.cacheClearedMsg, type: 'info' });
    } catch {
      // Ignore storage errors gracefully
    }
  };

  const copy = useMemo(() => {
    if (language === 'hi') {
      return {
        eyebrow: '07 · पहुंच और क्षेत्रीय विन्यास',
        searchLangPlaceholder: 'भाषा, लिपि या क्षेत्र खोजें (उदा. हिन्दी, ਪੰਜਾਬੀ, Tamil)...',
        themeTitle: 'रंग और थीम (Color Mode)',
        themeDesc: 'तेज़ धूप में स्पष्ट पढ़ने के लिए लाइट मोड या रात में आंखों की सुरक्षा के लिए डार्क मोड चुनें।',
        themeLightTitle: 'मिनरल डेलाइट (Light)',
        themeLightDesc: 'धूप में उच्च कंट्रास्ट और उजला कृषि इंटरफ़ेस',
        themeDarkTitle: 'ऑब्सीडियन ऑब्ज़र्वेटरी (Dark)',
        themeDarkDesc: 'कम रोशनी में आंखों के लिए आरामदायक गहरा मोड',
        voiceEngineTitle: 'ज्ञानि एआई वाक् संश्लेषण (TTS)',
        voiceEngineDesc: 'चयनित भाषा के अनुसार सर्वर से प्राकृतिक आवाज़ में भाव रिपोर्ट।',
        offlineStorageTitle: 'ऑफ़लाइन डेटा और IndexedDB कैशे',
        offlineRecordsSaved: 'स्थानीय रूप से सहेजे गए रिकॉर्ड',
        clearCacheBtn: 'कैशे साफ़ करें',
        cacheClearedMsg: 'स्थानीय मंडी कैशे साफ़ किया गया।',
        archStackTitle: 'तकनीकी स्टैक एवं डेटा सुरक्षा मानक',
      };
    }
    if (language === 'pa') {
      return {
        eyebrow: '07 · ਪਹੁੰਚ ਅਤੇ ਖੇਤਰੀ ਸੈਟਿੰਗਾਂ',
        searchLangPlaceholder: 'ਭਾਸ਼ਾ, ਲਿਪੀ ਜਾਂ ਖੇਤਰ ਖੋਜੋ (ਜਿਵੇਂ ਪੰਜਾਬੀ, हिन्दी, Tamil)...',
        themeTitle: 'ਰੰਗ ਅਤੇ ਥੀਮ (Color Mode)',
        themeDesc: 'ਧੁੱਪ ਵਿੱਚ ਸਪਸ਼ਟ ਪੜ੍ਹਨ ਲਈ ਲਾਈਟ ਮੋਡ ਜਾਂ ਰਾਤ ਨੂੰ ਅੱਖਾਂ ਦੇ ਆਰਾਮ ਲਈ ਡਾਰਕ ਮੋਡ ਚੁਣੋ।',
        themeLightTitle: 'ਮਿਨਰਲ ਡੇਲਾਈਟ (Light)',
        themeLightDesc: 'ਧੁੱਪ ਵਿੱਚ ਉੱਚ ਕੰਟ੍ਰਾਸਟ ਅਤੇ ਸਾਫ਼ ਇੰਟਰਫੇਸ',
        themeDarkTitle: 'ਓਬਸੀਡੀਅਨ ਡਾਰਕ (Dark)',
        themeDarkDesc: 'ਘੱਟ ਰੋਸ਼ਨੀ ਵਿੱਚ ਅੱਖਾਂ ਲਈ ਆਰਾਮਦਾਇਕ ਮੋਡ',
        voiceEngineTitle: 'ਗਿਆਨੀ ਏਆਈ ਵਾਇਸ ਆਉਟਪੁੱਟ (TTS)',
        voiceEngineDesc: 'ਚੁਣੀ ਭਾਸ਼ਾ ਅਨੁਸਾਰ ਸਰਵਰ ਤੋਂ ਕੁਦਰਤੀ ਆਵਾਜ਼ ਵਿੱਚ ਭਾਅ ਰਿਪੋਰਟ।',
        offlineStorageTitle: 'ਆਫ਼ਲਾਈਨ ਡੇਟਾ ਅਤੇ IndexedDB ਕੈਸ਼',
        offlineRecordsSaved: 'ਲੋਕਲ ਸੰਭਾਲੇ ਰਿਕਾਰਡ',
        clearCacheBtn: 'ਕੈਸ਼ ਸਾਫ਼ ਕਰੋ',
        cacheClearedMsg: 'ਲੋਕਲ ਮੰਡੀ ਕੈਸ਼ ਸਾਫ਼ ਹੋ ਗਿਆ।',
        archStackTitle: 'ਤਕਨੀਕੀ ਸਟੈਕ ਅਤੇ ਡੇਟਾ ਸੁਰੱਖਿਆ ਮਾਪਦੰਡ',
      };
    }
    return {
      eyebrow: '07 · ACCESSIBILITY & DIALECT CALIBRATION',
      searchLangPlaceholder: 'Search language, script, or region (e.g. Hindi, ਪੰਜਾਬੀ, Tamil)...',
      themeTitle: 'Appearance & Theme Mode',
      themeDesc: 'Switch between high-contrast Mineral Daylight for sunny field viewing or Obsidian Dark for low-light environments.',
      themeLightTitle: 'Mineral Daylight (Light)',
      themeLightDesc: 'High outdoor contrast emerald palette',
      themeDarkTitle: 'Obsidian Observatory (Dark)',
      themeDarkDesc: 'Low-glare dark canopy palette',
      voiceEngineTitle: 'Gnani Voice Profile (Prisma STT + Timbre TTS)',
      voiceEngineDesc: 'Active server voice pipeline paired with your selected regional dialect.',
      offlineStorageTitle: 'Offline IndexedDB Cache Storage',
      offlineRecordsSaved: 'Locally cached market records',
      clearCacheBtn: 'Clear Cache',
      cacheClearedMsg: 'Local IndexedDB cache cleared.',
      archStackTitle: 'Platform Stack & Governance',
    };
  }, [language]);

  return (
    <div className="space-y-6 pb-8">
      {/* Editorial Masthead */}
      <Card padding={6} className="bg-surface">
        <div className="space-y-2.5">
          <div className="flex items-center flex-wrap gap-2">
            <Badge
              variant="success"
              icon={<GearSix weight="duotone" className="w-3.5 h-3.5" />}
              label={t('preferencesAndDisplay')}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              {copy.eyebrow}
            </span>
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('settingsTitle')}
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">{t('settingsSubtitle')}</p>
        </div>
      </Card>

      {/* Theme Mode & Font Size Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding={5} className="bg-surface">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-canopy-soft text-canopy dark:text-canopy-bright shrink-0">
                {theme === 'dark' ? (
                  <Moon weight="duotone" className="w-5 h-5" />
                ) : (
                  <Sun weight="duotone" className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="font-display font-semibold text-base text-ink">{copy.themeTitle}</h2>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{copy.themeDesc}</p>
              </div>
            </div>

            <SegmentedControl
              value={theme}
              onChange={(val) => setTheme(val === 'dark' ? 'dark' : 'light')}
              label={copy.themeTitle}
              size="lg"
              layout="fill"
            >
              <SegmentedControlItem
                value="light"
                label={copy.themeLightTitle}
                icon={<Sun weight={theme === 'light' ? 'fill' : 'regular'} className="w-4 h-4" />}
              />
              <SegmentedControlItem
                value="dark"
                label={copy.themeDarkTitle}
                icon={<Moon weight={theme === 'dark' ? 'fill' : 'regular'} className="w-4 h-4" />}
              />
            </SegmentedControl>

            <p className="text-[11px] font-mono text-ink-muted px-1">
              {theme === 'light' ? copy.themeLightDesc : copy.themeDarkDesc}
            </p>
          </div>
        </Card>

        <Card padding={5} className="bg-surface">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-saffron-soft text-saffron-text shrink-0">
                <TextAa weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-base text-ink">{t('fontSizeTitle')}</h2>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{t('fontSizeDesc')}</p>
              </div>
            </div>

            <SegmentedControl
              value={fontSize}
              onChange={(val) => setFontSize(val === 'large' ? 'large' : 'normal')}
              label={t('fontSizeTitle')}
              size="lg"
              layout="fill"
            >
              <SegmentedControlItem value="normal" label={t('fontNormal')} />
              <SegmentedControlItem value="large" label={t('fontLarge')} />
            </SegmentedControl>

            <p className="text-[11px] font-mono text-ink-muted px-1">
              {fontSize === 'large' ? 'High-visibility 18px+ Indic scale active' : '16px editorial balanced base scale'}
            </p>
          </div>
        </Card>
      </div>

      {/* Regional Dialect & Language Directory */}
      <Card padding={6} className="bg-surface">
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-canopy-soft text-canopy dark:text-canopy-bright shrink-0">
                <Globe weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-base text-ink">
                  {t('languageSectionTitle')}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{t('languageDesc')}</p>
              </div>
            </div>

            <Badge
              variant="neutral"
              label={`${activeLangMeta?.label ?? language} (${activeLangMeta?.bcp47 ?? 'hi-IN'})`}
            />
          </div>

          <TextInput
            label={t('languageSectionTitle')}
            isLabelHidden
            value={langSearch}
            onChange={setLangSearch}
            placeholder={copy.searchLangPlaceholder}
            startIcon={<MagnifyingGlass weight="bold" className="w-4 h-4" />}
            hasClear
            size="lg"
            width="100%"
          />

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            role="radiogroup"
            aria-label={t('languageSectionTitle')}
          >
            {filteredLanguages.map((item) => {
              const active = language === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLanguage(item.code)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                    active
                      ? 'bg-canopy-soft border-canopy shadow-subtle'
                      : 'bg-surface-subtle/60 border-line hover:border-canopy/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-display font-semibold text-sm text-ink truncate">
                        {item.label}
                      </span>
                      {active && (
                        <Check weight="bold" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright shrink-0" />
                      )}
                    </div>
                    <Badge label={item.bcp47} variant={active ? 'success' : 'neutral'} />
                  </div>
                  <p className="text-xs font-medium text-canopy dark:text-canopy-bright">
                    {item.greeting}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {item.name} · {item.script} · {item.region}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Voice Profile & Offline Storage Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding={5} className="bg-surface">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-canopy-soft text-canopy dark:text-canopy-bright shrink-0">
                <SpeakerHigh weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-base text-ink">
                  {copy.voiceEngineTitle}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                  {copy.voiceEngineDesc}
                </p>
              </div>
            </div>

            <Divider />

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Selected Voice Dialect</span>
                <span className="font-mono font-semibold text-ink">
                  {activeLangMeta?.name ?? 'Hindi'} ({activeLangMeta?.bcp47 ?? 'hi-IN'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Gnani STT / TTS</span>
                <Badge
                  variant={isOnline ? 'success' : 'warning'}
                  icon={
                    isOnline ? (
                      <WifiHigh weight="bold" className="w-3.5 h-3.5" />
                    ) : (
                      <WifiSlash weight="bold" className="w-3.5 h-3.5" />
                    )
                  }
                  label={health?.services?.gnaniVoice?.status || (isOnline ? t('connected') : t('offline'))}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card padding={5} className="bg-surface">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-surface-subtle border border-line text-ink shrink-0">
                  <Database weight="duotone" className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-base text-ink">
                    {copy.offlineStorageTitle}
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {copy.offlineRecordsSaved}:{' '}
                    <span className="font-mono tnum font-semibold text-ink">{cachedCount}</span>
                  </p>
                </div>
              </div>
              <Badge label={`${cachedCount} rows`} variant={cachedCount > 0 ? 'info' : 'neutral'} />
            </div>

            <Button
              label={copy.clearCacheBtn}
              variant="destructive"
              size="lg"
              width="100%"
              icon={<Trash weight="duotone" className="w-4 h-4" />}
              isDisabled={cachedCount === 0}
              onClick={handleClearCache}
            />
          </div>
        </Card>
      </div>

      {/* System Architecture Summary */}
      <Card variant="muted" padding={5}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Cpu weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
            <span>{copy.archStackTitle}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-y border-line py-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                Database &amp; Schema
              </span>
              <span className="font-mono font-semibold text-ink">PostgreSQL 16 (Flyway V1-V7)</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                Application Runtime
              </span>
              <span className="font-mono font-semibold text-ink">Java 21 + Spring Boot 3.3.5</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                Design System
              </span>
              <span className="font-mono font-semibold text-ink">Meta Astryx + React 19 PWA</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <ShieldCheck weight="fill" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
            <span>{t('systemArchitecturePreview')}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
