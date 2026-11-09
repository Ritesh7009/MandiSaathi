import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage, ALL_RECOGNIZED_LANGUAGES } from '../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { api, ApiClientError } from '../services/apiClient';
import { convertTo16kHzWav } from '../utils/audioEncoder';
import { VoiceWaveVisualizer } from '../components/ui/VoiceWaveVisualizer';
import { PriceSpreadBar } from '../components/ui/PriceSpreadBar';
import { PromptChip } from '../components/ui/PromptChip';
import { AgriContourBackdrop } from '../components/ui/AgriContourBackdrop';
import { NumberTicker } from '../components/ui/NumberTicker';
import {
  Mic,
  Square,
  RotateCcw,
  Send,
  AlertCircle,
  HelpCircle,
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
  Terminal,
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
  const { language, setLanguage, t, getCommodityName, getMandiName } = useLanguage();
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
  const recordingStartTimeRef = useRef<number>(0);
  const maxRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [micTestPassed, setMicTestPassed] = useState<boolean>(false);
  const [isRequestInFlight, setIsRequestInFlight] = useState<boolean>(false);
  const [lastAudioDuration, setLastAudioDuration] = useState<number | null>(null);
  const [lastAudioSize, setLastAudioSize] = useState<number | null>(null);
  const [clientRoundtripMs, setClientRoundtripMs] = useState<number | null>(null);

  // Audio recording & playback references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Recent queries in local storage
  const [recentQueries, setRecentQueries] = useState<RecentConversation[]>([]);

  // Suggested farmer queries localized for the active dialect
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
          { text: 'ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?', langTag: 'PA' },
          { text: 'ਖੰਨਾ ਮੰਡੀ ਵਿੱਚ ਬਾਸਮਤੀ ਦਾ ਰੇਟ ਕੀ ਚੱਲ ਰਿਹਾ ਹੈ?', langTag: 'PA' },
          { text: 'ਕਪਾਹ ਦੀ ਤਾਜ਼ਾ ਬੋਲੀ ਦਾ ਭਾਅ ਦੱਸੋ', langTag: 'PA' },
          { text: 'ਪੀਐਮ-ਕਿਸਾਨ ਸਕੀਮ ਲਈ ਕਿਹੜੇ ਕਾਗਜ਼ ਚਾਹੀਦੇ ਹਨ?', langTag: 'PA' },
        ];
      case 'en':
        return [
          { text: 'What is the wheat price in Punjab today?', langTag: 'EN' },
          { text: 'Compare cotton rates between Sirsa and Khanna mandis', langTag: 'EN' },
          { text: 'What is the modal mustard rate in Sirsa?', langTag: 'EN' },
          { text: 'What documents are required for PM-KISAN?', langTag: 'EN' },
        ];
      default:
        return [
          { text: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?', langTag: 'HI' },
          { text: 'आज सिरसा में सरसों का क्या भाव है?', langTag: 'HI' },
          { text: 'खन्ना और सिरसा मंडी में गेहूं के भाव की तुलना करें', langTag: 'HI' },
          { text: 'पीएम-किसान सम्मान निधि के लिए क्या दस्तावेज चाहिए?', langTag: 'HI' },
        ];
    }
  }, [language]);

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
      if (maxRecordingTimeoutRef.current) clearTimeout(maxRecordingTimeoutRef.current);
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

  // Start Browser MediaRecorder (auto-stops at 15s; resamples to 16kHz mono WAV)
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
      recordingStartTimeRef.current = Date.now();

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Automatically stop recording at 15 seconds
      if (maxRecordingTimeoutRef.current) clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopAudioRecording();
        }
      }, 15000);

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

      // Check supported MIME type for recording
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
        if (maxRecordingTimeoutRef.current) {
          clearTimeout(maxRecordingTimeoutRef.current);
          maxRecordingTimeoutRef.current = null;
        }

        const durationMs = Date.now() - recordingStartTimeRef.current;

        // Reject audio clips under 1 second with a clear message
        if (durationMs < 1000) {
          setState('error');
          const shortMsg =
            language === 'hi'
              ? 'ऑडियो 1 सेकंड से छोटा है। कृपया कम से कम 1 सेकंड बोलें।'
              : language === 'pa'
              ? 'ਆਡੀਓ 1 ਸਕਿੰਟ ਤੋਂ ਛੋਟੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ 1 ਸਕਿੰਟ ਬੋਲੋ।'
              : 'Audio clip too short (under 1 second). Please speak for at least 1 second.';
          setErrorMessage(shortMsg);
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        try {
          setState('transcribing');
          const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });

          // Resample to 16 kHz mono 16-bit PCM WAV for Gnani Prisma STT
          const processed = await convertTo16kHzWav(rawBlob);
          setLastAudioDuration(processed.durationSeconds);
          setLastAudioSize(processed.byteSize);

          await handleAudioProcessing(processed.blob);
        } catch (convErr) {
          setState('error');
          setErrorMessage('Audio conversion failed: ' + (convErr instanceof Error ? convErr.message : String(convErr)));
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
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
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Submit 16kHz WAV Audio Blob to Backend with Concurrency & Error Distinction
  const handleAudioProcessing = async (wavBlob: Blob) => {
    const uploadStart = Date.now();
    setIsRequestInFlight(true);
    setErrorMessage(null);

    try {
      setState('processing');
      const langParam = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
      const result = await api.sendVoiceAudio(wavBlob, langParam);

      const elapsed = Date.now() - uploadStart;
      setClientRoundtripMs(elapsed);

      setTranscription(result.transcript || '');
      setResponse(result);

      if (result.statusCode && result.statusCode !== 200) {
        setState('error');
        setErrorMessage(result.engineNotice || result.responseText);
        return;
      }

      if (!result.transcript || result.transcript.trim() === '') {
        setState('error');
        const emptyMsg =
          language === 'hi'
            ? 'कोई आवाज़ पहचानी नहीं जा सकी। कृपया माइक्रोफ़ोन के पास आकर दोबारा बोलें।'
            : language === 'pa'
            ? 'ਕੋਈ ਆਵਾਜ਼ ਸਮਝ ਨਹੀਂ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।'
            : 'No speech was detected or transcript was empty. Please speak clearly into the microphone.';
        setErrorMessage(emptyMsg);
        return;
      }

      setState('answered');
      saveConversation(result.transcript, result.responseText, result.detectedLanguage);

      if (result.audioBase64) {
        playAudioResponse(result);
      }
    } catch (err: unknown) {
      const elapsed = Date.now() - uploadStart;
      setClientRoundtripMs(elapsed);
      setState('error');

      if (err instanceof ApiClientError) {
        if (err.voiceResponse?.transcript) {
          setTranscription(err.voiceResponse.transcript);
        }
        if (err.voiceResponse) {
          setResponse(err.voiceResponse);
        }

        const status = err.status;
        if (status === 401 || status === 403) {
          setErrorMessage('Gnani AI authentication failure: Invalid API key or credits exhausted (HTTP ' + status + ').');
        } else if (status === 402) {
          setErrorMessage('Gnani AI account credits exhausted (HTTP 402).');
        } else if (status === 429) {
          setErrorMessage('Gnani AI STT rate limit reached (HTTP 429). Too many requests in flight. Please wait a moment.');
        } else if (status === 504 || status === 0) {
          setErrorMessage('Voice request timed out (HTTP ' + status + '). Upstream speech server took too long to respond.');
        } else if (status >= 500) {
          setErrorMessage('Server error processing voice query (HTTP ' + status + ').');
        } else {
          setErrorMessage(err.message || 'Voice request failed.');
        }
      } else {
        const errorObj = err as { message?: string };
        setErrorMessage(errorObj.message || 'Failed to process voice query.');
      }
    } finally {
      setIsRequestInFlight(false);
    }
  };

  // Execute fallback text query
  const executeTextQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setTextInput('');
    setErrorMessage(null);
    setTranscription(queryText);
    setState('processing');
    setIsRequestInFlight(true);
    stopAudioPlayback();

    const queryStart = Date.now();
    try {
      const langParam = language;
      const result = await api.sendVoiceQuery(queryText, langParam);

      setClientRoundtripMs(Date.now() - queryStart);
      setTranscription(result.transcript || queryText);
      setResponse(result);
      setState('answered');

      saveConversation(result.transcript || queryText, result.responseText, result.detectedLanguage);

      if (result.audioBase64) {
        playAudioResponse(result);
      }
    } catch (err: unknown) {
      setClientRoundtripMs(Date.now() - queryStart);
      const errorObj = err as { message?: string };
      setState('error');
      setErrorMessage(errorObj.message || 'Failed to process query.');
    } finally {
      setIsRequestInFlight(false);
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
    return getCommodityName(r.commodityCode, r.commodityNameHi || r.commodityNameEn);
  };

  const getRecordMandiName = (r: PriceRecord) => {
    return getMandiName(r.mandiCode, r.mandiNameHi || r.mandiNameEn);
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
      {/* Editorial Hero Header with Topographic Contour Backdrop */}
      <section className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-white p-6 sm:p-8 shadow-card">
        <AgriContourBackdrop className="opacity-60" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-forest animate-pulse" />
            <span>{getGreeting()} • {t('verifiedMarketRecords')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-charcoal tracking-tight max-w-3xl leading-[1.25]">
            {t('heroHeadline')}
          </h1>
          <p className="text-xs sm:text-base text-charcoal-muted mt-2 max-w-2xl leading-relaxed">
            {t('heroSubtitle')}
          </p>

          {/* Dialect Fast Selector (10 Gnani-Supported Languages) with 38px+ Touch Target */}
          <div className="mt-4 pt-3 border-t border-hairline/70 flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-1.5 text-charcoal-muted font-medium">
              <Globe className="w-4 h-4 text-forest" />
              <span>{t('languageSectionTitle')}:</span>
            </div>
            <div className="flex items-center flex-wrap gap-1">
              {ALL_RECOGNIZED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tactile-press flex items-center justify-center ${
                    language === l.code
                      ? 'bg-forest text-white shadow-subtle font-bold ring-1 ring-forest-dark'
                      : 'bg-surface text-charcoal-muted hover:text-charcoal border border-hairline'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Test Mic utility button for readiness diagnostics */}
            <button
              type="button"
              onClick={testMicrophone}
              className="ml-auto text-xs font-mono text-charcoal-muted hover:text-forest underline cursor-pointer py-1"
            >
              {micTestPassed ? `✓ ${t('micReady')}` : t('testMic')}
            </button>
          </div>
        </div>
      </section>

      {/* Primary Voice Interaction Centerpiece (Merged Voice Studio) */}
      <section className="rounded-2xl border border-hairline bg-surface-white p-5 sm:p-8 shadow-card text-center relative overflow-hidden">
        {/* State Status Indicator Pill */}
        <div className="mb-3">
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
                ? t('queryVerifiedStatus')
                : state === 'permission_denied'
                ? t('permissionDeniedTitle')
                : state === 'error'
                ? t('error')
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
        <div className="my-4 sm:my-5 flex justify-center">
          {state === 'recording' ? (
            <button
              type="button"
              onClick={stopAudioRecording}
              className="inline-flex items-center space-x-2.5 px-7 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{t('stopAndProcessVoice')}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-red-800/80 text-xs font-mono font-medium">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startAudioRecording}
              disabled={isRequestInFlight || state === 'transcribing' || state === 'processing'}
              className="inline-flex items-center space-x-3 px-8 py-4 rounded-full bg-forest-900 hover:bg-forest text-white font-bold text-base shadow-voice transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer tactile-press ring-2 ring-forest/30"
              aria-label="Activate Voice Assistant"
            >
              <Mic className="w-5 h-5 stroke-[2.4] text-white" />
              <span>
                {isRequestInFlight || state === 'transcribing' || state === 'processing'
                  ? t('processing')
                  : state === 'answered'
                  ? t('tryAgain')
                  : t('micIdle')}
              </span>
            </button>
          )}
        </div>

        {/* Real-time / Completed Transcription Display */}
        {transcription && (
          <div data-testid="raw-transcript-box" className="max-w-xl mx-auto my-4 p-4 bg-surface rounded-xl border border-hairline text-left shadow-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
                {t('transcriptionLabel')}
              </span>
              {response?.detectedLanguage && (
                <span className="text-xs font-mono text-forest bg-forest-50 px-2 py-0.5 rounded border border-forest/20 font-medium">
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
                <CheckCircle className="w-4 h-4 text-forest" />
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  {t('responseLabel')}
                </span>
                {response.intent && response.intent !== 'UNKNOWN' && (
                  <span className="text-xs font-semibold bg-surface-white border border-forest/25 text-forest-dark px-2 py-0.5 rounded font-mono">
                    {response.intent}
                  </span>
                )}
              </div>

              {/* Spoken Audio Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-charcoal-muted">
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
              <div className="flex items-center flex-wrap gap-2 py-1">
                <span className="text-xs uppercase font-bold text-charcoal-muted mr-1">
                  {t('extractedEntitiesLabel')}:
                </span>
                {Object.entries(response.extractedEntities).map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium bg-surface-white border border-forest/25 text-charcoal px-2.5 py-1 rounded-md shadow-xs"
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
                  <span className="text-xs text-charcoal-muted bg-surface-white px-2 py-0.5 rounded border border-forest/15 font-mono">
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
                          <span className="text-xs text-charcoal-muted font-mono">
                            {rec.priceDate}
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-muted mb-2">
                          {getRecordMandiName(rec)}, {rec.state}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-hairline flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-charcoal-muted uppercase block font-semibold">
                            {t('modalPrice')}
                          </span>
                          <span className="text-lg font-bold text-forest tnum font-mono">
                            <NumberTicker value={rec.modalPrice} prefix="₹" />{' '}
                            <span className="text-xs font-normal text-charcoal-muted">
                              / {rec.unit || t('perQuintal')}
                            </span>
                          </span>
                        </div>
                        <div className="text-right text-xs text-charcoal-muted font-mono">
                          <div>{t('minPrice')}: ₹{rec.minPrice}</div>
                          <div>{t('maxPrice')}: ₹{rec.maxPrice}</div>
                        </div>
                      </div>

                      <PriceSpreadBar
                        minPrice={rec.minPrice}
                        modalPrice={rec.modalPrice}
                        maxPrice={rec.maxPrice}
                        unit={rec.unit || t('perQuintal')}
                        className="mt-2.5 pt-2 border-t border-hairline"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provenance & Engine notice */}
            <div className="pt-2 border-t border-forest/15 flex items-center justify-between text-xs text-charcoal-muted">
              <span>{response.engineNotice}</span>
              <span className="text-forest font-semibold">● {t('queryVerifiedStatus')}</span>
            </div>

            {/* Follow-up / Related prompt pills */}
            {response.relatedQueries && response.relatedQueries.length > 0 && (
              <div className="pt-2 border-t border-forest/15">
                <span className="text-xs text-charcoal-muted font-semibold block mb-2">
                  {t('suggestedQueriesLabel')}:
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

        {/* Collapsible Diagnostics & Debug Panel (Accessible via ?debug=1) */}
        {searchParams.get('debug') === '1' && (
          <div className="max-w-xl mx-auto my-3 text-left">
            <details className="group border border-hairline rounded-xl bg-surface/70 open:bg-surface transition-all text-xs overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer font-mono text-xs text-charcoal-muted hover:text-forest select-none">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-forest" />
                  <span className="font-semibold uppercase tracking-wider">Voice Gateway Diagnostics (Debug)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {response?.backendLatencyMs !== undefined && (
                    <span className="bg-forest-50 text-forest border border-forest/20 px-1.5 py-0.5 rounded text-xs">
                      Backend: {response.backendLatencyMs} ms
                    </span>
                  )}
                  <span className="text-charcoal-muted text-xs group-open:rotate-180 transition-transform">▼</span>
                </div>
              </summary>
              <div className="px-4 py-3 border-t border-hairline font-mono text-xs space-y-2 text-charcoal bg-surface-white/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-charcoal-muted block text-xs">LAST RAW TRANSCRIPT:</span>
                    <span className="font-semibold text-charcoal break-words">{transcription || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block text-xs">DETECTED INTENT:</span>
                    <span className="font-semibold text-forest">{response?.intent || 'None'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline/60">
                  <div>
                    <span className="text-charcoal-muted block text-xs">BACKEND LATENCY:</span>
                    <span className="font-semibold">{response?.backendLatencyMs !== undefined ? `${response.backendLatencyMs} ms` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block text-xs">GNANI STT LATENCY:</span>
                    <span className="font-semibold">{response?.sttLatencyMs !== undefined ? `${response.sttLatencyMs} ms` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block text-xs">CLIENT ROUNDTRIP:</span>
                    <span className="font-semibold">{clientRoundtripMs !== null ? `${clientRoundtripMs} ms` : 'N/A'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline/60">
                  <div>
                    <span className="text-charcoal-muted block text-xs">AUDIO DURATION:</span>
                    <span>{lastAudioDuration !== null ? `${lastAudioDuration.toFixed(2)}s` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block text-xs">AUDIO SIZE:</span>
                    <span>{lastAudioSize !== null ? `${(lastAudioSize / 1024).toFixed(1)} KB (16kHz WAV)` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block text-xs">STATUS / ERROR:</span>
                    <span className={response?.errorCode || state === 'error' ? 'text-red-600 font-semibold' : 'text-forest font-semibold'}>
                      {response?.statusCode ? `HTTP ${response.statusCode}` : state === 'error' ? 'ERROR' : 'OK'}
                      {response?.errorCode ? ` (${response.errorCode})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Fallback Text Input Form */}
        <div className="mt-4 pt-4 border-t border-hairline max-w-xl mx-auto">
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
        <div className="mt-4 pt-4 border-t border-hairline max-w-3xl mx-auto">
          <div className="text-xs font-semibold text-charcoal-subtle uppercase tracking-wider mb-2.5 flex items-center justify-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-forest" />
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
              {t('benchmarkTitle')}
            </h2>
            <p className="text-xs text-charcoal-muted">
              {t('benchmarkSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/prices')}
            className="text-xs font-semibold text-forest hover:text-forest-dark inline-flex items-center space-x-1 cursor-pointer"
          >
            <span>{t('viewAllRates')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Clean Data Stream */}
        <div className="border border-hairline rounded-xl bg-surface-white overflow-hidden shadow-subtle">
          <div className="divide-y divide-hairline">
            {priceRecords.slice(0, 3).map((record) => {
              const commName = getRecordCommodityName(record);
              const mandiName = getRecordMandiName(record);

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
                      <span>{t('arrivals')}: {record.arrivalQuantity} {record.unit || t('perQuintal')}</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-charcoal-subtle" />
                        <span>{t('reportingDate')}: {record.priceDate}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base sm:text-lg font-bold text-forest tnum font-mono">
                      <NumberTicker value={record.modalPrice} prefix="₹" />
                    </div>
                    <div className="text-[10px] text-charcoal-muted">
                      {t('minPrice')}: ₹{record.minPrice} – {t('maxPrice')}: ₹{record.maxPrice} / {record.unit || t('perQuintal')}
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
                    {getMandiName(mandi.code, mandi.nameHi || mandi.nameEn)}
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
