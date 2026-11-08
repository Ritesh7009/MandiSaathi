import React from 'react';

interface VoiceWaveVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel?: number; // 0 to 1
}

/**
 * Editorial AgriTech Dynamic Audio Waveform
 * Refined listening feedback inspired by Skiper UI & Apple Siri/AudioKit waveforms.
 */
export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isRecording,
  isProcessing,
  audioLevel = 0.5,
}) => {
  const bars = [0.35, 0.65, 0.9, 0.6, 0.85, 1.0, 0.75, 0.5, 0.8, 0.65, 0.9, 0.4];

  if (!isRecording && !isProcessing) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center my-6 py-2">
      {/* Concentric subtle radar pulse */}
      <div className="relative flex items-center justify-center w-24 h-24 mb-4">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-20 ${
            isProcessing ? 'bg-harvest animate-ping' : 'bg-forest animate-pulse'
          }`}
          style={{ animationDuration: isProcessing ? '1.4s' : '2s' }}
        />
        <div
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-voice transition-all duration-300 ${
            isProcessing ? 'bg-harvest-dark text-white' : 'bg-forest text-white'
          }`}
        >
          <div className="flex items-center space-x-1 h-6">
            {bars.slice(0, 5).map((scale, i) => (
              <span
                key={i}
                className="w-1 bg-current rounded-full transition-all duration-100"
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

      {/* Expanded Audio Bar Visualizer */}
      <div className="flex items-center justify-center space-x-1.5 h-10 px-5 py-1.5 bg-surface-white rounded-full border border-hairline shadow-subtle">
        {bars.map((baseHeight, idx) => {
          const dynamicHeight = isRecording
            ? Math.max(4, Math.round(baseHeight * (audioLevel * 26 + 6)))
            : isProcessing
            ? 12
            : 4;
          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-75 ${
                isProcessing ? 'bg-harvest-dark' : 'bg-forest'
              }`}
              style={{
                height: `${dynamicHeight}px`,
                opacity: 0.4 + baseHeight * 0.6,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
