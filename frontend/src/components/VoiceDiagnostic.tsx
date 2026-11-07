import React, { useState } from 'react';
import { Mic, MicOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const VoiceDiagnostic: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'testing' | 'granted' | 'denied'>('idle');
  const [audioInputDetails, setAudioInputDetails] = useState<string | null>(null);

  const handleTestMic = async () => {
    setStatus('testing');
    setAudioInputDetails(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('denied');
      setAudioInputDetails('Browser does not support navigator.mediaDevices.getUserMedia');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();
      const trackLabel = audioTracks[0]?.label || 'Standard Audio Input';
      setAudioInputDetails(trackLabel);
      setStatus('granted');

      // Stop audio tracks after verification to free hardware resources
      audioTracks.forEach((track) => track.stop());
    } catch (err) {
      setStatus('denied');
      const errMessage = err instanceof Error ? err.message : 'Permission denied';
      setAudioInputDetails(errMessage);
    }
  };

  return (
    <div className="bg-white border border-ivory-dark rounded-md p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-harvest-50 text-harvest-dark rounded-md border border-harvest/40 mt-0.5">
            <Mic className="w-5 h-5 text-forest" />
          </div>
          <div>
            <h3 className="font-semibold text-charcoal text-sm">{t('voiceDiagnostic')}</h3>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Validates device microphone audio stream readiness for the Gnani Prisma v2.5 voice pipeline.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestMic}
          disabled={status === 'testing'}
          className={`inline-flex items-center justify-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded transition-colors self-start sm:self-auto ${
            status === 'granted'
              ? 'bg-forest text-white hover:bg-forest-light'
              : status === 'denied'
              ? 'bg-red-700 text-white hover:bg-red-800'
              : 'bg-harvest text-forest-dark hover:bg-harvest-dark hover:text-white'
          }`}
          title="Test browser audio permission"
        >
          {status === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('testingMic')}</span>
            </>
          ) : status === 'granted' ? (
            <>
              <Check className="w-4 h-4" />
              <span>{t('micAllowed')}</span>
            </>
          ) : status === 'denied' ? (
            <>
              <MicOff className="w-4 h-4" />
              <span>{t('micDenied')}</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>{t('testMicrophone')}</span>
            </>
          )}
        </button>
      </div>

      {audioInputDetails && (
        <div className="mt-3 pt-3 border-t border-ivory-dark text-xs flex items-center space-x-2">
          {status === 'granted' ? (
            <Check className="w-4 h-4 text-forest shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-mono text-charcoal-muted">
            Hardware: {audioInputDetails}
          </span>
        </div>
      )}
    </div>
  );
};

