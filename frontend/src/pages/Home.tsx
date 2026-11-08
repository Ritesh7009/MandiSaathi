import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { VoiceWaveVisualizer } from '../components/ui/VoiceWaveVisualizer';
import { PriceSpreadBar } from '../components/ui/PriceSpreadBar';
import { PromptChip } from '../components/ui/PromptChip';
import {
  Mic,
  Square,
  RotateCcw,
  Send,
  AlertCircle,
  Sparkles,
  Globe,
  Tag,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  Repeat,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { VoiceQueryResponse, RecentConversation, PriceRecord } from '../types';

type AssistantState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'generating_audio'
  | 'answered'
  | 'error'
  | 'permission_denied';

export const Home: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Voice Interaction State
  const [state, setState] = useState<AssistantState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [micTestPassed, setMicTestPassed] = useState<boolean>(false);

  // Audio recording & playback references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Recent queries in local storage
  const [recentQueries, setRecentQueries] = useState<RecentConversation[]>([]);

  // Suggested farmer queries
  const suggestedQueries = [
    { text: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?', langTag: 'HI' },
    { text: 'ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?', langTag: 'PA' },
    { text: 'What is the wheat price in Punjab today?', langTag: 'EN' },
    { text: 'आज सिरसा में सरसों का क्या भाव है?', langTag: 'HI' },
  ];

  // Auto-run if query param is passed
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setTextInput(q);
      executeTextQuery(q);
    }
  }, [searchParams]);

  // Load recent conversations
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mandisaathi_recent_conversations');
      if (stored) {
        setRecentQueries(JSON.parse(stored).slice(0, 4));
      }
    } catch {
      // Local storage fallback
    }
  }, [response]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudioRecording();
      stopAudioPlayback();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const saveConversation = (query: string, reply: string, lang: string) => {
    try {
      const conv: RecentConversation = {
        id: Date.now().toString(),
        query,
        response: reply,
        language: lang,
        timestamp: new Date().toISOString(),
      };
      const existing = localStorage.getItem('mandisaathi_recent_conversations');
      const list: RecentConversation[] = existing ? JSON.parse(existing) : [];
      list.unshift(conv);
      localStorage.setItem('mandisaathi_recent_conversations', JSON.stringify(list.slice(0, 10)));
      setRecentQueries(list.slice(0, 4));
    } catch {
      // Local storage fallback
    }
  };

  // Start Browser MediaRecorder
  const startAudioRecording = async () => {
    setErrorMessage(null);
    setTranscription('');
    setResponse(null);
    stopAudioPlayback();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState('permission_denied');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setState('recording');
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Set up AudioContext Analyser for dynamic wave reactivity
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += (dataArray[i] ?? 0);
            }
            const avg = sum / bufferLength / 255;
            setAudioLevel(avg);
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch {
        setAudioLevel(0.5);
      }

      // Check supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioProcessing(audioBlob);

        // Stop all audio stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setState('permission_denied');
      } else {
        setState('error');
        setErrorMessage(errorObj.message || 'Microphone initialization failed.');
      }
    }
  };

  const stopAudioRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('transcribing');
    }
  };

  // Submit Audio Blob to Backend
  const handleAudioProcessing = async (blob: Blob) => {
    try {
      setState('processing');
      const langParam = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
      const result = await api.sendVoiceAudio(blob, langParam);

      setTranscription(result.transcript);
      setResponse(result);
      setState('answered');

      saveConversation(result.transcript, result.responseText, result.detectedLanguage);

      if (result.audioBase64) {
        playAudioResponse(result);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setState('error');
      setErrorMessage(errorObj.message || 'Failed to process voice query.');
    }
  };

  // Execute fallback text query
  const executeTextQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setTextInput('');
    setErrorMessage(null);
    setTranscription(queryText);
    setState('processing');
    stopAudioPlayback();

    try {
      const langParam = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
      const result = await api.sendVoiceQuery(queryText.trim(), langParam);

      setResponse(result);
      setState('answered');

      saveConversation(queryText, result.responseText, result.detectedLanguage);

      if (result.audioBase64) {
        playAudioResponse(result);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setState('error');
      setErrorMessage(errorObj.message || 'Failed to process query.');
    }
  };

  // Playback Gnani Timbre Audio
  const playAudioResponse = (res: VoiceQueryResponse) => {
    stopAudioPlayback();

    if (res.audioBase64) {
      try {
        const audioSrc = `data:audio/wav;base64,${res.audioBase64}`;
        const audio = new Audio(audioSrc);
        audioElementRef.current = audio;

        audio.onplay = () => setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          fallbackWebSpeech(res.responseText);
        };

        audio.play().catch(() => {
          fallbackWebSpeech(res.responseText);
        });
      } catch {
        fallbackWebSpeech(res.responseText);
      }
    } else {
      fallbackWebSpeech(res.responseText);
    }
  };

  // Web Speech API client fallback
  const fallbackWebSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudioPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const toggleAudioPlayback = () => {
    if (isPlayingAudio) {
      stopAudioPlayback();
    } else if (response) {
      playAudioResponse(response);
    }
  };

  // Microphone readiness probe
  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicTestPassed(true);
      stream.getTracks().forEach((track) => track.stop());
      setTimeout(() => setMicTestPassed(false), 3000);
    } catch {
      setState('permission_denied');
    }
  };

  const getRecordCommodityName = (r: PriceRecord) => {
    if (language === 'hi') return r.commodityNameHi || r.commodityNameEn;
    if (language === 'pa') return r.commodityNamePa || r.commodityNameEn;
    return r.commodityNameEn;
  };

  const getRecordMandiName = (r: PriceRecord) => {
    if (language === 'hi') return r.mandiNameHi || r.mandiNameEn;
    if (language === 'pa') return r.mandiNamePa || r.mandiNameEn;
    return r.mandiNameEn;
  };

  // Background Data Feeds for Benchmark Rates & Mandis
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 lg:pb-8">
      {/* Editorial Hero Header */}
      <section className="pt-2 sm:pt-4">
        <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
          <span>{getGreeting()} • Official APMC Market Telemetry</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-charcoal tracking-tight max-w-3xl leading-[1.2]">
          {language === 'hi'
            ? 'बोलकर सटीक मंडी भाव और कृषि आसूचना'
            : language === 'pa'
            ? 'ਬੋਲ ਕੇ ਸਹੀ ਮੰਡੀ ਭਾਅ ਅਤੇ ਖੇਤੀਬਾੜੀ ਸਹਾਇਤਾ'
            : 'Multilingual Voice Intelligence Grounded in Verified APMC Telemetry'}
        </h1>
        <p className="text-xs sm:text-base text-charcoal-muted mt-2 max-w-2xl leading-relaxed">
          {language === 'hi'
            ? 'अपनी बोली (हिन्दी, पंजाबी, अंग्रेजी) में बोलें और सरकारी एगमार्कनेट पोर्टल से सत्यापित दैनिक नीलामी दरें तुरंत प्राप्त करें।'
            : language === 'pa'
            ? 'ਆਪਣੀ ਬੋਲੀ (ਪੰਜਾਬੀ, ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ) ਵਿੱਚ ਬੋਲੋ ਅਤੇ ਸਰਕਾਰੀ ਮੰਡੀ ਬੋਰਡ ਤੋਂ ਪ੍ਰਮਾਣਿਤ ਅੱਜ ਦੇ ਭਾਅ ਜਾਣੋ।'
            : 'Speak naturally in Hindi, Punjabi, or English to access verified daily closed auction prices from APMC markets across India.'}
        </p>

        {/* Dialect Fast Selector */}
        <div className="mt-3 flex items-center space-x-2 text-xs">
          <Globe className="w-3.5 h-3.5 text-forest" />
          <span className="text-charcoal-muted">Dialect:</span>
          <div className="inline-flex items-center bg-surface border border-hairline p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                language === 'hi' ? 'bg-forest text-white shadow-subtle' : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('pa')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                language === 'pa' ? 'bg-forest text-white shadow-subtle' : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              ਪੰਜਾਬੀ
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                language === 'en' ? 'bg-forest text-white shadow-subtle' : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              English
            </button>
          </div>

          {/* Test Mic utility button for readiness diagnostics */}
          <button
            type="button"
            onClick={testMicrophone}
            className="ml-auto text-[11px] font-mono text-charcoal-muted hover:text-forest underline cursor-pointer"
          >
            {micTestPassed ? '✓ Microphone Ready' : 'Test Mic'}
          </button>
        </div>
      </section>

      {/* Primary Voice Interaction Centerpiece (Merged Voice Studio) */}
      <section className="rounded-2xl border border-hairline bg-surface-white p-6 sm:p-10 shadow-card text-center relative overflow-hidden">
        {/* State Status Indicator Pill */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
              state === 'recording'
                ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse'
                : state === 'transcribing'
                ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                : state === 'processing'
                ? 'bg-forest-50 text-forest border border-forest/20'
                : state === 'answered'
                ? 'bg-forest-50 text-forest border border-forest/20'
                : state === 'error' || state === 'permission_denied'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-surface text-charcoal-muted border border-hairline'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'recording'
                  ? 'bg-red-600 animate-ping'
                  : state === 'transcribing'
                  ? 'bg-amber-500'
                  : state === 'processing'
                  ? 'bg-forest'
                  : state === 'answered'
                  ? 'bg-forest'
                  : state === 'permission_denied'
                  ? 'bg-red-500'
                  : 'bg-charcoal-muted'
              }`}
            />
            <span>
              {state === 'recording'
                ? t('micRecording')
                : state === 'transcribing'
                ? t('micTranscribing')
                : state === 'processing'
                ? t('micProcessing')
                : state === 'answered'
                ? 'Query Grounded & Verified'
                : state === 'permission_denied'
                ? t('permissionDeniedTitle')
                : state === 'error'
                ? 'Error'
                : t('micIdle')}
            </span>
          </span>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <VoiceWaveVisualizer
          isRecording={state === 'recording'}
          isProcessing={state === 'transcribing' || state === 'processing'}
          audioLevel={audioLevel}
        />

        {/* Big Interactive Action Button */}
        <div className="my-6 flex justify-center">
          {state === 'recording' ? (
            <button
              type="button"
              onClick={stopAudioRecording}
              className="inline-flex items-center space-x-2.5 px-7 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Process Voice</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-red-800/80 text-[11px] font-mono font-medium">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startAudioRecording}
              disabled={state === 'transcribing' || state === 'processing'}
              className="inline-flex items-center space-x-3 px-8 py-4 rounded-full bg-forest hover:bg-forest-light text-harvest font-bold text-base shadow-voice transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              aria-label="Activate Voice Assistant"
            >
              <Mic className="w-5 h-5 stroke-[2.4] text-harvest" />
              <span>{state === 'answered' ? t('tryAgain') : t('micIdle')}</span>
            </button>
          )}
        </div>

        {/* Real-time / Completed Transcription Display */}
        {transcription && (
          <div className="max-w-xl mx-auto my-4 p-4 bg-surface rounded-xl border border-hairline text-left shadow-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider">
                {t('transcriptionLabel')}
              </span>
              {response?.detectedLanguage && (
                <span className="text-[10px] font-mono text-forest bg-forest-50 px-2 py-0.5 rounded border border-forest/20 font-medium">
                  {response.detectedLanguage}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-charcoal leading-relaxed">
              "{transcription}"
            </p>
          </div>
        )}

        {/* Verified Grounded Response Card */}
        {response && state === 'answered' && (
          <div className="max-w-2xl mx-auto mt-6 p-5 sm:p-6 bg-forest-50/50 rounded-xl border border-forest/25 text-left space-y-4 shadow-subtle">
            {/* Header of Response Box */}
            <div className="flex items-center justify-between border-b border-forest/20 pb-3 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-forest" />
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  {t('responseLabel')}
                </span>
                {response.intent && response.intent !== 'UNKNOWN' && (
                  <span className="text-[10px] font-semibold bg-surface-white border border-forest/25 text-forest-dark px-2 py-0.5 rounded font-mono">
                    {response.intent}
                  </span>
                )}
              </div>

              {/* Spoken Audio Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-charcoal-muted">
                  {response.audioBase64
                    ? (response.isLiveGnaniConnected ? t('audioSourceGnani') : t('audioSourceSandbox'))
                    : t('audioSourceBrowser')}
                </span>

                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-forest text-white hover:bg-forest-light shadow-subtle'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>{t('stopAudio')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{t('listenAudio')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => playAudioResponse(response)}
                  title="Replay Audio"
                  className="p-1 text-charcoal-muted hover:text-forest bg-surface-white border border-forest/20 rounded-lg cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Extracted Entities Tag Row */}
            {response.extractedEntities && Object.keys(response.extractedEntities).length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 py-1">
                <span className="text-[10px] uppercase font-bold text-charcoal-muted mr-1">
                  {t('extractedEntitiesLabel')}:
                </span>
                {Object.entries(response.extractedEntities).map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex items-center space-x-1 text-[11px] font-medium bg-surface-white border border-forest/25 text-charcoal px-2 py-0.5 rounded-md"
                  >
                    <Tag className="w-3 h-3 text-forest" />
                    <span>
                      {key}: <strong>{val}</strong>
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Response Prose Text with Quote Styling */}
            <div className="border-l-2 border-forest/60 pl-3.5 py-0.5">
              <p className="text-sm sm:text-base leading-relaxed text-charcoal font-medium">
                {response.responseText}
              </p>
            </div>

            {/* Verified Mandi Rate Cards (Grounding) */}
            {response.priceRecords && response.priceRecords.length > 0 && (
              <div className="pt-3 border-t border-forest/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-forest-dark uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-forest" />
                    <span>{t('mandiRateCardTitle')}</span>
                  </span>
                  <span className="text-[10px] text-charcoal-muted bg-surface-white px-2 py-0.5 rounded border border-forest/15 font-mono">
                    {response.source || 'Agmarknet (data.gov.in)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {response.priceRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-surface-white p-3.5 rounded-xl border border-forest/20 shadow-subtle flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-charcoal text-sm">
                            {getRecordCommodityName(rec)}
                          </span>
                          <span className="text-[10px] text-charcoal-muted font-mono">
                            {rec.priceDate}
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-muted mb-2">
                          {getRecordMandiName(rec)}, {rec.state}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-hairline flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-charcoal-muted uppercase block font-semibold">
                            Modal Rate
                          </span>
                          <span className="text-lg font-bold text-forest tnum font-mono">
                            ₹{rec.modalPrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[11px] font-normal text-charcoal-muted">
                              / {rec.unit || 'Quintal'}
                            </span>
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-charcoal-muted font-mono">
                          <div>Min: ₹{rec.minPrice}</div>
                          <div>Max: ₹{rec.maxPrice}</div>
                        </div>
                      </div>

                      <PriceSpreadBar
                        minPrice={rec.minPrice}
                        modalPrice={rec.modalPrice}
                        maxPrice={rec.maxPrice}
                        unit={rec.unit || 'Quintal'}
                        className="mt-2.5 pt-2 border-t border-hairline"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provenance & Engine notice */}
            <div className="pt-2 border-t border-forest/15 flex items-center justify-between text-[11px] text-charcoal-muted">
              <span>{response.engineNotice}</span>
              {response.isLiveGnaniConnected ? (
                <span className="text-forest font-semibold">● Live Gnani AI Connected</span>
              ) : (
                <span className="text-amber-800 font-semibold">● Development AI Sandbox</span>
              )}
            </div>

            {/* Follow-up / Related prompt pills */}
            {response.relatedQueries && response.relatedQueries.length > 0 && (
              <div className="pt-2 border-t border-forest/15">
                <span className="text-[11px] text-charcoal-muted font-semibold block mb-2">
                  Follow-up queries:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {response.relatedQueries.map((rq, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => executeTextQuery(rq)}
                      className="text-xs px-2.5 py-1 rounded-full bg-surface-white hover:bg-forest-50 border border-forest/20 text-forest-dark font-medium transition-colors cursor-pointer"
                    >
                      {rq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Permission Denied UI Guide */}
        {state === 'permission_denied' && (
          <div className="max-w-xl mx-auto my-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-left space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
              <span>{t('permissionDeniedTitle')}</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              {t('permissionDeniedGuide')}
            </p>
            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={startAudioRecording}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Retry Microphone
              </button>
              <button
                type="button"
                onClick={() => setState('idle')}
                className="px-3 py-1.5 bg-surface-white border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Use Text Input Below
              </button>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && state === 'error' && (
          <div className="max-w-xl mx-auto my-4 p-4 bg-red-50 border border-red-200 rounded-xl text-left flex items-start space-x-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Voice Gateway Notice</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setState('idle');
              }}
              className="p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Fallback Text Input Form */}
        <div className="mt-6 pt-5 border-t border-hairline max-w-xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeTextQuery(textInput);
            }}
            className="flex items-center bg-surface border border-hairline rounded-full px-3.5 py-1.5 shadow-subtle focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 transition-all"
          >
            <Search className="w-4 h-4 text-forest-light ml-1 mr-2 shrink-0" />
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('typeQueryPlaceholder')}
              className="w-full bg-transparent text-xs text-charcoal placeholder-charcoal-muted focus:outline-none py-1"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || state === 'transcribing' || state === 'processing'}
              className="p-2 rounded-full bg-forest hover:bg-forest-light text-white transition-all disabled:opacity-40 cursor-pointer shrink-0 ml-1.5 shadow-subtle"
              aria-label="Send Query"
            >
              <Send className="w-3.5 h-3.5 text-harvest" />
            </button>
          </form>
        </div>

        {/* Suggested Queries Chips */}
        <div className="mt-6 pt-5 border-t border-hairline max-w-3xl mx-auto">
          <div className="text-[11px] font-semibold text-charcoal-subtle uppercase tracking-wider mb-2.5 flex items-center justify-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-harvest-dark" />
            <span>{t('suggestedQueriesLabel')}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQueries.map((q, idx) => (
              <PromptChip
                key={idx}
                text={q.text}
                langTag={q.langTag}
                onClick={(queryText) => {
                  setTextInput(queryText);
                  executeTextQuery(queryText);
                }}
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
              {mandis.length} Active APMCs
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
                  onClick={() => {
                    setTextInput(item.query);
                    executeTextQuery(item.query);
                  }}
                  className="p-3 rounded-lg border border-hairline hover:border-forest/30 bg-surface/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-muted mb-1">
                    <span className="font-semibold text-forest truncate max-w-[220px]">
                      "{item.query}"
                    </span>
                    <span className="text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal line-clamp-2 leading-relaxed">
                    {item.response}
                  </p>
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
