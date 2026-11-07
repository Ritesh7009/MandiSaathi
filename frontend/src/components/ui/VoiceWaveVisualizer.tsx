import React from 'react';

interface VoiceWaveVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel?: number; // 0 to 1
}

/**
 * Adapted from Skiper UI & Motion Primitives:
 * Audio reactive radar pulse rings and dynamic waveform bars.
 */
export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isRecording,
  isProcessing,
  audioLevel = 0.5,
}) => {
  const bars = [0.4, 0.7, 0.9, 0.6, 0.8, 1.0, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4];

  if (!isRecording && !isProcessing) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center my-4 py-2">
      {/* Concentric radar pulse circles (Skiper UI inspired) */}
      <div className="relative flex items-center justify-center w-28 h-28 mb-3">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-30 ${
            isProcessing ? 'bg-harvest animate-ping' : 'bg-forest animate-pulse'
          }`}
        />
        <span
          className={`absolute inline-flex h-20 w-20 rounded-full opacity-40 ${
            isProcessing ? 'bg-harvest-dark' : 'bg-forest-light'
          } animate-ping`}
          style={{ animationDuration: '2s' }}
        />
        <div
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-md ${
            isProcessing ? 'bg-harvest text-forest-dark' : 'bg-forest text-white'
          }`}
        >
          <div className="flex items-center space-x-1 h-6">
            {bars.slice(0, 5).map((scale, i) => (
              <span
                key={i}
                className="w-1 bg-current rounded-full transition-all duration-150"
                style={{
                  height: isRecording
                    ? `${Math.max(6, Math.min(24, scale * (audioLevel * 30 + 10)))}px`
                    : '8px',
                  animation: isProcessing ? 'pulse 0.8s infinite ease-in-out' : undefined,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded Audio Bar Visualizer (Motion Primitives inspired) */}
      <div className="flex items-center justify-center space-x-1 h-8 px-4 py-1 bg-ivory-dark/40 rounded-full border border-forest/15">
        {bars.map((baseHeight, idx) => {
          const dynamicHeight = isRecording
            ? Math.max(4, Math.round(baseHeight * (audioLevel * 24 + 6)))
            : isProcessing
            ? 12
            : 4;
          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-100 ${
                isProcessing ? 'bg-harvest-dark' : 'bg-forest'
              }`}
              style={{
                height: `${dynamicHeight}px`,
                opacity: 0.5 + baseHeight * 0.5,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

