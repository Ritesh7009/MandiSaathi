import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { GovernmentSchemes } from './GovernmentSchemes';
import { ComplaintRegistration } from './ComplaintRegistration';
import { Settings } from './Settings';
import { getCachedPrices, clearOfflineCache } from '../services/offlineStorage';
import {
  Landmark,
  FileText,
  Sliders,
  Database,
  Info,
  ShieldCheck,
  ChevronRight,
  Trash2,
  Cpu,
  ArrowLeft,
} from 'lucide-react';

interface MoreProps {
  defaultTab?: string;
}

export const More: React.FC<MoreProps> = ({ defaultTab }) => {
  const { language, t } = useLanguage();
  const { isOnline } = useNetwork();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || defaultTab || '';

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

  const setTab = (tabId: string) => {
    if (tabId) {
      setSearchParams({ tab: tabId });
    } else {
      setSearchParams({});
    }
  };

  const farmerServices = [
    {
      id: 'schemes',
      title: t('navSchemes'),
      subtitle: t('moreSchemesSubtitle'),
      icon: Landmark,
      badge: t('moreSchemesBadge'),
    },
    {
      id: 'complaints',
      title: t('complaintsTitle'),
      subtitle: t('moreComplaintsSubtitle'),
      icon: FileText,
      badge: t('moreComplaintsBadge'),
    },
    {
      id: 'settings',
      title: t('navSettings'),
      subtitle: t('moreSettingsSubtitle'),
      icon: Sliders,
      badge: t('moreSettingsBadge'),
    },
  ];

  const systemServices = [
    {
      id: 'offline',
      title: t('moreOfflineTitle'),
      subtitle: t('moreOfflineSubtitle'),
      icon: Database,
      badge: `${cacheCount} ${t('offlineCachedBadge')}`,
    },
    {
      id: 'about',
      title: t('moreAboutTitle'),
      subtitle: t('moreAboutSubtitle'),
      icon: Info,
      badge: t('moreAboutBadge'),
    },
  ];

  // Render Sub-Views
  if (activeTab === 'schemes') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setTab('')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-forest hover:text-forest-dark py-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('navMore')}</span>
        </button>
        <GovernmentSchemes />
      </div>
    );
  }

  if (activeTab === 'complaints') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setTab('')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-forest hover:text-forest-dark py-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('navMore')}</span>
        </button>
        <ComplaintRegistration />
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setTab('')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-forest hover:text-forest-dark py-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('navMore')}</span>
        </button>
        <Settings />
      </div>
    );
  }

  if (activeTab === 'offline') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => setTab('')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-forest hover:text-forest-dark py-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('navMore')}</span>
        </button>

        <section className="rounded-xl border border-hairline bg-surface-white p-6 shadow-subtle space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-hairline">
            <div className="w-9 h-9 rounded-lg bg-forest-50 text-forest flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-charcoal">
                {language === 'hi' ? 'ऑफलाइन डेटा और स्टोरेज स्थिति' : language === 'pa' ? 'ਆਫਲਾਈਨ ਡਾਟਾ ਅਤੇ ਸਟੋਰੇਜ ਸਥਿਤੀ' : 'Offline Cache & Local Storage'}
              </h1>
              <p className="text-xs text-charcoal-muted">
                {language === 'hi' ? 'कम इंटरनेट कनेक्टिविटी में भी मंडियों के भाव सुरक्षित रहते हैं' : language === 'pa' ? 'ਮੰਦੀ ਇੰਟਰਨੈੱਟ ਸਥਿਤੀ ਵਿੱਚ ਵੀ ਰੇਟ ਸੁਰੱਖਿਅਤ ਰਹਿੰਦੇ ਹਨ' : 'IndexedDB client database preserving verified mandi records'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-xl border border-hairline space-y-1">
              <span className="text-xs uppercase font-bold text-charcoal-subtle">Network Status</span>
              <div className="text-base font-bold text-forest flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-forest' : 'bg-amber-600'}`} />
                <span>{isOnline ? 'Online (Connected)' : 'Offline (Field Mode)'}</span>
              </div>
              <p className="text-xs text-charcoal-muted">
                {isOnline ? 'Directly fetching real-time Agmarknet auction filings.' : 'Operating on client-side IndexedDB structured cache.'}
              </p>
            </div>

            <div className="p-4 bg-surface rounded-xl border border-hairline space-y-1">
              <span className="text-xs uppercase font-bold text-charcoal-subtle">IndexedDB Cached Records</span>
              <div className="text-2xl font-bold text-charcoal font-mono tnum">
                {cacheCount} <span className="text-xs font-normal text-charcoal-muted">records stored</span>
              </div>
              <p className="text-xs text-charcoal-muted">
                Stored in database: <code className="text-forest font-semibold">mandisaathi_offline_db</code>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-between">
            <span className="text-xs text-charcoal-muted">
              {cacheCleared ? 'Cache has been cleared.' : 'Purge all locally stored mandi records:'}
            </span>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={cacheCount === 0}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-surface hover:bg-red-50 text-charcoal-muted hover:text-red-700 border border-hairline hover:border-red-200 transition-all text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cacheCleared ? 'Cache Cleared!' : 'Clear Offline Cache'}</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (activeTab === 'about') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => setTab('')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-forest hover:text-forest-dark py-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('navMore')}</span>
        </button>

        <section className="rounded-xl border border-hairline bg-surface-white p-6 shadow-subtle space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-hairline">
            <div className="w-9 h-9 rounded-lg bg-forest text-harvest flex items-center justify-center font-bold">
              MS
            </div>
            <div>
              <h1 className="text-lg font-bold text-charcoal">MandiSaathi (मंडी साथी / ਮੰਡੀ ਸਾਥੀ)</h1>
              <p className="text-xs text-charcoal-muted">
                National Agricultural Market Information Service for Farmers
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-charcoal">
            <h2 className="font-bold text-forest text-sm">Institutional Market Record Guarantee</h2>
            <p>
              MandiSaathi connects Indian farmers directly with verified daily closed auction records from APMC mandis across India. All market data is ingested directly from the official Open Government Data platform (OGD India / Agmarknet, Ministry of Agriculture & Farmers Welfare).
            </p>
            <p className="font-medium text-forest-dark bg-forest-50 p-3 rounded-lg border border-forest/20">
              Authentic Record Guarantee: MandiSaathi provides strictly authentic auction records received from Agmarknet and State Agricultural Marketing Boards. All rates reflect verified closed transactions recorded by APMC market secretaries, without simulation or estimation. When auction records are unavailable for a commodity or date, the platform explicitly communicates the absence of records.
            </p>
          </div>

          <div className="pt-3 border-t border-hairline space-y-2 text-xs">
            <h3 className="font-bold text-charcoal">Voice Technology Infrastructure</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-surface rounded-lg border border-hairline space-y-1">
                <div className="text-xs uppercase font-bold text-charcoal-subtle">Speech Recognition</div>
                <div className="font-semibold text-charcoal">Indic Speech Recognition (Gnani Prisma)</div>
                <p className="text-xs text-charcoal-muted">Acoustic models optimized for rural Indian Hindi, Punjabi, and Indian English speech patterns.</p>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-hairline space-y-1">
                <div className="text-xs uppercase font-bold text-charcoal-subtle">Voice Response Synthesis</div>
                <div className="font-semibold text-charcoal">Natural Regional Voice Synthesis (Gnani Timbre)</div>
                <p className="text-xs text-charcoal-muted">High-naturalness regional voice synthesis producing authentic local pronunciations for farmers.</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs text-charcoal-muted font-mono">
            <span>National Agricultural Informatics Division • Agmarknet Verified Feed</span>
            <span>Version: 1.0.0-RC1</span>
          </div>
        </section>
      </div>
    );
  }

  // Directory Hub Overview
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 lg:pb-8">
      {/* Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Cpu className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Platform Services & Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {t('navMore')}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5 max-w-2xl">
            {language === 'hi'
              ? 'सरकारी योजनाएं, किसान शिकायत निवारण, भाषा सेटिंग्स और ऑफलाइन डेटा प्रबंधन'
              : language === 'pa'
              ? 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ, ਕਿਸਾਨ ਸ਼ਿਕਾਇਤ, ਭਾਸ਼ਾ ਸੈਟਿੰਗਜ਼ ਅਤੇ ਆਫਲਾਈਨ ਡਾਟਾ ਪ੍ਰਬੰਧਨ'
              : 'Access government schemes, APMC grievance intake, accessibility settings and offline storage'}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-surface border border-hairline px-3 py-1.5 rounded-lg text-charcoal-muted self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5 text-forest" />
          <span>Secondary Services</span>
        </div>
      </section>

      {/* Group 1: Farmer Services */}
      <section className="space-y-3">
        <div className="flex items-center space-x-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
            {language === 'hi' ? 'किसान सेवाएं' : language === 'pa' ? 'ਕਿਸਾਨ ਸੇਵਾਵਾਂ' : 'Farmer Services'}
          </span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        <div className="space-y-3">
          {farmerServices.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setTab(sec.id)}
                className="w-full text-left p-4 sm:p-5 rounded-xl border border-hairline bg-surface-white hover:border-forest/40 hover:bg-forest-50/15 transition-all shadow-subtle flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-surface border border-hairline group-hover:border-forest/30 flex items-center justify-center shrink-0 text-forest transition-colors">
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-charcoal group-hover:text-forest transition-colors">
                        {sec.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-hairline text-charcoal-muted">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-muted leading-relaxed max-w-xl">
                      {sec.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-charcoal-subtle group-hover:text-forest group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Group 2: System Information & Diagnostics */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center space-x-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
            {language === 'hi' ? 'सिस्टम व स्थानीय स्टोरेज' : language === 'pa' ? 'ਸਿਸਟਮ ਅਤੇ ਲੋਕਲ ਸਟੋਰੇਜ' : 'System & Diagnostics'}
          </span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        <div className="space-y-3">
          {systemServices.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setTab(sec.id)}
                className="w-full text-left p-4 sm:p-5 rounded-xl border border-hairline bg-surface-white hover:border-forest/40 hover:bg-forest-50/15 transition-all shadow-subtle flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-surface border border-hairline group-hover:border-forest/30 flex items-center justify-center shrink-0 text-charcoal-muted group-hover:text-forest transition-colors">
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-charcoal group-hover:text-forest transition-colors">
                        {sec.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-hairline text-charcoal-muted">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-muted leading-relaxed max-w-xl">
                      {sec.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-charcoal-subtle group-hover:text-forest group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Institutional Provenance Notice */}
      <footer className="rounded-xl border border-hairline bg-surface p-4 flex items-start space-x-3">
        <ShieldCheck className="w-4 h-4 text-forest shrink-0 mt-0.5" />
        <p className="text-xs text-charcoal leading-relaxed">
          {t('marketBriefText')}
        </p>
      </footer>
    </div>
  );
};
