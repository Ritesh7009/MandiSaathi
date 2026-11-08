import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { VoiceWaveVisualizer } from '../components/ui/VoiceWaveVisualizer';
import {
  Mic,
  Square,
  RotateCcw,
  Send,
  AlertCircle,
  Sparkles,
  Info,
  Globe,
  Tag,
  CheckCircle,
  ShieldAlert,
  Play,
  Pause,
  Repeat,
  Volume2,
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

export const VoiceAssistant: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<AssistantState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Audio recording & playback references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Suggested prompts
  const suggestedQuestions = [
    'आज गेहूं का भाव क्या है?',
    'ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?',
    'What documents are needed for PM-KISAN?',
    'आज सिरसा में सरसों का क्या भाव है?',
  ];

  // Auto-run if query param is passed
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setTextInput(q);
      executeTextQuery(q);
    }
  }, [searchParams]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudioRecording();
      stopAudioPlayback();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-8">
      {/* Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Volume2 className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Dedicated Voice Interface</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {t('voiceTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            {t('voiceSubtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-charcoal-muted self-start sm:self-center">
          <Globe className="w-3.5 h-3.5 text-forest" />
          <span>Active Dialect:</span>
          <span className="font-semibold text-charcoal uppercase bg-surface px-2.5 py-1 rounded-md border border-hairline font-mono text-[11px]">
            {language === 'hi' ? 'हिन्दी (hi-IN)' : language === 'pa' ? 'ਪੰਜਾਬੀ (pa-IN)' : 'English (en-IN)'}
          </span>
        </div>
      </section>

      {/* Main Voice Interactive Canvas */}
      <section className="rounded-2xl border border-hairline bg-surface-white p-6 sm:p-10 shadow-card text-center relative overflow-hidden">
        {/* Status Indicator Pill */}
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
            </button>
          ) : (
            <button
              type="button"
              onClick={startAudioRecording}
              disabled={state === 'transcribing' || state === 'processing'}
              className="inline-flex items-center space-x-3 px-8 py-4 rounded-full bg-forest hover:bg-forest-light text-harvest font-bold text-base shadow-voice transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
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

        {/* Answer Box */}
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

            {/* Response Prose Text */}
            <p className="text-sm sm:text-base leading-relaxed text-charcoal font-medium">
              {response.responseText}
            </p>

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

            {/* Related prompt pills */}
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
      </section>

      {/* Fallback Text Input Form */}
      <section className="rounded-xl border border-hairline bg-surface-white p-4 sm:p-5 shadow-subtle">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeTextQuery(textInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t('typeQueryPlaceholder')}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-surface border border-hairline rounded-lg focus:outline-none focus:ring-1 focus:ring-forest text-charcoal"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || state === 'transcribing' || state === 'processing'}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-forest hover:bg-forest-light text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-subtle active:scale-[0.98]"
          >
            <Send className="w-4 h-4 text-harvest" />
            <span>{t('sendTextQuery')}</span>
          </button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-hairline">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTextInput(q);
                executeTextQuery(q);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface hover:bg-forest-50 border border-hairline text-charcoal font-medium transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Gnani Architecture Status Disclosure */}
      <footer className="rounded-xl border border-hairline bg-surface p-4 flex items-start space-x-3 text-xs text-charcoal">
        <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-forest-dark">{t('gnaniNoticeTitle')}</span>
            <span className="text-[10px] bg-forest-50 text-forest border border-forest/20 px-1.5 py-0.2 rounded font-semibold font-mono">
              {t('gnaniDemoBadge')}
            </span>
          </div>
          <p className="text-charcoal-muted leading-relaxed">{t('gnaniNoticeText')}</p>
        </div>
      </footer>
    </div>
  );
};
