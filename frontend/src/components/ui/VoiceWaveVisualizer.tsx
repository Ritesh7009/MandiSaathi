import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';

interface VoiceWaveVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel?: number;
}

const SPECTRUM_WEIGHTS = [
  0.28, 0.42, 0.56, 0.72, 0.88, 0.96, 0.82, 0.68,
  0.92, 1.0, 0.84, 0.7, 0.95, 0.84, 0.62, 0.76,
  0.9, 0.82, 0.64, 0.46, 0.7, 0.52, 0.36, 0.24,
];

/**
 * 60fps Hardware Acoustic Spectrum Visualizer (Skiper UI + Cult UI inspired).
 * Strictly honors the active page theme (no dark header block pasted on light surface)
 * and uses requestAnimationFrame instead of Date.now() inside JSX render.
 */
export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isRecording,
  isProcessing,
  audioLevel = 0.5,
}) => {
  const { language } = useLanguage();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isProcessing || reduce) return;
    let rafId = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      setPhase((now - start) * 0.006);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [isProcessing, reduce]);

  if (!isRecording && !isProcessing) {
    return null;
  }

  const ledSegments = Array.from({ length: 8 });
  const statusText = isRecording
    ? language === 'hi'
      ? 'बोलिए, आवाज़ स्पष्ट रूप से रिकॉर्ड हो रही है...'
      : language === 'pa'
      ? 'ਬੋਲੋ, ਆਵਾਜ਼ ਰਿਕਾਰਡ ਹੋ ਰਹੀ ਹੈ...'
      : 'Listening clearly, speak naturally...'
    : language === 'hi'
    ? 'प्रमाणित मंडी रिकॉर्ड से मिलान जारी है...'
    : language === 'pa'
    ? 'ਪ੍ਰਮਾਣਿਤ ਮੰਡੀ ਰਿਕਾਰਡ ਨਾਲ ਮਿਲਾਨ ਜਾਰੀ...'
    : 'Matching APMC verified ledger...';

  return (
    <div
      role="status"
      aria-live="polite"
      className="my-5 w-full max-w-md mx-auto rounded-2xl border border-line bg-surface-subtle p-4 shadow-card select-none"
    >
      {/* Status Telemetry Strip */}
      <div className="flex items-center justify-between text-[11px] font-mono mb-3 pb-2 border-b border-line">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-saffron animate-pulse'
            }`}
          />
          <span className={`font-semibold ${isRecording ? 'text-red-600 dark:text-red-400' : 'text-saffron-ink dark:text-saffron'}`}>
            {isRecording ? 'REC 16kHz MONO' : 'APMC LEDGER MATCH'}
          </span>
        </div>
        <span className="text-ink-muted">GNANI PRISMA</span>
      </div>

      {/* 24-Band Acoustic Bars */}
      <div className="flex items-end justify-center space-x-1 sm:space-x-1.5 h-16 px-2 py-2 rounded-xl bg-surface border border-line">
        {SPECTRUM_WEIGHTS.map((weight, i) => {
          const activeLevel = reduce
            ? 0.45 * weight + 0.15
            : isRecording
            ? Math.max(0.14, Math.min(1, weight * (audioLevel * 1.65 + 0.22)))
            : 0.38 + 0.38 * Math.sin(i * 0.45 + phase);

          const heightPercent = Math.round(activeLevel * 100);

          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center h-full max-w-[11px]">
              <div
                className={`w-full rounded-sm transition-[height] duration-75 motion-reduce:transition-none ${
                  isProcessing
                    ? 'bg-saffron'
                    : i % 4 === 0
                    ? 'bg-canopy-bright'
                    : 'bg-canopy'
                }`}
                style={{
                  height: `${heightPercent}%`,
                  minHeight: '4px',
                  opacity: 0.45 + activeLevel * 0.55,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Acoustic Gain Bar & Status Line */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-ink-muted">
        <span>-40 dB</span>
        <div className="flex items-center space-x-1.5">
          <span>GAIN</span>
          <div className="flex space-x-0.5">
            {ledSegments.map((_, idx) => {
              const filled = audioLevel * 8 >= idx;
              return (
                <span
                  key={idx}
                  className={`w-1.5 h-2 rounded-[2px] ${
                    filled
                      ? idx > 6
                        ? 'bg-red-500'
                        : idx > 4
                        ? 'bg-saffron'
                        : 'bg-canopy-bright'
                      : 'bg-line-strong'
                  }`}
                />
              );
            })}
          </div>
        </div>
        <span>0 dB</span>
      </div>

      <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-xs">
        <span className="font-medium text-ink-muted truncate pr-2">{statusText}</span>
        <span className="font-mono text-[10px] font-semibold text-canopy dark:text-canopy-bright shrink-0">
          {isRecording ? 'LIVE' : 'SYNCING'}
        </span>
      </div>
    </div>
  );
};
