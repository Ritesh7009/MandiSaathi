import { useState, useEffect, useRef, useCallback } from 'react';
import { api, ApiClientError } from '../services/apiClient';
import { convertTo16kHzWav } from '../utils/audioEncoder';
import { ALL_RECOGNIZED_LANGUAGES, useLanguage } from '../context/LanguageContext';
import { VoiceQueryResponse, RecentConversation } from '../types';

export type AssistantState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'generating_audio'
  | 'answered'
  | 'error'
  | 'permission_denied';

export function useVoiceAssistant() {
  const { language } = useLanguage();

  const [state, setState] = useState<AssistantState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [micTestPassed, setMicTestPassed] = useState<boolean>(false);
  const [isRequestInFlight, setIsRequestInFlight] = useState<boolean>(false);
  const [lastAudioDuration, setLastAudioDuration] = useState<number | null>(null);
  const [lastAudioSize, setLastAudioSize] = useState<number | null>(null);
  const [clientRoundtripMs, setClientRoundtripMs] = useState<number | null>(null);
  const [recentQueries, setRecentQueries] = useState<RecentConversation[]>([]);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const maxRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const bcp47Locale =
    ALL_RECOGNIZED_LANGUAGES.find((l) => l.code === language)?.bcp47 || 'hi-IN';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mandisaathi_recent_conversations');
      if (stored) {
        setRecentQueries(JSON.parse(stored).slice(0, 4));
      }
    } catch {
      // ignore storage errors
    }
  }, [response]);

  const saveConversation = useCallback((query: string, reply: string, lang: string) => {
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
      // ignore storage errors
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  }, []);

  const fallbackWebSpeech = useCallback(
    (text: string) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = bcp47Locale;
        utterance.rate = 0.95;
        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }
    },
    [bcp47Locale]
  );

  const playAudioResponse = useCallback(
    (res: VoiceQueryResponse) => {
      stopAudioPlayback();

      if (res.audioBase64) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
          audioElementRef.current = audio;
          audio.onplay = () => setIsPlayingAudio(true);
          audio.onended = () => setIsPlayingAudio(false);
          audio.onerror = () => {
            setIsPlayingAudio(false);
            fallbackWebSpeech(res.responseText);
          };
          audio.play().catch(() => fallbackWebSpeech(res.responseText));
        } catch {
          fallbackWebSpeech(res.responseText);
        }
      } else {
        fallbackWebSpeech(res.responseText);
      }
    },
    [stopAudioPlayback, fallbackWebSpeech]
  );

  const toggleAudioPlayback = useCallback(() => {
    if (isPlayingAudio) {
      stopAudioPlayback();
    } else if (response) {
      playAudioResponse(response);
    }
  }, [isPlayingAudio, response, stopAudioPlayback, playAudioResponse]);

  const stopAudioRecording = useCallback(() => {
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
  }, []);

  useEffect(() => {
    return () => {
      stopAudioRecording();
      stopAudioPlayback();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [stopAudioRecording, stopAudioPlayback]);

  const handleAudioProcessing = async (wavBlob: Blob) => {
    const uploadStart = Date.now();
    setIsRequestInFlight(true);
    setErrorMessage(null);

    try {
      setState('processing');
      const result = await api.sendVoiceAudio(wavBlob, bcp47Locale);
      setClientRoundtripMs(Date.now() - uploadStart);

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
            : 'No clear speech was detected. Please speak closer to the microphone and try again.';
        setErrorMessage(emptyMsg);
        return;
      }

      setState('answered');
      saveConversation(result.transcript, result.responseText, result.detectedLanguage);

      if (result.audioBase64) {
        playAudioResponse(result);
      }
    } catch (err: unknown) {
      setClientRoundtripMs(Date.now() - uploadStart);
      setState('error');

      if (err instanceof ApiClientError) {
        if (err.voiceResponse?.transcript) setTranscription(err.voiceResponse.transcript);
        if (err.voiceResponse) setResponse(err.voiceResponse);

        const s = err.status;
        if (s === 401 || s === 403) {
          setErrorMessage(`Gnani AI authentication failure (HTTP ${s}).`);
        } else if (s === 402) {
          setErrorMessage('Gnani AI account credits exhausted (HTTP 402).');
        } else if (s === 429) {
          setErrorMessage('Voice rate limit reached (HTTP 429). Please retry shortly.');
        } else if (s === 504 || s === 0) {
          setErrorMessage(`Voice request timed out (HTTP ${s}).`);
        } else {
          setErrorMessage(err.message || `Voice request failed (HTTP ${s}).`);
        }
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to process voice query.');
      }
    } finally {
      setIsRequestInFlight(false);
    }
  };

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

      if (maxRecordingTimeoutRef.current) clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopAudioRecording();
        }
      }, 15000);

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
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
              sum += dataArray[i] ?? 0;
            }
            setAudioLevel(sum / bufferLength / 255);
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch {
        setAudioLevel(0.45);
      }

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
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (maxRecordingTimeoutRef.current) {
          clearTimeout(maxRecordingTimeoutRef.current);
          maxRecordingTimeoutRef.current = null;
        }

        const durationMs = Date.now() - recordingStartTimeRef.current;
        if (durationMs < 1000) {
          setState('error');
          setErrorMessage(
            language === 'hi'
              ? 'ऑडियो 1 सेकंड से छोटा है। कृपया कम से कम 1 सेकंड बोलें।'
              : language === 'pa'
              ? 'ਆਡੀਓ 1 ਸਕਿੰਟ ਤੋਂ ਛੋਟੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ 1 ਸਕਿੰਟ ਬੋਲੋ।'
              : 'Audio clip too short (under 1 second). Speak clearly for at least 1 second.'
          );
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        try {
          setState('transcribing');
          const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const processed = await convertTo16kHzWav(rawBlob);
          setLastAudioDuration(processed.durationSeconds);
          setLastAudioSize(processed.byteSize);
          await handleAudioProcessing(processed.blob);
        } catch (convErr) {
          setState('error');
          setErrorMessage(
            'Audio conversion failed: ' + (convErr instanceof Error ? convErr.message : String(convErr))
          );
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

  const executeTextQuery = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) return;
      setErrorMessage(null);
      setTranscription(queryText);
      setState('processing');
      setIsRequestInFlight(true);
      stopAudioPlayback();

      const queryStart = Date.now();
      try {
        const result = await api.sendVoiceQuery(queryText, language);
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
        setState('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to process query.');
      } finally {
        setIsRequestInFlight(false);
      }
    },
    [language, stopAudioPlayback, saveConversation, playAudioResponse]
  );

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

  const clearRecentQueries = () => {
    localStorage.removeItem('mandisaathi_recent_conversations');
    setRecentQueries([]);
  };

  const clearError = () => {
    setErrorMessage(null);
    setState('idle');
  };

  return {
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
  };
}

