import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { PromptChip } from '../components/ui/PromptChip';
import {
  Mic,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { RecentConversation } from '../types';

export const Home: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [recentQueries, setRecentQueries] = useState<RecentConversation[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mandisaathi_recent_conversations');
      if (stored) {
        setRecentQueries(JSON.parse(stored).slice(0, 4));
      }
    } catch {
      // Storage error fallback
    }
  }, []);

  const { data: commodities } = useQuery({
    queryKey: ['commoditiesSummary'],
    queryFn: () => api.getCommodities(),
    staleTime: 60000,
  });

  const { data: mandis } = useQuery({
    queryKey: ['mandisSummary'],
    queryFn: () => api.getMandis(),
    staleTime: 60000,
  });

  const { data: schemes } = useQuery({
    queryKey: ['schemesSummary'],
    queryFn: () => api.getSchemes(),
    staleTime: 60000,
  });

  // Suggested Farmer Queries
  const suggestedQueries = [
    { text: 'आज गेहूं का भाव क्या है?', langTag: 'HI' },
    { text: 'ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?', langTag: 'PA' },
    { text: 'Compare wheat prices in nearby mandis.', langTag: 'EN' },
    { text: 'What documents are needed for PM-KISAN?', langTag: 'EN' },
    { text: 'सरसों का आज का मॉडल भाव क्या है?', langTag: 'HI' },
  ];

  const handlePromptClick = (queryText: string) => {
    navigate(`/assistant?q=${encodeURIComponent(queryText)}`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning');
    if (hour < 17) return t('greetingAfternoon');
    return t('greetingEvening');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Welcome Banner & Time-of-Day Greeting */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-harvest-dark" />
              <span>{getGreeting()}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
              {t('dashboardWelcome')}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1.5 max-w-2xl leading-relaxed">
              {t('dashboardHeroSubtitle')}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            <div className="bg-ivory/60 border border-ivory-dark rounded p-2.5 text-center">
              <div className="text-base sm:text-lg font-bold text-forest">
                {commodities?.length || 10}
              </div>
              <div className="text-[10px] text-charcoal-muted uppercase font-medium">
                {t('quickStatsCommodities')}
              </div>
            </div>
            <div className="bg-ivory/60 border border-ivory-dark rounded p-2.5 text-center">
              <div className="text-base sm:text-lg font-bold text-forest">
                {mandis?.length || 8}
              </div>
              <div className="text-[10px] text-charcoal-muted uppercase font-medium">
                {t('quickStatsMandis')}
              </div>
            </div>
            <div className="bg-ivory/60 border border-ivory-dark rounded p-2.5 text-center">
              <div className="text-base sm:text-lg font-bold text-harvest-dark">
                {schemes?.length || 5}
              </div>
              <div className="text-[10px] text-charcoal-muted uppercase font-medium">
                {t('quickStatsSchemes')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Voice Assistant CTA (Centerpiece Interaction) */}
      <div className="rounded-md border-2 border-forest/30 bg-gradient-to-b from-forest-50/60 to-white p-6 sm:p-8 text-center relative overflow-hidden shadow-subtle">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-harvest-50 text-forest-dark border border-harvest/40 mb-4 inline-flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Voice-First Natural Interaction</span>
          </span>

          <h3 className="text-lg sm:text-xl font-bold text-charcoal mb-2">
            {t('startVoicePrompt')}
          </h3>

          <p className="text-xs sm:text-sm text-charcoal-muted mb-6">
            {language === 'hi'
              ? 'गेहूं, धान, सरसों या मंडी भाव बोलकर पूछें, या सरकारी योजना का विवरण प्राप्त करें।'
              : language === 'pa'
              ? 'ਕਣਕ, ਝੋਨਾ, ਸਰ੍ਹੋਂ ਜਾਂ ਮੰਡੀ ਦੇ ਭਾਅ ਬੋਲ ਕੇ ਪੁੱਛੋ।'
              : 'Speak your query in Hindi, Punjabi, or English. Handled server-side with verified telemetry.'}
          </p>

          {/* Large Interactive Microphone CTA Button */}
          <button
            type="button"
            onClick={() => navigate('/assistant')}
            className="group relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-forest text-harvest hover:bg-forest-dark hover:scale-105 transition-all shadow-md active:scale-95 focus:outline-none focus:ring-4 focus:ring-forest/30"
            aria-label="Activate Voice Assistant"
          >
            <span className="absolute inset-0 rounded-full border-2 border-harvest/40 animate-ping opacity-25 group-hover:opacity-50" />
            <Mic className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2] group-hover:scale-110 transition-transform" />
          </button>

          <span className="text-[11px] font-medium text-charcoal-muted mt-3 font-mono">
            Tap mic to begin voice query
          </span>
        </div>

        {/* Suggested Queries Chips (Skiper UI inspired) */}
        <div className="mt-8 pt-6 border-t border-ivory-dark max-w-4xl mx-auto">
          <div className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3 flex items-center justify-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-harvest-dark" />
            <span>{t('suggestedQueriesLabel')}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQueries.map((q, idx) => (
              <PromptChip
                key={idx}
                text={q.text}
                langTag={q.langTag}
                onClick={handlePromptClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Monitored Mandis & Recent Voice Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nearby / Monitored Mandis */}
        <div className="bg-white border border-ivory-dark rounded-md p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-ivory-dark mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-forest" />
              <h3 className="font-bold text-sm text-charcoal">{t('nearbyMandisTitle')}</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/prices')}
              className="text-xs font-semibold text-forest hover:text-forest-dark inline-flex items-center space-x-1"
            >
              <span>{t('allMandis')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {mandis?.slice(0, 5).map((mandi) => (
              <div
                key={mandi.id}
                onClick={() => navigate(`/prices?mandi=${encodeURIComponent(mandi.code)}`)}
                className="p-3 rounded border border-ivory-dark hover:border-forest/50 hover:bg-ivory/40 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-charcoal">
                    {language === 'hi' ? mandi.nameHi : language === 'pa' ? mandi.namePa || mandi.nameEn : mandi.nameEn}
                  </div>
                  <div className="text-[11px] text-charcoal-muted">
                    {mandi.district}, {mandi.state}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-50 text-forest font-semibold border border-forest/20">
                    {mandi.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Voice Queries / Conversations */}
        <div className="bg-white border border-ivory-dark rounded-md p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-ivory-dark mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-forest" />
              <h3 className="font-bold text-sm text-charcoal">{t('recentQueriesTitle')}</h3>
            </div>
            {recentQueries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('mandisaathi_recent_conversations');
                  setRecentQueries([]);
                }}
                className="text-[11px] text-charcoal-muted hover:text-red-600 transition-colors"
              >
                {t('clearRecent')}
              </button>
            )}
          </div>

          {recentQueries.length === 0 ? (
            <div className="py-8 text-center text-xs text-charcoal-muted">
              <p>{t('noRecentQueries')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQueries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/assistant?q=${encodeURIComponent(item.query)}`)}
                  className="p-3 rounded border border-ivory-dark hover:border-forest/40 bg-ivory/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-muted mb-1">
                    <span className="font-semibold text-forest-dark truncate max-w-[200px]">
                      "{item.query}"
                    </span>
                    <span className="text-[10px]">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-charcoal line-clamp-2">{item.response}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Market Provenance & Agmarknet Notice (No Fake Prices Guarantee) */}
      <div className="rounded-md bg-ivory/80 border border-ivory-dark p-4 sm:p-5 flex items-start space-x-3.5">
        <ShieldCheck className="w-5 h-5 text-forest shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-charcoal">
          <span className="font-bold text-forest-dark block sm:inline mr-1">
            {t('marketBriefTitle')}:
          </span>
          <span>{t('marketBriefText')}</span>
        </div>
      </div>
    </div>
  );
};
