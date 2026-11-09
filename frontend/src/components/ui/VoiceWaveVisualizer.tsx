import React from 'react';

interface VoiceWaveVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel?: number; // 0 to 1
}

/**
 * Tactile Studio Field Recorder & Seismic Audio Spectrum
 * Hardware-grade acoustic visualizer inspired by Skiper UI & Motion Primitives.
 * Purged of generic AI radar pulses; uses physical LED VU-meter bars & analog audio ribbon.
 */
export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isRecording,
  isProcessing,
  audioLevel = 0.5,
}) => {
  // 24-step acoustic frequency band weights
  const spectrumBars = [
    0.25, 0.4, 0.55, 0.7, 0.85, 0.95, 0.8, 0.65,
    0.9, 1.0, 0.85, 0.7, 0.95, 0.85, 0.6, 0.75,
    0.9, 0.8, 0.6, 0.45, 0.7, 0.5, 0.35, 0.2,
  ];

  if (!isRecording && !isProcessing) {
    return null;
  }

  // Segmented hardware LED bars (8 vertical segments)
  const ledSegments = Array.from({ length: 8 });

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center my-5 py-3 select-none w-full max-w-md mx-auto"
    >
      {/* Hardware Studio Status Header */}
      <div className="flex items-center justify-between w-full px-4 py-1.5 mb-3 rounded-t-lg bg-forest-900 text-surface-white text-[11px] font-mono tracking-wider border border-forest-800 shadow-subtle">
        <div className="flex items-center space-x-2">
          {isRecording ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
              <span className="font-bold text-red-400">REC • 16 kHz MONO</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-harvest-light inline-block" />
              <span className="font-bold text-harvest-light">MATCHING APMC LEDGER</span>
            </>
          )}
        </div>
        <span className="text-white/60 text-[10px]">GNANI PRISMA STT</span>
      </div>

      {/* Analog Seismic Audio Ribbon & VU Meter Deck */}
      <div className="w-full bg-surface-white border border-hairline rounded-b-lg p-4 shadow-card space-y-4">
        {/* Physical LED Bar Spectrum */}
        <div className="flex items-end justify-center space-x-1 sm:space-x-1.5 h-16 px-2 py-1 bg-forest-50/40 rounded border border-hairline/60">
          {spectrumBars.map((weight, i) => {
            const activeLevel = isRecording
              ? Math.max(0.15, Math.min(1, weight * (audioLevel * 1.6 + 0.2)))
              : isProcessing
              ? 0.3 + 0.4 * Math.sin((i / 4) + Date.now() / 200)
              : 0.1;

            const heightPercent = Math.round(activeLevel * 100);

            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end items-center h-full max-w-[12px]"
              >
                <div
                  className={`w-full rounded-xs transition-all duration-75 motion-reduce:transition-none ${
                    isProcessing
                      ? 'bg-harvest-dark'
                      : i % 4 === 0
                      ? 'bg-forest-light'
                      : 'bg-forest'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: '4px',
                    opacity: 0.4 + activeLevel * 0.6,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Audio Decibel / Gain Level Indicators */}
        <div className="flex items-center justify-between text-[10px] font-mono text-charcoal-subtle px-1">
          <span>-40 dB</span>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-charcoal-muted font-medium">ACOUSTIC GAIN:</span>
            <div className="flex space-x-0.5">
              {ledSegments.map((_, idx) => {
                const filled = (audioLevel * 8) >= idx;
                return (
                  <span
                    key={idx}
                    className={`w-1.5 h-2.5 rounded-xs ${
                      filled
                        ? idx > 6
                          ? 'bg-red-500'
                          : idx > 4
                          ? 'bg-amber-500'
                          : 'bg-forest'
                        : 'bg-hairline/60'
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <span>0 dB CLIP</span>
        </div>

        {/* Real-time Status Guidance */}
        <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs text-charcoal">
          <span className="font-medium text-charcoal-muted">
            {isRecording
              ? 'बोलो, आपकी आवाज़ रिकॉर्ड हो रही है...'
              : 'प्रमाणित मंडी रिकॉर्ड से मिलान जारी है...'}
          </span>
          <span className="font-mono text-[11px] text-forest font-semibold">
            {isRecording ? 'LIVE' : 'SYNCING'}
          </span>
        </div>
      </div>
    </div>
  );
};
