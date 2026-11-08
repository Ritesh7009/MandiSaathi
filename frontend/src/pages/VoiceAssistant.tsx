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
    'सरसों का मॉडल भाव क्या है?',
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
        // Fallback if AudioContext is restricted
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
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);

        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (recordedBlob.size > 0) {
          await submitAudioBlob(recordedBlob);
        } else {
          setState('idle');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice into 250ms chunks

      // Auto stop after 7 seconds max to prevent runaway recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopAudioRecording();
        }
      }, 7000);
    } catch (err: unknown) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        setState('permission_denied');
      } else {
        setState('error');
        setErrorMessage(t('micPermissionError'));
      }
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Submit audio blob to Gnani Prisma STT backend
  const submitAudioBlob = async (blob: Blob) => {
    setState('transcribing');
    try {
      const res = await api.sendVoiceAudio(blob, language);
      setTranscription(res.transcript);
      setResponse(res);
      setState('answered');
      saveConversation(res.transcript, res.responseText, res.detectedLanguage);

      // Play audio response (Gnani Timbre synthesized audio or browser fallback)
      playAudioResponse(res);
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Voice audio processing failed');
    }
  };

  // Execute text query fallback
  const executeTextQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setTranscription(queryText);
    setResponse(null);
    setErrorMessage(null);
    stopAudioPlayback();
    setState('processing');

    try {
      const res = await api.sendVoiceQuery(queryText, language);
      setResponse(res);
      setState('answered');
      saveConversation(queryText, res.responseText, res.detectedLanguage);

      playAudioResponse(res);
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Voice query failed');
    }
  };

  // Audio Playback Handling: Gnani Timbre Base64 WAV or Browser Speech Synthesis Fallback
  const playAudioResponse = (res: VoiceQueryResponse) => {
    stopAudioPlayback();

    if (res.audioBase64) {
      // Play real audio synthesized by Gnani Timbre TTS
      try {
        const audioSrc = `data:audio/wav;base64,${res.audioBase64}`;
        const audio = new Audio(audioSrc);
        audioElementRef.current = audio;

        audio.onplay = () => setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          // If WAV decode fails, fall back to browser synthesis
          speakResponseFallback(res.responseText, res.detectedLanguage);
        };

        audio.play().catch(() => {
          // Autoplay was prevented by browser policy, user can tap play button
          setIsPlayingAudio(false);
        });
        return;
      } catch {
        // Fall back
      }
    }

    // Local browser speech synthesis fallback
    speakResponseFallback(res.responseText, res.detectedLanguage);
  };

  const speakResponseFallback = (text: string, langCode: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode || (language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN');
    utterance.rate = 0.95;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopAudioPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (window.speechSynthesis) {
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
      {/* Header */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-forest text-harvest">
                PHASE 3: GNANI AI & AGMARKNET
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal">{t('voiceTitle')}</h2>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1">{t('voiceSubtitle')}</p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-charcoal-muted">
            <Globe className="w-3.5 h-3.5 text-forest" />
            <span>Target Dialect:</span>
            <span className="font-semibold text-charcoal uppercase bg-ivory px-2 py-0.5 rounded border border-ivory-dark">
              {language === 'hi' ? 'हिन्दी (hi-IN)' : language === 'pa' ? 'ਪੰਜਾਬੀ (pa-IN)' : 'English (en-IN)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Voice Interactive Canvas */}
      <div className="bg-white border border-ivory-dark rounded-md p-6 sm:p-8 shadow-subtle text-center">
        {/* State Label */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
              state === 'recording'
                ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                : state === 'transcribing'
                ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                : state === 'processing'
                ? 'bg-harvest-50 text-forest-dark border border-harvest/40'
                : state === 'answered'
                ? 'bg-forest-50 text-forest border border-forest/20'
                : state === 'error' || state === 'permission_denied'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-ivory text-charcoal-muted border border-ivory-dark'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'recording'
                  ? 'bg-red-600'
                  : state === 'transcribing'
                  ? 'bg-amber-500'
                  : state === 'processing'
                  ? 'bg-harvest-dark'
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
        <div className="my-6">
          {state === 'recording' ? (
            <button
              type="button"
              onClick={stopAudioRecording}
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Process Voice</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startAudioRecording}
              disabled={state === 'transcribing' || state === 'processing'}
              className="inline-flex items-center space-x-2.5 px-8 py-4 rounded-full bg-forest hover:bg-forest-dark text-harvest font-bold text-base shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Mic className="w-5 h-5 stroke-[2.4]" />
              <span>{state === 'answered' ? t('tryAgain') : t('micIdle')}</span>
            </button>
          )}
        </div>

        {/* Real-time / Completed Transcription Display */}
        {transcription && (
          <div className="max-w-xl mx-auto my-4 p-3.5 bg-ivory/60 rounded border border-ivory-dark text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider">
                {t('transcriptionLabel')}
              </span>
              {response?.detectedLanguage && (
                <span className="text-[10px] font-mono text-forest bg-forest/10 px-2 py-0.5 rounded font-medium">
                  {response.detectedLanguage}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-charcoal">"{transcription}"</p>
          </div>
        )}

        {/* Answer Box */}
        {response && state === 'answered' && (
          <div className="max-w-2xl mx-auto mt-6 p-5 sm:p-6 bg-forest-50/50 rounded-md border border-forest/30 text-left space-y-4">
            {/* Header of Response Box */}
            <div className="flex items-center justify-between border-b border-forest/20 pb-3 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-forest" />
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  {t('responseLabel')}
                </span>
                {response.intent && response.intent !== 'UNKNOWN' && (
                  <span className="text-[10px] font-semibold bg-white border border-forest/30 text-forest-dark px-2 py-0.5 rounded">
                    {response.intent}
                  </span>
                )}
              </div>

              {/* Spoken Audio Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] sm:text-[11px] text-charcoal-muted">
                  {response.audioBase64
                    ? (response.isLiveGnaniConnected ? t('audioSourceGnani') : t('audioSourceSandbox'))
                    : t('audioSourceBrowser')}
                </span>

                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-forest text-white hover:bg-forest-light'
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
                  className="p-1 text-charcoal-muted hover:text-forest bg-white border border-forest/20 rounded cursor-pointer"
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
                    className="inline-flex items-center space-x-1 text-[11px] font-medium bg-white border border-forest/25 text-charcoal px-2 py-0.5 rounded"
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
                  <span className="text-[10px] text-charcoal-muted bg-white px-2 py-0.5 rounded border border-forest/15 font-mono">
                    {response.source || 'Agmarknet (data.gov.in)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {response.priceRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white p-3 rounded border border-forest/20 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-charcoal">
                            {getRecordCommodityName(rec)}
                          </span>
                          <span className="text-[11px] text-charcoal-muted">
                            {rec.priceDate}
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-muted mb-2">
                          {getRecordMandiName(rec)}, {rec.state}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-ivory-dark flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-charcoal-muted uppercase block">
                            Modal Rate
                          </span>
                          <span className="text-base font-bold text-forest">
                            ₹{rec.modalPrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[11px] font-normal text-charcoal-muted">
                              / {rec.unit || 'Quintal'}
                            </span>
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-charcoal-muted">
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
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-forest-50 border border-forest/20 text-forest-dark font-medium transition-colors cursor-pointer"
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
          <div className="max-w-xl mx-auto my-4 p-4 bg-amber-50 border border-amber-300 rounded text-left space-y-2">
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
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Retry Microphone
              </button>
              <button
                type="button"
                onClick={() => setState('idle')}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded text-xs font-semibold cursor-pointer"
              >
                Use Text Input Below
              </button>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && state === 'error' && (
          <div className="max-w-xl mx-auto my-4 p-4 bg-red-50 border border-red-200 rounded text-left flex items-start space-x-3 text-red-800 text-xs">
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
      </div>

      {/* Fallback Text Input Form */}
      <div className="bg-white border border-ivory-dark rounded-md p-4 sm:p-5 shadow-subtle">
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
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-ivory border border-ivory-dark rounded focus:outline-none focus:ring-1 focus:ring-forest text-charcoal"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || state === 'transcribing' || state === 'processing'}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded bg-forest hover:bg-forest-light text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4 text-harvest" />
            <span>{t('sendTextQuery')}</span>
          </button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-ivory-dark">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTextInput(q);
                executeTextQuery(q);
              }}
              className="text-[11px] px-2.5 py-1 rounded bg-ivory hover:bg-ivory-dark/70 text-charcoal font-medium transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Gnani Prisma / Timbre Architecture Status Disclosure */}
      <div className="bg-ivory/80 border border-ivory-dark rounded-md p-4 flex items-start space-x-3 text-xs text-charcoal">
        <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-forest-dark">{t('gnaniNoticeTitle')}</span>
            <span className="text-[10px] bg-harvest-50 text-forest-dark border border-harvest/40 px-1.5 py-0.2 rounded font-semibold">
              {t('gnaniDemoBadge')}
            </span>
          </div>
          <p className="text-charcoal-muted leading-relaxed">{t('gnaniNoticeText')}</p>
        </div>
      </div>
    </div>
  );
};
