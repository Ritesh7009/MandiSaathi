import React from 'react';

interface VoiceWaveVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel?: number; // 0 to 1
}

/**
 * Editorial AgriTech Dynamic Audio Waveform
 * High-fidelity listening & processing feedback inspired by Skiper UI, Apple Siri, and AudioKit waveforms.
 * Respects prefers-reduced-motion and provides real-time level reactivity.
 */
export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isRecording,
  isProcessing,
  audioLevel = 0.5,
}) => {
  // 16-bar balanced acoustic curve
  const bars = [
    0.3, 0.45, 0.65, 0.85, 0.95, 0.75, 0.55, 0.9,
    1.0, 0.8, 0.6, 0.85, 0.7, 0.5, 0.35, 0.25,
  ];

  if (!isRecording && !isProcessing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center my-6 py-2 select-none"
    >
      {/* Concentric subtle radar pulse */}
      <div className="relative flex items-center justify-center w-24 h-24 mb-4">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-25 motion-reduce:hidden ${
            isProcessing ? 'bg-harvest animate-ping' : 'bg-forest animate-pulse'
          }`}
          style={{ animationDuration: isProcessing ? '1.2s' : '2.2s' }}
        />
        <span
          className={`absolute inline-flex h-20 w-20 rounded-full opacity-35 motion-reduce:hidden ${
            isProcessing ? 'bg-harvest-light' : 'bg-forest-100'
          }`}
        />
        <div
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-voice transition-all duration-300 ${
            isProcessing
              ? 'bg-harvest-dark text-white ring-4 ring-harvest/20'
              : 'bg-forest text-harvest ring-4 ring-forest/20'
          }`}
        >
          <div className="flex items-center space-x-1 h-6">
            {bars.slice(0, 5).map((scale, i) => (
              <span
                key={i}
                className="w-1 bg-current rounded-full transition-all duration-100 motion-reduce:h-3"
                style={{
                  height: isRecording
                    ? `${Math.max(6, Math.min(24, Math.round(scale * (audioLevel * 32 + 10))))}px`
                    : '10px',
                  animation: isProcessing ? 'pulse 0.75s infinite ease-in-out' : undefined,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded 16-Bar Audio Wave Spectrum */}
      <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 h-12 px-6 py-2 bg-surface-white rounded-full border border-hairline shadow-subtle max-w-sm w-full mx-auto">
        {bars.map((baseHeight, idx) => {
          const dynamicHeight = isRecording
            ? Math.max(4, Math.round(baseHeight * (audioLevel * 30 + 8)))
            : isProcessing
            ? 12
            : 5;
          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-100 motion-reduce:h-2 ${
                isProcessing ? 'bg-harvest-dark' : 'bg-forest'
              }`}
              style={{
                height: `${dynamicHeight}px`,
                opacity: 0.35 + baseHeight * 0.65,
              }}
            />
          );
        })}
      </div>

      <div className="text-[11px] font-mono font-medium text-charcoal-muted mt-2">
        {isRecording
          ? 'Listening in real-time • Speak naturally'
          : 'Processing voice stream through Gnani AI'}
      </div>
    </div>
  );
};
