import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { VoiceWaveVisualizer } from '../components/ui/VoiceWaveVisualizer';
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  AlertCircle,
  Sparkles,
  Info,
  Globe,
} from 'lucide-react';
import { VoiceQueryResponse, RecentConversation } from '../types';

type AssistantState = 'idle' | 'recording' | 'listening' | 'processing' | 'answered' | 'error';

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

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      stopAudioRecording();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      window.speechSynthesis?.cancel();
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
    window.speechSynthesis?.cancel();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(t('micPermissionError'));
      setState('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setState('recording');

      // Set up AudioContext Analyser for dynamic wave reactivity
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

      // Browser Web Speech Recognition for instant client STT feedback
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

      let recognizedSpeech = '';
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const current = event.results[0][0].transcript;
          setTranscription(current);
          recognizedSpeech = current;
        };

        recognition.onerror = () => {
          // Fall back gracefully
        };

        recognition.start();
      }

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Free tracks
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);

        setState('processing');

        // Use transcribed speech or fallback to default domain question
        const queryToProcess = recognizedSpeech.trim() || 'आज गेहूं का भाव क्या है?';
        setTranscription(queryToProcess);
        await executeVoiceQuery(queryToProcess);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Auto stop after 5 seconds of speaking to avoid runaway recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopAudioRecording();
        }
      }, 5000);
    } catch (err) {
      setState('error');
      setErrorMessage(t('micPermissionError'));
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const executeVoiceQuery = async (queryText: string) => {
    setState('processing');
    try {
      const res = await api.sendVoiceQuery(queryText, language);
      setResponse(res);
      setState('answered');
      saveConversation(queryText, res.responseText, res.detectedLanguage);

      // Play audio response via browser speech synthesis
      speakResponse(res.responseText, res.detectedLanguage);
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Voice query failed');
    }
  };

  const executeTextQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setTranscription(queryText);
    setResponse(null);
    setErrorMessage(null);
    await executeVoiceQuery(queryText);
  };

  const speakResponse = (text: string, langCode: string) => {
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

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsPlayingAudio(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-forest text-harvest">
                CORE FEATURE
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal">{t('voiceTitle')}</h2>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1">{t('voiceSubtitle')}</p>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-charcoal-muted">
            <Globe className="w-3.5 h-3.5 text-forest" />
            <span>Target Dialect:</span>
            <span className="font-semibold text-charcoal uppercase">{language}</span>
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
                : state === 'processing'
                ? 'bg-harvest-50 text-forest-dark border border-harvest/40'
                : state === 'answered'
                ? 'bg-forest-50 text-forest border border-forest/20'
                : state === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-ivory text-charcoal-muted border border-ivory-dark'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'recording'
                  ? 'bg-red-600'
                  : state === 'processing'
                  ? 'bg-harvest-dark'
                  : state === 'answered'
                  ? 'bg-forest'
                  : 'bg-charcoal-muted'
              }`}
            />
            <span>
              {state === 'recording'
                ? t('micRecording')
                : state === 'processing'
                ? t('micProcessing')
                : state === 'answered'
                ? 'Query Resolved'
                : state === 'error'
                ? 'Error'
                : t('micIdle')}
            </span>
          </span>
        </div>

        {/* Dynamic Waveform Visualizer (Skiper UI + Motion Primitives) */}
        <VoiceWaveVisualizer
          isRecording={state === 'recording'}
          isProcessing={state === 'processing'}
          audioLevel={audioLevel}
        />

        {/* Big Interactive Action Button */}
        <div className="my-6">
          {state === 'recording' ? (
            <button
              type="button"
              onClick={stopAudioRecording}
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Process Voice</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startAudioRecording}
              disabled={state === 'processing'}
              className="inline-flex items-center space-x-2.5 px-8 py-4 rounded-full bg-forest hover:bg-forest-dark text-harvest font-bold text-base shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Mic className="w-5 h-5 stroke-[2.4]" />
              <span>{state === 'answered' ? t('tryAgain') : t('micIdle')}</span>
            </button>
          )}
        </div>

        {/* Real-time Transcription Stream Display */}
        {transcription && (
          <div className="max-w-xl mx-auto my-4 p-3.5 bg-ivory/60 rounded border border-ivory-dark text-left">
            <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
              {t('transcriptionLabel')}
            </span>
            <p className="text-sm font-medium text-charcoal">"{transcription}"</p>
          </div>
        )}

        {/* Answer Box */}
        {response && state === 'answered' && (
          <div className="max-w-2xl mx-auto mt-6 p-5 sm:p-6 bg-forest-50/50 rounded-md border border-forest/30 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-forest/20 pb-2.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-forest" />
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  {t('responseLabel')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-charcoal-muted bg-white px-2 py-0.5 rounded border border-forest/20">
                  {response.detectedLanguage}
                </span>

                <button
                  type="button"
                  onClick={isPlayingAudio ? stopSpeaking : () => speakResponse(response.responseText, response.detectedLanguage)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    isPlayingAudio
                      ? 'bg-red-100 text-red-800'
                      : 'bg-forest text-white hover:bg-forest-light'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>{t('stopAudio')}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{t('listenAudio')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-charcoal font-medium">
              {response.responseText}
            </p>

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
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-forest-50 border border-forest/20 text-forest-dark font-medium transition-colors"
                    >
                      {rq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
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
              className="p-1 hover:bg-red-100 rounded text-red-600"
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
            disabled={!textInput.trim() || state === 'processing'}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded bg-forest hover:bg-forest-light text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
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
              className="text-[11px] px-2.5 py-1 rounded bg-ivory hover:bg-ivory-dark/70 text-charcoal font-medium transition-colors"
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
