import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { useToast } from '@astryxdesign/core/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { getCachedPrices, clearOfflineCache } from '../services/offlineStorage';
import { GovernmentSchemes } from './GovernmentSchemes';
import { ComplaintRegistration } from './ComplaintRegistration';
import { Settings } from './Settings';
import { TransitionPanel, GsapStaggerGrid } from '../components/ui/MotionPrimitives';
import {
  Bank,
  ClipboardText,
  GearSix,
  Database,
  ShieldCheck,
  CaretRight,
  ArrowLeft,
  Trash,
  WifiHigh,
  WifiSlash,
  Cpu,
  Microphone,
  HardDrives,
} from '@phosphor-icons/react';

export type MoreTab = 'schemes' | 'complaints' | 'settings' | 'offline' | 'about';

interface MoreProps {
  defaultTab?: MoreTab;
}

export const More: React.FC<MoreProps> = ({ defaultTab }) => {
  const { language, t } = useLanguage();
  const { isOnline } = useNetwork();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as MoreTab | null;
  const activeTab: MoreTab | null = tabParam || defaultTab || null;

  const [cachedCount, setCachedCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isCacheStale, setIsCacheStale] = useState<boolean>(false);

  const refreshCacheStats = () => {
    getCachedPrices()
      .then((res) => {
        setCachedCount(res.records.length);
        setLastSyncedAt(res.lastSyncedAt);
        setIsCacheStale(res.isStale);
      })
      .catch(() => {
        setCachedCount(0);
      });
  };

  useEffect(() => {
    refreshCacheStats();
  }, [activeTab]);

  const setTab = (tab: MoreTab | null) => {
    if (tab) {
      setSearchParams({ tab });
    } else {
      setSearchParams({});
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copy = useMemo(() => {
    if (language === 'hi') {
      return {
        eyebrow: '06 · किसान सेवा केंद्र एवं निदान',
        hubBadge: 'किसान सेवा निर्देशिका',
        hubSubtitle: 'सरकारी कल्याणकारी योजनाएं, मंडी समस्या रिकॉर्ड, भाषा सुगमता एवं ऑफ़लाइन डेटा प्रबंधन',
        farmerServicesHeading: 'प्रमुख किसान सेवाएं',
        systemSectionHeading: 'सिस्टम एवं स्थानीय स्टोरेज',
        backToMore: 'सभी सेवाओं पर वापस जाएं',
        offlineStatsTitle: 'स्थानीय IndexedDB कैशे विवरण',
        offlineRecordsLabel: 'सहेजे गए मंडी भाव रिकॉर्ड',
        offlineLastSyncLabel: 'अंतिम सिंक्रनाइज़ेशन',
        offlineNeverSynced: 'अभी तक सिंक नहीं हुआ',
        offlineStatusLabel: 'नेटवर्क स्थिति',
        offlineStaleLabel: 'कैशे स्थिति (>24 घंटे पुराना)',
        offlineFreshLabel: 'कैशे स्थिति (ताज़ा / मान्य)',
        offlineClearBtn: 'स्थानीय कैशे साफ़ करें',
        offlineClearedMsg: 'स्थानीय ऑफ़लाइन कैशे सफलतापूर्वक साफ़ हो गया।',
        offlineNote:
          'मंडी साथी बिना इंटरनेट वाले ग्रामीण क्षेत्रों में भी आपके फ़ोन में सहेजे गए मंडी भाव दिखाने के लिए IndexedDB (mandisaathi_offline_db) का उपयोग करता है।',
        aboutVoiceTitle: 'ज्ञानि एआई (Gnani Prisma STT + Timbre TTS)',
        aboutVoiceDesc:
          '10 भारतीय भाषाओं में सीधे आवाज़ द्वारा मंडी भाव पूछताछ और ऑडियो उत्तर।',
        aboutDataTitle: 'डेटा सत्यता व पारदर्शिता',
        aboutDataDesc:
          'प्रत्येक भाव रिकॉर्ड एगमार्कनेट (LIVE_INGESTED) या आधारभूत संदर्भ (SEEDED_BASELINE) के रूप में स्पष्ट टैग के साथ प्रदर्शित किया जाता है। कोई भी नकली दर नहीं बनाई जाती।',
        aboutSecurityTitle: 'सुरक्षा व गोपनीयता मानक',
        aboutSecurityDesc:
          'PostgreSQL 16 (Flyway V1-V7), SHA-256 हैश्ड शिकायत ट्रैकिंग टोकन (X-Tracking-Token) और प्रॉक्सी-सत्यापित दर सीमा सुरक्षा।',
      };
    }
    if (language === 'pa') {
      return {
        eyebrow: '06 · ਕਿਸਾਨ ਸੇਵਾ ਡਾਇਰੈਕਟਰੀ',
        hubBadge: 'ਕਿਸਾਨ ਸੇਵਾ ਡਾਇਰੈਕਟਰੀ',
        hubSubtitle: 'ਸਰਕਾਰੀ ਭਲਾਈ ਸਕੀਮਾਂ, ਮੰਡੀ ਸਮੱਸਿਆ ਰਿਕਾਰਡ, ਭਾਸ਼ਾ ਸੁਗਮਤਾ ਅਤੇ ਆਫ਼ਲਾਈਨ ਡੇਟਾ ਪ੍ਰਬੰਧਨ',
        farmerServicesHeading: 'ਮੁੱਖ ਕਿਸਾਨ ਸੇਵਾਵਾਂ',
        systemSectionHeading: 'ਸਿਸਟਮ ਅਤੇ ਲੋਕਲ ਸਟੋਰੇਜ',
        backToMore: 'ਸਾਰੀਆਂ ਸੇਵਾਵਾਂ ਤੇ ਵਾਪਸ ਜਾਓ',
        offlineStatsTitle: 'ਲੋਕਲ IndexedDB ਕੈਸ਼ ਵੇਰਵਾ',
        offlineRecordsLabel: 'ਸੰਭਾਲੇ ਗਏ ਮੰਡੀ ਭਾਅ ਰਿਕਾਰਡ',
        offlineLastSyncLabel: 'ਆਖ਼ਰੀ ਸਿੰਕ',
        offlineNeverSynced: 'ਅਜੇ ਤੱਕ ਸਿੰਕ ਨਹੀਂ ਹੋਇਆ',
        offlineStatusLabel: 'ਨੈੱਟਵਰਕ ਸਥਿਤੀ',
        offlineStaleLabel: 'ਕੈਸ਼ ਸਥਿਤੀ (>24 ਘੰਟੇ ਪੁਰਾਣਾ)',
        offlineFreshLabel: 'ਕੈਸ਼ ਸਥਿਤੀ (ਤਾਜ਼ਾ / ਵੈਧ)',
        offlineClearBtn: 'ਲੋਕਲ ਕੈਸ਼ ਸਾਫ਼ ਕਰੋ',
        offlineClearedMsg: 'ਲੋਕਲ ਆਫ਼ਲਾਈਨ ਕੈਸ਼ ਸਫਲਤਾਪੂਰਵਕ ਸਾਫ਼ ਹੋ ਗਿਆ।',
        offlineNote:
          'ਮੰਡੀ ਸਾਥੀ ਘੱਟ ਨੈੱਟਵਰਕ ਵਾਲੇ ਪੇਂਡੂ ਖੇਤਰਾਂ ਵਿੱਚ ਵੀ ਪਹਿਲਾਂ ਸੰਭਾਲੇ ਮੰਡੀ ਭਾਅ ਦਿਖਾਉਣ ਲਈ IndexedDB (mandisaathi_offline_db) ਦੀ ਵਰਤੋਂ ਕਰਦਾ ਹੈ।',
        aboutVoiceTitle: 'ਗਿਆਨੀ ਏਆਈ (Gnani Prisma STT + Timbre TTS)',
        aboutVoiceDesc:
          '10 ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਬੋਲ ਕੇ ਮੰਡੀ ਭਾਅ ਪੁੱਛਗਿੱਛ ਅਤੇ ਆਡੀਓ ਜਵਾਬ।',
        aboutDataTitle: 'ਡੇਟਾ ਸਚਾਈ ਅਤੇ ਪਾਰਦਰਸ਼ਤਾ',
        aboutDataDesc:
          'ਹਰ ਭਾਅ ਰਿਕਾਰਡ LIVE_INGESTED (Agmarknet) ਜਾਂ SEEDED_BASELINE ਵਜੋਂ ਸਪਸ਼ਟ ਟੈਗ ਕੀਤਾ ਜਾਂਦਾ ਹੈ। ਕੋਈ ਵੀ ਨਕਲੀ ਰੇਟ ਨਹੀਂ ਬਣਾਇਆ ਜਾਂਦਾ।',
        aboutSecurityTitle: 'ਸੁਰੱਖਿਆ ਅਤੇ ਗੋਪਨੀਯਤਾ ਮਾਪਦੰਡ',
        aboutSecurityDesc:
          'PostgreSQL 16 (Flyway V1-V7), SHA-256 ਹੈਸ਼ਡ ਸ਼ਿਕਾਇਤ ਟਰੈਕਿੰਗ ਟੋਕਨ (X-Tracking-Token) ਅਤੇ ਪ੍ਰੌਕਸੀ-ਪ੍ਰਮਾਣਿਤ ਦਰ ਸੀਮਾ।',
      };
    }
    return {
      eyebrow: '06 · SERVICE DIRECTORY & DIAGNOSTICS',
      hubBadge: 'Farmer Utility Hub',
      hubSubtitle: 'Welfare subsidies, grievance ledger, dialect & theme accessibility, and offline storage',
      farmerServicesHeading: 'Farmer Services',
      systemSectionHeading: 'System & Diagnostics',
      backToMore: 'Back to More Services',
      offlineStatsTitle: 'Local IndexedDB Cache Inspector',
      offlineRecordsLabel: 'Cached Mandi Rate Records',
      offlineLastSyncLabel: 'Last Synchronized',
      offlineNeverSynced: 'Not synced yet',
      offlineStatusLabel: 'Network Status',
      offlineStaleLabel: 'Cache Freshness (>24 hrs stale)',
      offlineFreshLabel: 'Cache Freshness (Fresh / Valid)',
      offlineClearBtn: 'Clear Local Cache',
      offlineClearedMsg: 'Local IndexedDB cache cleared successfully.',
      offlineNote:
        'MandiSaathi stores recently fetched mandi auction rates locally in IndexedDB (mandisaathi_offline_db) so core price charts remain readable during field connectivity drops.',
      aboutVoiceTitle: 'Gnani AI Voice Pipeline (Prisma STT + Timbre TTS)',
      aboutVoiceDesc:
        'Multilingual speech-to-text recognition and natural regional voice synthesis across 10 recognized Indian languages.',
      aboutDataTitle: 'Data Provenance Integrity',
      aboutDataDesc:
        'Every displayed rate preserves strict provenance metadata (LIVE_INGESTED vs SEEDED_BASELINE) and matches identical normalized variety and auction dates before comparisons.',
      aboutSecurityTitle: 'Production Security Architecture',
      aboutSecurityDesc:
        'PostgreSQL 16 schema managed by Flyway (V1 to V7), SHA-256 X-Tracking-Token grievance lookups, and trusted-proxy rate limiting.',
    };
  }, [language]);

  const handleClearCache = async () => {
    try {
      await clearOfflineCache();
      setCachedCount(0);
      setLastSyncedAt(null);
      setIsCacheStale(false);
      showToast({ body: copy.offlineClearedMsg, type: 'info' });
    } catch {
      // Ignore IndexedDB unavailability cleanly
    }
  };

  const primaryServices: {
    id: MoreTab;
    title: string;
    badge: string;
    subtitle: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'schemes',
      title: t('navSchemes'),
      badge: t('moreSchemesBadge'),
      subtitle: t('moreSchemesSubtitle'),
      icon: Bank,
    },
    {
      id: 'complaints',
      title: t('navComplaints'),
      badge: t('moreComplaintsBadge'),
      subtitle: t('moreComplaintsSubtitle'),
      icon: ClipboardText,
    },
    {
      id: 'settings',
      title: t('navSettings'),
      badge: t('moreSettingsBadge'),
      subtitle: t('moreSettingsSubtitle'),
      icon: GearSix,
    },
  ];

  const systemServices: {
    id: MoreTab;
    title: string;
    badge: string;
    subtitle: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'offline',
      title: t('moreOfflineTitle'),
      badge: t('moreOfflineBadge'),
      subtitle: t('moreOfflineSubtitle'),
      icon: Database,
    },
    {
      id: 'about',
      title: t('moreAboutTitle'),
      badge: t('moreAboutBadge'),
      subtitle: t('moreAboutSubtitle'),
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <TransitionPanel activeKey={activeTab || 'directory'}>
        {activeTab ? (
          <div className="space-y-5">
            <Button
              label={copy.backToMore}
              variant="secondary"
              size="md"
              icon={<ArrowLeft weight="bold" className="w-4 h-4" />}
              onClick={() => setTab(null)}
            />

            {activeTab === 'schemes' && <GovernmentSchemes />}
            {activeTab === 'complaints' && <ComplaintRegistration />}
            {activeTab === 'settings' && <Settings />}

            {activeTab === 'offline' && (
              <div className="space-y-6">
                <Card padding={6} className="bg-surface">
                  <div className="space-y-2.5">
                    <Badge
                      variant="info"
                      icon={<Database weight="duotone" className="w-3.5 h-3.5" />}
                      label={t('moreOfflineBadge')}
                    />
                    <h1 className="font-display font-semibold text-2xl text-ink tracking-tight">
                      {t('moreOfflineTitle')}
                    </h1>
                    <p className="text-sm text-ink-muted leading-relaxed">{copy.offlineNote}</p>
                  </div>
                </Card>

                <Card padding={6} className="bg-surface">
                  <div className="space-y-5">
                    <h2 className="font-display font-semibold text-base text-ink">
                      {copy.offlineStatsTitle}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-line py-4">
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                          {copy.offlineRecordsLabel}
                        </span>
                        <span className="font-mono tnum text-2xl font-semibold text-ink">
                          {cachedCount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                          {copy.offlineStatusLabel}
                        </span>
                        <Badge
                          variant={isOnline ? 'success' : 'warning'}
                          icon={
                            isOnline ? (
                              <WifiHigh weight="bold" className="w-3.5 h-3.5" />
                            ) : (
                              <WifiSlash weight="bold" className="w-3.5 h-3.5" />
                            )
                          }
                          label={isOnline ? t('connected') : t('offline')}
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
                          {copy.offlineLastSyncLabel}
                        </span>
                        <span className="font-mono text-xs font-medium text-ink block">
                          {lastSyncedAt
                            ? new Date(lastSyncedAt).toLocaleString()
                            : copy.offlineNeverSynced}
                        </span>
                        {cachedCount > 0 && (
                          <span className="text-[10px] text-ink-muted block">
                            {isCacheStale ? copy.offlineStaleLabel : copy.offlineFreshLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        label={copy.offlineClearBtn}
                        variant="destructive"
                        size="lg"
                        icon={<Trash weight="duotone" className="w-4 h-4" />}
                        isDisabled={cachedCount === 0}
                        onClick={handleClearCache}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <Card padding={6} className="bg-surface">
                  <div className="space-y-2.5">
                    <Badge
                      variant="success"
                      icon={<ShieldCheck weight="duotone" className="w-3.5 h-3.5" />}
                      label={t('moreAboutBadge')}
                    />
                    <h1 className="font-display font-semibold text-2xl text-ink tracking-tight">
                      {t('moreAboutTitle')}
                    </h1>
                    <p className="text-sm text-ink-muted leading-relaxed">{t('moreAboutSubtitle')}</p>
                  </div>
                </Card>

                <GsapStaggerGrid depKey="about" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card padding={5} className="gs-stagger-item bg-surface">
                    <div className="space-y-2.5">
                      <div className="w-10 h-10 rounded-xl bg-canopy-soft text-canopy dark:text-canopy-bright flex items-center justify-center">
                        <Microphone weight="duotone" className="w-5 h-5" />
                      </div>
                      <h2 className="font-display font-semibold text-sm text-ink">
                        {copy.aboutVoiceTitle}
                      </h2>
                      <p className="text-xs text-ink-muted leading-relaxed">{copy.aboutVoiceDesc}</p>
                    </div>
                  </Card>

                  <Card padding={5} className="gs-stagger-item bg-surface">
                    <div className="space-y-2.5">
                      <div className="w-10 h-10 rounded-xl bg-saffron-soft text-saffron-text flex items-center justify-center">
                        <HardDrives weight="duotone" className="w-5 h-5" />
                      </div>
                      <h2 className="font-display font-semibold text-sm text-ink">
                        {copy.aboutDataTitle}
                      </h2>
                      <p className="text-xs text-ink-muted leading-relaxed">{copy.aboutDataDesc}</p>
                    </div>
                  </Card>

                  <Card padding={5} className="gs-stagger-item bg-surface">
                    <div className="space-y-2.5">
                      <div className="w-10 h-10 rounded-xl bg-surface-subtle text-ink flex items-center justify-center border border-line">
                        <Cpu weight="duotone" className="w-5 h-5" />
                      </div>
                      <h2 className="font-display font-semibold text-sm text-ink">
                        {copy.aboutSecurityTitle}
                      </h2>
                      <p className="text-xs text-ink-muted leading-relaxed">{copy.aboutSecurityDesc}</p>
                    </div>
                  </Card>
                </GsapStaggerGrid>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Editorial Hub Masthead */}
            <Card padding={6} className="bg-surface">
              <div className="space-y-2.5">
                <div className="flex items-center flex-wrap gap-2">
                  <Badge
                    variant="success"
                    icon={<ShieldCheck weight="duotone" className="w-3.5 h-3.5" />}
                    label={copy.hubBadge}
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                    {copy.eyebrow}
                  </span>
                </div>
                <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight">
                  {t('navMore')}
                </h1>
                <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
                  {copy.hubSubtitle}
                </p>
              </div>
            </Card>

            {/* Primary Farmer Services */}
            <section className="space-y-3">
              <Divider label={copy.farmerServicesHeading} />

              <GsapStaggerGrid depKey="primary-services" className="space-y-3">
                {primaryServices.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <ClickableCard
                      key={sec.id}
                      label={`${sec.title}: ${sec.subtitle}`}
                      padding={5}
                      onClick={() => setTab(sec.id)}
                      className="gs-stagger-item bg-surface"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-canopy-soft border border-canopy/20 flex items-center justify-center shrink-0 text-canopy dark:text-canopy-bright">
                            <Icon weight="duotone" className="w-5 h-5" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-semibold text-sm sm:text-base text-ink">
                                {sec.title}
                              </span>
                              <Badge label={sec.badge} variant="neutral" />
                            </div>
                            <p className="text-xs text-ink-muted leading-relaxed">{sec.subtitle}</p>
                          </div>
                        </div>
                        <CaretRight weight="bold" className="w-4 h-4 text-ink-subtle shrink-0" />
                      </div>
                    </ClickableCard>
                  );
                })}
              </GsapStaggerGrid>
            </section>

            {/* System & Diagnostics */}
            <section className="space-y-3">
              <Divider label={copy.systemSectionHeading} />

              <GsapStaggerGrid depKey="system-services" className="space-y-3">
                {systemServices.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <ClickableCard
                      key={sec.id}
                      label={`${sec.title}: ${sec.subtitle}`}
                      padding={5}
                      onClick={() => setTab(sec.id)}
                      className="gs-stagger-item bg-surface"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-surface-subtle border border-line flex items-center justify-center shrink-0 text-ink-muted">
                            <Icon weight="duotone" className="w-5 h-5" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-semibold text-sm sm:text-base text-ink">
                                {sec.title}
                              </span>
                              <Badge label={sec.badge} variant="neutral" />
                            </div>
                            <p className="text-xs text-ink-muted leading-relaxed">{sec.subtitle}</p>
                          </div>
                        </div>
                        <CaretRight weight="bold" className="w-4 h-4 text-ink-subtle shrink-0" />
                      </div>
                    </ClickableCard>
                  );
                })}
              </GsapStaggerGrid>
            </section>

            {/* Institutional Provenance Banner */}
            <Banner status="info" collapsible={false} title={t('marketBriefText')} />
          </div>
        )}
      </TransitionPanel>
    </div>
  );
};
