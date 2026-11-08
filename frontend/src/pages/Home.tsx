import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { PromptChip } from '../components/ui/PromptChip';
import {
  Mic,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react';
import { RecentConversation } from '../types';

export const Home: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [recentQueries, setRecentQueries] = useState<RecentConversation[]>([]);
  const [homeQuery, setHomeQuery] = useState<string>('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mandisaathi_recent_conversations');
      if (stored) {
        setRecentQueries(JSON.parse(stored).slice(0, 3));
      }
    } catch {
      // Storage error fallback
    }
  }, []);

  const { data: commodities = [] } = useQuery({
    queryKey: ['commoditiesSummary'],
    queryFn: () => api.getCommodities(),
    staleTime: 60000,
  });

  const { data: mandis = [] } = useQuery({
    queryKey: ['mandisSummary'],
    queryFn: () => api.getMandis(),
    staleTime: 60000,
  });

  const { data: priceRecords = [] } = useQuery({
    queryKey: ['featuredPricesHome'],
    queryFn: () => api.getPrices(undefined, undefined),
    staleTime: 60000,
  });

  // Suggested Farmer Prompts
  const suggestedQueries = [
    { text: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?', langTag: 'HI' },
    { text: 'ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?', langTag: 'PA' },
    { text: 'Compare wheat prices in nearby mandis.', langTag: 'EN' },
    { text: 'आज सिरसा में सरसों का क्या भाव है?', langTag: 'HI' },
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
    <div className="max-w-6xl mx-auto space-y-8 pb-16 lg:pb-8">
      {/* Editorial Hero & Purpose Statement */}
      <section className="pt-2 sm:pt-4">
        <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
          <span>{getGreeting()} • Official APMC Market Telemetry</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-charcoal tracking-tight max-w-3xl leading-[1.2]">
          {language === 'hi'
            ? 'भारत के किसानों के लिए बोलकर सटीक मंडी भाव और कृषि आसूचना'
            : language === 'pa'
            ? 'ਕਿਸਾਨਾਂ ਲਈ ਬੋਲ ਕੇ ਸਹੀ ਮੰਡੀ ਭਾਅ ਅਤੇ ਖੇਤੀਬਾੜੀ ਸਹਾਇਤਾ'
            : 'Multilingual Voice Intelligence Grounded in Verified APMC Market Telemetry'}
        </h1>
        <p className="text-xs sm:text-base text-charcoal-muted mt-3 max-w-2xl leading-relaxed">
          {language === 'hi'
            ? 'अपनी स्थानीय बोली (हिन्दी, पंजाबी, अंग्रेजी) में बोलें और सरकारी एगमार्कनेट पोर्टल से सत्यापित दैनिक नीलामी दरें तुरंत प्राप्त करें।'
            : language === 'pa'
            ? 'ਆਪਣੀ ਭਾਸ਼ਾ (ਪੰਜਾਬੀ, ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ) ਵਿੱਚ ਬੋਲੋ ਅਤੇ ਸਰਕਾਰੀ ਮੰਡੀ ਬੋਰਡ ਤੋਂ ਪ੍ਰਮਾਣਿਤ ਅੱਜ ਦੇ ਭਾਅ ਜਾਣੋ।'
            : 'Speak naturally in Hindi, Punjabi, or English to access verified daily closed auction prices from APMC markets across India.'}
        </p>
      </section>

      {/* Primary Voice Action Interaction (Centerpiece) */}
      <section className="rounded-2xl border border-hairline bg-surface-white p-6 sm:p-10 text-center relative shadow-card">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-forest-50 border border-forest/15 text-forest text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Gnani Prisma STT & Timbre TTS Voice Pipeline</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal tracking-tight mb-2">
            {t('startVoicePrompt')}
          </h2>

          <p className="text-xs sm:text-sm text-charcoal-muted mb-8 max-w-md">
            {language === 'hi'
              ? 'माइक दबाएं और गेहूं, धान, सरसों या मंडी का नाम बोलकर पूछें।'
              : language === 'pa'
              ? 'ਮਾਈਕ ਦਬਾਓ ਅਤੇ ਕਣਕ, ਝੋਨਾ, ਜਾਂ ਕਿਸੇ ਮੰਡੀ ਦਾ ਨਾਂ ਬੋਲੋ।'
              : 'Tap the mic to ask about commodity rates, district mandis, or market comparisons.'}
          </p>

          {/* Large Tactile Voice Button */}
          <button
            type="button"
            onClick={() => navigate('/assistant')}
            className="group relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-forest text-harvest hover:bg-forest-light hover:scale-105 transition-all duration-200 active:scale-95 shadow-voice focus:outline-none focus:ring-4 focus:ring-forest/20 cursor-pointer"
            aria-label="Activate Voice Assistant"
          >
            <span className="absolute inset-0 rounded-full border-2 border-harvest/30 animate-ping opacity-30 group-hover:opacity-60" />
            <Mic className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.3] group-hover:scale-110 transition-transform text-harvest" />
          </button>

          <span className="text-[11px] font-mono font-medium text-charcoal-muted mt-4">
            Tap mic to begin voice query
          </span>

          {/* Quick Search Input Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (homeQuery.trim()) {
                navigate(`/assistant?q=${encodeURIComponent(homeQuery.trim())}`);
              }
            }}
            className="mt-5 w-full max-w-md mx-auto flex items-center bg-surface border border-hairline rounded-full px-3.5 py-1.5 shadow-subtle focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 transition-all"
          >
            <Search className="w-4 h-4 text-forest-light ml-1 mr-2 shrink-0" />
            <input
              type="text"
              value={homeQuery}
              onChange={(e) => setHomeQuery(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'या टाइप करके पूछें: आज गेहूं का भाव क्या है?'
                  : language === 'pa'
                  ? 'ਜਾਂ ਲਿਖ ਕੇ ਪੁੱਛੋ: ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?'
                  : 'Or type: What is the wheat price in Punjab today?'
              }
              className="w-full bg-transparent text-xs text-charcoal placeholder-charcoal-muted focus:outline-none py-1"
            />
            <button
              type="submit"
              className="p-1.5 rounded-full bg-forest hover:bg-forest-light text-white transition-all cursor-pointer shrink-0 ml-1.5"
              aria-label="Submit Search"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Suggested Queries Chips */}
        <div className="mt-8 pt-6 border-t border-hairline max-w-3xl mx-auto">
          <div className="text-[11px] font-semibold text-charcoal-subtle uppercase tracking-wider mb-3 flex items-center justify-center space-x-1.5">
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
      </section>

      {/* Live Market Pulse & Benchmark Prices */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-charcoal tracking-tight">
              Live Benchmark APMC Rates
            </h2>
            <p className="text-xs text-charcoal-muted">
              Official closed auction records from Agmarknet / State Mandi Boards
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/prices')}
            className="text-xs font-semibold text-forest hover:text-forest-dark inline-flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Mandis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Clean Data Stream */}
        <div className="border border-hairline rounded-xl bg-surface-white overflow-hidden shadow-subtle">
          <div className="divide-y divide-hairline">
            {priceRecords.slice(0, 4).map((record) => {
              const commName =
                language === 'hi'
                  ? record.commodityNameHi
                  : language === 'pa'
                  ? record.commodityNamePa || record.commodityNameEn
                  : record.commodityNameEn;
              const mandiName =
                language === 'hi'
                  ? record.mandiNameHi
                  : language === 'pa'
                  ? record.mandiNamePa || record.mandiNameEn
                  : record.mandiNameEn;

              return (
                <div
                  key={record.id}
                  onClick={() => navigate(`/prices?mandi=${encodeURIComponent(record.mandiCode)}`)}
                  className="p-4 sm:px-6 flex items-center justify-between hover:bg-forest-50/30 transition-colors cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-charcoal group-hover:text-forest transition-colors">
                        {commName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ivory text-charcoal-muted border border-hairline">
                        {mandiName} ({record.state})
                      </span>
                    </div>
                    <div className="text-[11px] text-charcoal-muted flex items-center space-x-3">
                      <span>Arrival: {record.arrivalQuantity} Qtl</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-charcoal-subtle" />
                        <span>Date: {record.priceDate}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base sm:text-lg font-bold text-forest tnum font-mono">
                      ₹{record.modalPrice.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-charcoal-muted">
                      Range: ₹{record.minPrice} – ₹{record.maxPrice} / Qtl
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two Column Section: Monitored Mandis & Recent Voice Conversations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nearby / Monitored Mandis */}
        <div className="border border-hairline rounded-xl bg-surface-white p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-forest" />
              <h3 className="font-bold text-sm text-charcoal">{t('nearbyMandisTitle')}</h3>
            </div>
            <span className="text-[11px] text-charcoal-muted font-mono">
              {mandis.length} Active APMCs • {commodities.length} Commodities
            </span>
          </div>

          <div className="space-y-2">
            {mandis.slice(0, 4).map((mandi) => (
              <div
                key={mandi.id}
                onClick={() => navigate(`/prices?mandi=${encodeURIComponent(mandi.code)}`)}
                className="p-3 rounded-lg border border-hairline hover:border-forest/40 hover:bg-forest-50/20 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-charcoal">
                    {language === 'hi' ? mandi.nameHi : language === 'pa' ? mandi.namePa || mandi.nameEn : mandi.nameEn}
                  </div>
                  <div className="text-[11px] text-charcoal-muted">
                    {mandi.district}, {mandi.state}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ivory text-charcoal-muted border border-hairline">
                  {mandi.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Voice Conversations */}
        <div className="border border-hairline rounded-xl bg-surface-white p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
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
                className="text-[11px] text-charcoal-muted hover:text-red-600 transition-colors cursor-pointer"
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
            <div className="space-y-2.5">
              {recentQueries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/assistant?q=${encodeURIComponent(item.query)}`)}
                  className="p-3 rounded-lg border border-hairline hover:border-forest/30 bg-surface/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-muted mb-1">
                    <span className="font-semibold text-forest truncate max-w-[220px]">
                      "{item.query}"
                    </span>
                    <span className="text-[10px]">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-charcoal line-clamp-2 leading-relaxed">{item.response}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Market Provenance & Agmarknet Guarantee */}
      <footer className="rounded-xl border border-hairline bg-surface p-4 sm:p-5 flex items-start space-x-3.5">
        <ShieldCheck className="w-5 h-5 text-forest shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-charcoal">
          <span className="font-bold text-forest-dark block sm:inline mr-1">
            {t('marketBriefTitle')}:
          </span>
          <span>{t('marketBriefText')}</span>
        </div>
      </footer>
    </div>
  );
};
