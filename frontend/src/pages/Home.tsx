import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Microphone,
  Stop,
  PaperPlaneRight,
  Tag,
  CheckCircle,
  Play,
  Pause,
  Repeat,
  MapPin,
  Clock,
  ArrowRight,
  MagnifyingGlass,
  TerminalWindow,
  Scales,
  Bank,
  Waveform,
  Plant,
} from '@phosphor-icons/react';

import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Badge } from '@astryxdesign/core/Badge';
import { useLanguage } from '../context/LanguageContext';
import { useCommandSpotlight } from '../components/AstryxRootProvider';
import { api } from '../services/apiClient';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
const ThreeTerrainBackdrop = lazy(() =>
  import('../components/ui/ThreeTerrainBackdrop').then((m) => ({
    default: m.ThreeTerrainBackdrop,
  }))
);
import { VoiceWaveVisualizer } from '../components/ui/VoiceWaveVisualizer';
import { PriceSpreadBar } from '../components/ui/PriceSpreadBar';
import { PromptChip } from '../components/ui/PromptChip';
import { LottieBadge } from '../components/ui/LottieBadge';
import { WatchlistBar } from '../components/ui/WatchlistBar';
import { AgriWeatherCalendar } from '../components/ui/AgriWeatherCalendar';
import {
  TextEffect,
  SlidingNumber,
  BorderTrailCard,
  GsapStaggerGrid,
} from '../components/ui/MotionPrimitives';
import { Mandi, PriceRecord } from '../types';

export const Home: React.FC = () => {
  const { openSpotlight } = useCommandSpotlight();
  const { language, t, getCommodityName, getMandiName } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [textInput, setTextInput] = useState<string>('');
  const [inspectedMandi, setInspectedMandi] = useState<Mandi | null>(null);
  const lastExecutedQueryRef = React.useRef<string | null>(null);

  const {
    state,
    setState,
    transcription,
    response,
    errorMessage,
    isPlayingAudio,
    audioLevel,
    recordingSeconds,
    micTestPassed,
    isRequestInFlight,
    lastAudioDuration,
    lastAudioSize,
    clientRoundtripMs,
    recentQueries,
    startAudioRecording,
    stopAudioRecording,
    executeTextQuery,
    playAudioResponse,
    toggleAudioPlayback,
    testMicrophone,
    clearRecentQueries,
    clearError,
  } = useVoiceAssistant();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && lastExecutedQueryRef.current !== q) {
      lastExecutedQueryRef.current = q;
      setTextInput(q);
      executeTextQuery(q);
    }
  }, [searchParams, executeTextQuery]);

  const suggestedQueries = useMemo(() => {
    switch (language) {
      case 'mr':
        return [
          { text: 'आज लासलगावमध्ये कांद्याचा भाव काय आहे?', langTag: 'MR' },
          { text: 'नाशिक बाजारात सोयाबीनचे दर काय आहेत?', langTag: 'MR' },
          { text: 'पुणे मंडईत गव्हाचा मॉडेल भाव काय आहे?', langTag: 'MR' },
          { text: 'पीएम-किसान योजनेसाठी कागदपत्रे कोणती लागतात?', langTag: 'MR' },
        ];
      case 'gu':
        return [
          { text: 'આજે રાજકોટમાં કપાસનો ભાવ શું છે?', langTag: 'GU' },
          { text: 'ઊંઝા માર્કેટમાં જીરુંના તાજા ભાવ જણાવો', langTag: 'GU' },
          { text: 'ગોંડલ મંડીમાં મગફળીનો મોડલ ભાવ શું છે?', langTag: 'GU' },
          { text: 'પીએમ કિસાન યોજનાની વિગત આપો', langTag: 'GU' },
        ];
      case 'bn':
        return [
          { text: 'আজ বর্ধমানে ধানের সরকারি দর কত চলছে?', langTag: 'BN' },
          { text: 'শিলিগুড়ি বাজারে গমের দাম কত?', langTag: 'BN' },
          { text: 'আলুর আজকের পাইকারি নিলাম দর কত?', langTag: 'BN' },
          { text: 'পিএম-কিসান প্রকল্পে কি কি নথি লাগে?', langTag: 'BN' },
        ];
      case 'te':
        return [
          { text: 'ఈరోజు గుంటూరులో మిర్చి ధర ఎంత ఉంది?', langTag: 'TE' },
          { text: 'వరంగల్ మార్కెట్లో పత్తి ధర చెప్పండి', langTag: 'TE' },
          { text: 'వరి ధాన్యం ప్రభుత్వ మద్దతు ధర ఎంత?', langTag: 'TE' },
          { text: 'పీఎం-కిసాన్ పథకానికి దరఖాస్తు ఎలా చేయాలి?', langTag: 'TE' },
        ];
      case 'ta':
        return [
          { text: 'இன்று ஈரோட்டில் மஞ்சள் விலை என்ன?', langTag: 'TA' },
          { text: 'மதுரை மார்க்கெட்டில் நெல் விலை என்ன?', langTag: 'TA' },
          { text: 'பருத்தி இன்றைய மாடல் விலை என்ன?', langTag: 'TA' },
          { text: 'பிஎம் கிசான் திட்டத்திற்கு என்ன ஆவணங்கள் தேவை?', langTag: 'TA' },
        ];
      case 'kn':
        return [
          { text: 'ಇಂದು ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಹತ್ತಿ ಬೆಲೆ ಎಷ್ಟಿದೆ?', langTag: 'KN' },
          { text: 'ಮೈಸೂರು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಭತ್ತದ ದರ ತಿಳಿಸಿ', langTag: 'KN' },
          { text: 'ರಾಗಿಯ ಇಂದಿನ ಮಾಡಲ್ ದರ ಎಷ್ಟು?', langTag: 'KN' },
          { text: 'ಪಿಎಂ ಕಿಸಾನ್ ಯೋಜನೆಗೆ ಬೇಕಾದ ದಾಖಲೆಗಳು ಯಾವುವು?', langTag: 'KN' },
        ];
      case 'ml':
        return [
          { text: 'ഇന്ന് കൊച്ചിയിൽ ഏലക്കായുടെ വില എത്രയാണ്?', langTag: 'ML' },
          { text: 'വയനാട് വിപണിയിൽ കുരുമുളകിന്റെ നിരക്ക് പറയൂ', langTag: 'ML' },
          { text: 'നെല്ലിന്റെ ഇന്നത്തെ വിപണി വില എത്രയാണ്?', langTag: 'ML' },
          { text: 'പിഎം-കിസാൻ പദ്ധതിക്ക് ആവശ്യമായ രേഖകൾ എന്തൊക്കെ?', langTag: 'ML' },
        ];
      case 'pa':
        return [
          { text: 'ਜੋਧਪੁਰ ਜੀਰਾ ਮੰਡੀ ਵਿੱਚ ਜ਼ੀਰੇ ਦਾ ਕੀ ਭਾਅ ਹੈ?', langTag: 'PA' },
          { text: 'ਕਣਕ ਵਿੱਚ ਪੀਲੀ ਕੁੰਗੀ ਦੀ ਰੋਕਥਾਮ ਕਿਵੇਂ ਕਰੀਏ?', langTag: 'PA' },
          { text: 'ਕਣਕ ਨੂੰ ਪਹਿਲਾ ਪਾਣੀ ਕਦੋਂ ਲਾਈਏ?', langTag: 'PA' },
          { text: 'ਖੰਨਾ ਮੰਡੀ ਵਿੱਚ ਬਾਸਮਤੀ ਦਾ ਰੇਟ ਕੀ ਚੱਲ ਰਿਹਾ ਹੈ?', langTag: 'PA' },
          { text: 'ਪੀਐਮ-ਕਿਸਾਨ ਸਕੀਮ ਲਈ ਕਿਹੜੇ ਕਾਗਜ਼ ਚਾਹੀਦੇ ਹਨ?', langTag: 'PA' },
        ];
      case 'en':
        return [
          { text: 'What is the price of jeera in Jeera Mandi Jodhpur?', langTag: 'EN' },
          { text: 'How to control yellow rust in wheat?', langTag: 'EN' },
          { text: 'When should I irrigate wheat crop?', langTag: 'EN' },
          { text: 'What is the safe moisture limit for wheat storage?', langTag: 'EN' },
          { text: 'Compare cotton rates between Sirsa and Khanna mandis', langTag: 'EN' },
        ];
      default:
        return [
          { text: 'जोधपुर जीरा मंडी में जीरे का भाव क्या है?', langTag: 'HI' },
          { text: 'गेहूं में पीला रतुआ कैसे रोकें?', langTag: 'HI' },
          { text: 'गेहूं में पहली सिंचाई कब करें?', langTag: 'HI' },
          { text: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?', langTag: 'HI' },
          { text: 'पीएम-किसान सम्मान निधि के लिए क्या दस्तावेज चाहिए?', langTag: 'HI' },
        ];
    }
  }, [language]);

  const { data: mandis = [] } = useQuery({
    queryKey: ['mandisSummaryHome'],
    queryFn: () => api.getMandis(),
    staleTime: 60000,
  });

  const { data: priceRecords = [] } = useQuery({
    queryKey: ['featuredPricesHome'],
    queryFn: () => api.getPrices(undefined, undefined),
    staleTime: 60000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning');
    if (hour < 17) return t('greetingAfternoon');
    return t('greetingEvening');
  };

  const getRecordCommodityName = (r: PriceRecord) =>
    getCommodityName(r.commodityCode, r.commodityNameHi || r.commodityNameEn);

  const getRecordMandiName = (r: PriceRecord) =>
    getMandiName(r.mandiCode, r.mandiNameHi || r.mandiNameEn);

  const isVoiceActive = state === 'recording' || state === 'transcribing' || state === 'processing';

  return (
    <div className="space-y-8">
      {/* Asymmetric Flagship Hero + Command Studio Stage over Voice-Reactive Three.js Shader Terrain */}
      <section className="relative overflow-hidden rounded-3xl border border-line ms-hero-surface p-5 sm:p-8 lg:p-10">
        <Suspense fallback={null}>
          <ThreeTerrainBackdrop audioLevel={audioLevel} isActive={isVoiceActive} />
        </Suspense>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left 7 Cols: Editorial Voice Command Deck */}
          <div className="lg:col-span-7 space-y-5">
            {/* Single restrained eyebrow for hero */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-canopy-soft/90 backdrop-blur-sm border border-canopy/25 text-canopy dark:text-canopy-bright text-xs font-semibold shadow-subtle">
              <span className="w-2 h-2 rounded-full bg-canopy-bright animate-pulse" />
              <span>
                {getGreeting()} · {t('benchmarkTitle')}
              </span>
            </div>

            <TextEffect
              text={t('heroHeadline')}
              as="h1"
              className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-ink tracking-tight leading-[1.16] max-w-2xl"
            />

            <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-[58ch]">
              {t('heroSubtitle')}
            </p>

            {/* Compact Product Trust Strip */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-ink-muted">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/80 border border-line">
                <Microphone weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                <span>{language === 'hi' ? '10 भारतीय भाषाएं' : language === 'pa' ? '10 ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ' : '10 Indian Languages'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/80 border border-line">
                <CheckCircle weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                <span>{language === 'hi' ? 'सत्यापित APMC रिकॉर्ड' : language === 'pa' ? 'ਪ੍ਰਮਾਣਿਤ APMC ਰਿਕਾਰਡ' : 'Verified APMC Ledger'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/80 border border-line">
                <Plant weight="duotone" className="w-3.5 h-3.5 text-saffron" />
                <span>{language === 'hi' ? 'ICAR · PAU · IMD सलाह' : language === 'pa' ? 'ICAR · PAU · IMD ਸਲਾਹ' : 'ICAR · PAU · IMD Advisory'}</span>
              </span>
            </div>

            {/* Voice Action Studio Container */}
            <BorderTrailCard active={isVoiceActive}>
              <div className="p-4 sm:p-6 space-y-4">
                {/* Status + Mic Trigger Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                      <LottieBadge
                        variant="voice"
                        loop={isVoiceActive}
                        className="w-16 h-16 absolute inset-0 -m-1 pointer-events-none"
                      />
                      {state === 'recording' ? (
                        <button
                          type="button"
                          onClick={stopAudioRecording}
                          aria-label={t('stopAndProcessVoice')}
                          className="relative z-10 w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                        >
                          <Stop weight="fill" className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startAudioRecording}
                          disabled={isRequestInFlight || isVoiceActive}
                          aria-label="Activate Voice Assistant"
                          className="relative z-10 w-12 h-12 rounded-full bg-canopy hover:brightness-110 text-white flex items-center justify-center shadow-emeraldGlow transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Microphone weight="duotone" className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-display font-bold text-sm sm:text-base text-ink ${
                            state === 'transcribing' || state === 'processing' ? 'animate-pulse text-canopy dark:text-canopy-bright' : ''
                          }`}
                        >
                          {state === 'recording'
                            ? `${t('micRecording')} (00:${recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})`
                            : state === 'transcribing'
                            ? t('micTranscribing')
                            : state === 'processing'
                            ? t('micProcessing')
                            : state === 'answered'
                            ? t('tryAgain')
                            : t('micIdle')}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted truncate">
                        {t('gnaniVoicePowered')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-center">
                    {state === 'recording' ? (
                      <button
                        type="button"
                        onClick={stopAudioRecording}
                        className="min-h-[44px] inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Stop weight="fill" className="w-3.5 h-3.5" />
                        <span>{t('stopAndProcessVoice')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={testMicrophone}
                        className="min-h-[44px] inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-surface-subtle hover:bg-canopy-soft border border-line text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Waveform weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                        <span>{micTestPassed ? `✓ ${t('micReady')}` : t('testMic')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live 60fps Acoustic Waveform */}
                <VoiceWaveVisualizer
                  isRecording={state === 'recording'}
                  isProcessing={state === 'transcribing' || state === 'processing'}
                  audioLevel={audioLevel}
                />

                {/* Text Query Composer */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (textInput.trim()) {
                      executeTextQuery(textInput);
                      setTextInput('');
                    }
                  }}
                  className="flex items-center bg-surface-subtle border border-line focus-within:border-canopy-bright focus-within:ring-2 focus-within:ring-canopy-bright/20 rounded-full pl-3.5 pr-1.5 py-1 transition-all"
                >
                  <MagnifyingGlass weight="bold" className="w-4 h-4 text-ink-muted mr-2 shrink-0" />
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={t('typeQueryPlaceholder')}
                    aria-label={t('typeQueryPlaceholder')}
                    className="w-full min-h-[44px] bg-transparent text-xs sm:text-sm text-ink placeholder-ink-subtle focus:outline-none py-2"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim() || isVoiceActive}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-canopy hover:brightness-110 text-white transition-all disabled:opacity-40 cursor-pointer shrink-0 ml-2 shadow-subtle flex items-center justify-center"
                    aria-label="Send Query"
                  >
                    <PaperPlaneRight weight="fill" className="w-4 h-4 text-white" />
                  </button>
                </form>

                {/* Suggested Query Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestedQueries.map((q, idx) => (
                    <PromptChip
                      key={idx}
                      text={q.text}
                      langTag={q.langTag}
                      onClick={(queryText) => {
                        setTextInput('');
                        executeTextQuery(queryText);
                      }}
                    />
                  ))}
                </div>
              </div>
            </BorderTrailCard>
          </div>

          {/* Right 5 Cols: Immediate Benchmark Market Pulse Above the Fold */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="font-display font-bold text-sm text-ink truncate">
                    {t('benchmarkTitle')}
                  </h2>
                  <button
                    type="button"
                    onClick={openSpotlight}
                    aria-label="Open Agrarian Command Spotlight"
                    className="hidden sm:inline-flex items-center gap-1 min-h-[28px] px-2 rounded-full bg-surface-subtle border border-line hover:border-canopy/50 text-[10px] font-mono text-ink-muted hover:text-ink transition-colors cursor-pointer shrink-0"
                  >
                    <MagnifyingGlass weight="bold" className="w-3 h-3 text-canopy dark:text-canopy-bright" />
                    <span>⌘K</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/prices')}
                  className="min-h-[44px] px-2 -mr-2 text-xs font-semibold text-canopy dark:text-canopy-bright hover:underline inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{t('viewAllRates')}</span>
                  <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-line">
                {priceRecords.slice(0, 4).map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => navigate(`/prices?mandi=${encodeURIComponent(record.mandiCode)}`)}
                    className="w-full py-2.5 flex items-center justify-between text-left hover:bg-surface-subtle/60 px-2 -mx-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs sm:text-sm text-ink group-hover:text-canopy dark:group-hover:text-canopy-bright truncate">
                        {getRecordCommodityName(record)}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate flex items-center space-x-1.5">
                        <span>{getRecordMandiName(record)}</span>
                        <span>·</span>
                        <span className="font-mono">{record.priceDate}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <SlidingNumber
                        value={record.modalPrice}
                        prefix="₹"
                        className="text-sm sm:text-base font-bold text-canopy dark:text-canopy-bright"
                      />
                      <div className="text-[10px] font-mono text-ink-muted">
                        / {record.unit || t('perQuintal')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {priceRecords.slice(0, 4).some((row) => row.provenanceType === 'SEEDED_BASELINE') && (
                <p className="text-xs text-ink-muted">{t('baselinePriceNotice')}</p>
              )}
            </div>

            {/* Quick Action Bento Pair */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/compare')}
                className="p-4 rounded-2xl border border-line bg-surface ms-card-interactive hover:border-canopy/40 text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-saffron-soft border border-saffron/20 flex items-center justify-center mb-2.5">
                  <Scales weight="duotone" className="w-5 h-5 text-saffron" />
                </div>
                <div className="font-display font-bold text-xs sm:text-sm text-ink group-hover:text-canopy dark:group-hover:text-canopy-bright">
                  {t('compareMarketsCardTitle')}
                </div>
                <p className="text-[11px] text-ink-muted mt-1 line-clamp-2">
                  {t('compareMarketsCardDesc')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/schemes')}
                className="p-4 rounded-2xl border border-line bg-surface ms-card-interactive hover:border-canopy/40 text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-canopy-soft border border-canopy/20 flex items-center justify-center mb-2.5">
                  <Bank weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
                </div>
                <div className="font-display font-bold text-xs sm:text-sm text-ink group-hover:text-canopy dark:group-hover:text-canopy-bright">
                  {t('navSchemes')}
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">
                  {t('moreSchemesSubtitle')}
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Permission Denied / Error Alerts */}
      {state === 'permission_denied' && (
        <Banner
          status="warning"
          collapsible={false}
          title={t('permissionDeniedTitle')}
          description={t('permissionDeniedGuide')}
          isDismissable
          onDismiss={() => setState('idle')}
          endContent={
            <Button
              label={t('retry')}
              variant="secondary"
              size="sm"
              onClick={startAudioRecording}
            />
          }
        />
      )}

      {errorMessage && state === 'error' && (
        <Banner
          status="error"
          role="alert"
          collapsible={false}
          title={t('error')}
          description={errorMessage}
          isDismissable
          onDismiss={clearError}
        />
      )}

      {/* Transcription & Verified Voice Response Deck */}
      {(transcription || (response && state === 'answered')) && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          {transcription && (
            <div
              data-testid="raw-transcript-box"
              className="p-4 sm:p-5 bg-surface rounded-2xl border border-line shadow-subtle"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider">
                  {t('transcriptionLabel')}
                </span>
                {response?.detectedLanguage && (
                  <span className="text-xs font-mono text-canopy dark:text-canopy-bright bg-canopy-soft px-2.5 py-0.5 rounded-full border border-canopy/20">
                    {response.detectedLanguage}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-semibold text-ink leading-relaxed">
                &ldquo;{transcription}&rdquo;
              </p>
            </div>
          )}

          {response && state === 'answered' && (
            <div className="p-5 sm:p-6 bg-surface rounded-2xl border border-canopy/25 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3 flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
                  <span className="font-display text-sm font-bold text-canopy dark:text-canopy-bright">
                    {t('responseLabel')}
                  </span>
                  {response.intent && response.intent !== 'UNKNOWN' && (
                    <span className="text-[11px] font-mono bg-surface-subtle border border-line text-ink px-2.5 py-0.5 rounded-full">
                      {response.intent}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-ink-muted">
                    {response.audioBase64
                      ? response.isLiveGnaniConnected
                        ? t('audioSourceGnani')
                        : t('audioSourceSandbox')
                      : t('audioSourceBrowser')}
                  </span>

                  <button
                    type="button"
                    onClick={toggleAudioPlayback}
                    className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                      isPlayingAudio
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
                        : 'bg-canopy text-white hover:brightness-110 shadow-subtle'
                    }`}
                  >
                    {isPlayingAudio ? <Pause weight="fill" className="w-3.5 h-3.5" /> : <Play weight="fill" className="w-3.5 h-3.5" />}
                    <span>{isPlayingAudio ? t('stopAudio') : t('listenAudio')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => playAudioResponse(response)}
                    title="Replay"
                    className="p-2 text-ink-muted hover:text-ink bg-surface-subtle border border-line rounded-full cursor-pointer"
                  >
                    <Repeat weight="bold" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {response.extractedEntities && Object.keys(response.extractedEntities).length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  {Object.entries(response.extractedEntities).map(([key, val]) => (
                    <span
                      key={key}
                      className="inline-flex items-center space-x-1.5 text-xs font-medium bg-surface-subtle border border-line text-ink px-2.5 py-1 rounded-full"
                    >
                      <Tag weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                      <span>
                        {key}: <strong>{val}</strong>
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div className="border-l-2 border-canopy pl-4 py-0.5">
                <p className="text-sm sm:text-base leading-relaxed text-ink font-medium">
                  {response.responseText}
                </p>
              </div>

              {response.priceRecords && response.priceRecords.length > 0 && (
                <div className="pt-3 border-t border-line space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-ink">{t('mandiRateCardTitle')}</span>
                    {response.source && (
                      <span className="font-mono text-ink-muted bg-surface-subtle px-2.5 py-0.5 rounded-full border border-line">
                        {response.source}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {response.priceRecords.map((rec) => (
                      <div key={rec.id} className="bg-surface-subtle p-4 rounded-2xl border border-line space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-display font-bold text-ink text-sm">
                            {getRecordCommodityName(rec)}
                            {rec.variety && (
                              <span className="ml-1.5 text-xs font-normal text-ink-muted">
                                ({rec.variety})
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-ink-muted">{rec.priceDate}</span>
                        </div>
                        <div className="text-xs text-ink-muted flex items-center justify-between">
                          <span>{getRecordMandiName(rec)}, {rec.state}</span>
                          {rec.dataSource && (
                            <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-line">
                              {rec.dataSource}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between pt-2 border-t border-line">
                          <SlidingNumber
                            value={rec.modalPrice}
                            prefix="₹"
                            suffix={` / ${rec.unit || t('perQuintal')}`}
                            className="text-lg font-bold text-canopy dark:text-canopy-bright"
                          />
                        </div>
                        <PriceSpreadBar
                          minPrice={rec.minPrice}
                          modalPrice={rec.modalPrice}
                          maxPrice={rec.maxPrice}
                          unit={rec.unit || t('perQuintal')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-ink-muted font-mono">
                <span>{response.engineNotice}</span>
                <span className="text-canopy dark:text-canopy-bright font-semibold">
                  ● {t('queryVerifiedStatus')}
                </span>
              </div>

              {response.relatedQueries && response.relatedQueries.length > 0 && (
                <div className="pt-2 border-t border-line flex flex-wrap gap-2">
                  {response.relatedQueries.map((rq, i) => (
                    <PromptChip key={i} text={rq} onClick={executeTextQuery} />
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}

      {/* Optional Debug Diagnostics Drawer (?debug=1) */}
      {searchParams.get('debug') === '1' && (
        <details className="border border-line rounded-2xl bg-surface text-xs overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer font-mono text-ink-muted hover:text-ink flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <TerminalWindow weight="duotone" className="w-4 h-4 text-canopy" />
              <span>Voice Gateway Diagnostics</span>
            </span>
            <span>{response?.backendLatencyMs ? `${response.backendLatencyMs}ms` : 'ready'}</span>
          </summary>
          <div className="p-4 border-t border-line font-mono grid grid-cols-1 sm:grid-cols-3 gap-3 text-ink">
            <div>Backend: {response?.backendLatencyMs ?? 'N/A'}ms</div>
            <div>STT: {response?.sttLatencyMs ?? 'N/A'}ms</div>
            <div>Roundtrip: {clientRoundtripMs ?? 'N/A'}ms</div>
            <div>Duration: {lastAudioDuration ? `${lastAudioDuration.toFixed(2)}s` : 'N/A'}</div>
            <div>Bytes: {lastAudioSize ? `${(lastAudioSize / 1024).toFixed(1)} KB` : 'N/A'}</div>
            <div>Status: {response?.statusCode ?? 'OK'}</div>
          </div>
        </details>
      )}

      {/* Farmer Watchlist & Opt-In Price Alerts */}
      <WatchlistBar
        priceRecords={priceRecords}
        onSelectCommodity={(comm) => navigate(`/prices?commodity=${comm}`)}
        onSelectMandi={(mandi) => navigate(`/prices?mandi=${mandi}`)}
      />

      {/* Local Weather & Crop Stage Sowing Calendar */}
      <AgriWeatherCalendar />

      {/* Product Pillars Showcase (Editorial 3-Column Feature Strip) */}
      <GsapStaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="gs-stagger-item rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-subtle ms-card-interactive space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-canopy dark:text-canopy-bright bg-canopy-soft px-2.5 py-0.5 rounded-full border border-canopy/20">
              01 · VOICE AI
            </span>
            <Microphone weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
          </div>
          <h3 className="font-display font-bold text-sm sm:text-base text-ink">
            {language === 'hi'
              ? 'अपनी भाषा में बोलें, तुरंत उत्तर पाएं'
              : language === 'pa'
              ? 'ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ, ਤੁਰੰਤ ਜਵਾਬ ਪਾਓ'
              : 'Speak Naturally in Your Dialect'}
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            {language === 'hi'
              ? 'हिन्दी, पंजाबी, मराठी और 10 भारतीय भाषाओं में सटीक आवाज़ पहचान एवं मंडी भाव।'
              : language === 'pa'
              ? 'ਪੰਜਾਬੀ, ਹਿੰਦੀ ਅਤੇ 10 ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਤੁਰੰਤ ਬੋਲ ਕੇ ਮੰਡੀ ਭਾਅ ਜਾਣੋ।'
              : 'Gnani Prisma STT & Timbre TTS support across 10 Indian agricultural languages.'}
          </p>
        </div>

        <div className="gs-stagger-item rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-subtle ms-card-interactive space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-saffron-text bg-saffron-soft px-2.5 py-0.5 rounded-full border border-saffron/20">
              02 · APMC LEDGER
            </span>
            <Scales weight="duotone" className="w-5 h-5 text-saffron" />
          </div>
          <h3 className="font-display font-bold text-sm sm:text-base text-ink">
            {language === 'hi'
              ? 'परिवहन के बाद शुद्ध मुनाफे की तुलना'
              : language === 'pa'
              ? 'ਢੋਆ-ਢੁਆਈ ਤੋਂ ਬਾਅਦ ਸ਼ੁੱਧ ਮੁਨਾਫੇ ਦੀ ਤੁਲਨਾ'
              : 'Net Realization After Transport'}
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            {language === 'hi'
              ? 'आस-पास की मंडियों में न्यूनतम, अधिकतम व मॉडल भाव और भाड़े के बाद शुद्ध लाभ देखें।'
              : language === 'pa'
              ? 'ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਅਤੇ ਕਿਰਾਏ ਤੋਂ ਬਾਅਦ ਅਸਲ ਬਚਤ ਦੀ ਤੁਲਨਾ ਕਰੋ।'
              : 'Compare modal rates, auction spread, and transport-adjusted earnings across yards.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/crops')}
          className="gs-stagger-item text-left rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-subtle ms-card-interactive space-y-2.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-canopy dark:text-canopy-bright bg-canopy-soft px-2.5 py-0.5 rounded-full border border-canopy/20">
              03 · ALL-INDIA CROPS
            </span>
            <Plant weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
          </div>
          <h3 className="font-display font-bold text-sm sm:text-base text-ink group-hover:text-canopy dark:group-hover:text-canopy-bright transition-colors">
            {language === 'hi'
              ? 'भारत की सभी प्रमुख फसलों का ज्ञानकोश'
              : language === 'pa'
              ? 'ਭਾਰਤ ਦੀਆਂ ਸਾਰੀਆਂ ਫ਼ਸਲਾਂ ਦਾ ਗਿਆਨਕੋਸ਼'
              : 'All-India Crop Encyclopedia →'}
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            {language === 'hi'
              ? 'अनाज, श्री अन्न, दलहन, तिलहन, मसाले, सब्ज़ियाँ और फलों की किस्में, सिंचाई और रोग सलाह।'
              : language === 'pa'
              ? 'ਅਨਾਜ, ਮੋਟੇ ਅਨਾਜ, ਦਾਲਾਂ, ਤੇਲ ਬੀਜ, ਮਸਾਲੇ ਅਤੇ ਬਾਗਬਾਨੀ ਫ਼ਸਲਾਂ ਦੀ ਪੂਰੀ ਜਾਣਕਾਰੀ।'
              : 'Cereals, Millets, Pulses, Oilseeds, Spices, Vegetables & Fruits — varieties, NPK, irrigation & storage.'}
          </p>
        </button>
      </GsapStaggerGrid>

      {/* Monitored APMCs & Recent Queries Grid with GSAP Stagger */}
      <GsapStaggerGrid
        depKey={mandis.length}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="gs-stagger-item border border-line rounded-3xl bg-surface p-5 sm:p-6 shadow-subtle space-y-3 ms-card-interactive">
          <div className="flex items-center justify-between pb-2.5 border-b border-line">
            <div className="flex items-center space-x-2">
              <MapPin weight="duotone" className="w-4 h-4 text-saffron" />
              <h3 className="font-display font-bold text-sm text-ink">{t('nearbyMandisTitle')}</h3>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">{mandis.length} APMCs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {mandis.slice(0, 4).map((mandi) => (
              <button
                key={mandi.id}
                type="button"
                onClick={() => setInspectedMandi(mandi)}
                className="min-h-[52px] p-3 rounded-xl border border-line bg-surface-subtle/50 hover:border-canopy/35 hover:bg-canopy-soft/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-xs text-ink truncate">
                    {getMandiName(mandi.code, mandi.nameHi || mandi.nameEn)}
                  </div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {mandi.district}, {mandi.state}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface text-ink-muted border border-line shrink-0">
                  {mandi.code}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="gs-stagger-item border border-line rounded-3xl bg-surface p-5 sm:p-6 shadow-subtle space-y-3 ms-card-interactive">
          <div className="flex items-center justify-between pb-2.5 border-b border-line">
            <div className="flex items-center space-x-2">
              <Clock weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
              <h3 className="font-display font-bold text-sm text-ink">{t('recentQueriesTitle')}</h3>
            </div>
            {recentQueries.length > 0 && (
              <button
                type="button"
                onClick={clearRecentQueries}
                className="text-[11px] text-ink-muted hover:text-red-600 transition-colors cursor-pointer"
              >
                {t('clearRecent')}
              </button>
            )}
          </div>

          {recentQueries.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-muted flex flex-col items-center">
              <LottieBadge variant="empty" loop className="w-12 h-12 mb-1" />
              <p>{t('noRecentQueries')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentQueries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => executeTextQuery(item.query)}
                  className="w-full text-left p-3 rounded-xl border border-line bg-surface-subtle/50 hover:border-canopy/35 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mb-0.5">
                    <span className="font-semibold text-canopy dark:text-canopy-bright truncate max-w-[240px]">
                      &ldquo;{item.query}&rdquo;
                    </span>
                    <span className="text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-ink line-clamp-2 leading-relaxed">{item.response}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </GsapStaggerGrid>

      {/* Astryx Native Top-Layer APMC Quick-Inspect Dialog */}
      <Dialog
        isOpen={inspectedMandi !== null}
        onOpenChange={(open) => {
          if (!open) setInspectedMandi(null);
        }}
        purpose="info"
        width={540}
      >
        {inspectedMandi && (() => {
          const mandiRates = priceRecords.filter((r) => r.mandiCode === inspectedMandi.code);
          return (
            <div className="space-y-4">
              <DialogHeader
                title={getMandiName(inspectedMandi.code, inspectedMandi.nameHi || inspectedMandi.nameEn)}
                subtitle={`${inspectedMandi.district}, ${inspectedMandi.state} · ${inspectedMandi.code}`}
                onOpenChange={(open) => {
                  if (!open) setInspectedMandi(null);
                }}
              />

              {mandiRates.length === 0 ? (
                <p className="text-xs text-ink-muted py-4 text-center">{t('noPriceData')}</p>
              ) : (
                <div className="space-y-2.5">
                  {mandiRates.slice(0, 4).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl bg-surface-subtle border border-line space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-ink">
                            {getRecordCommodityName(rec)}
                          </span>
                          {rec.variety && <Badge label={rec.variety} variant="neutral" />}
                        </div>
                        <span className="font-mono text-[11px] text-ink-muted">{rec.priceDate}</span>
                      </div>
                      <PriceSpreadBar
                        minPrice={rec.minPrice}
                        modalPrice={rec.modalPrice}
                        maxPrice={rec.maxPrice}
                        unit={rec.unit || t('perQuintal')}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-line">
                <div className="flex-1">
                  <Button
                    label={t('viewAllRates')}
                    variant="primary"
                    size="lg"
                    width="100%"
                    endContent={<ArrowRight weight="bold" className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const code = inspectedMandi.code;
                      setInspectedMandi(null);
                      navigate(`/prices?mandi=${encodeURIComponent(code)}`);
                    }}
                  />
                </div>
                <Button
                  label={t('navCompare')}
                  variant="secondary"
                  size="lg"
                  icon={<Scales weight="duotone" className="w-4 h-4 text-saffron-text" />}
                  onClick={() => {
                    setInspectedMandi(null);
                    navigate('/compare');
                  }}
                />
              </div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
};
