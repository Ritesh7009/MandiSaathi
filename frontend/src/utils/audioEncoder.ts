/**
 * Audio Encoding & Resampling Utility for Gnani Prisma STT
 *
 * Gnani STT requires 16 kHz mono 16-bit linear PCM WAV with supported extension.
 * Decodes browser MediaRecorder audio (e.g. WebM/Opus), resamples to 16000 Hz,
 * converts to 16-bit PCM WAV, and packages as 'recording.wav'.
 */

export interface ProcessedAudio {
  blob: Blob;
  durationSeconds: number;
  sampleRate: number;
  byteSize: number;
}

/**
 * Converts any audio Blob into a 16 kHz mono 16-bit linear PCM WAV Blob.
 */
export async function convertTo16kHzWav(audioBlob: Blob): Promise<ProcessedAudio> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    audioContext.close().catch(() => {});
  }

  const durationSeconds = audioBuffer.duration;
  const targetSampleRate = 16000;
  const numberOfChannels = 1;

  // Use OfflineAudioContext for browser hardware-accelerated resampling and downmixing to mono
  const totalSamples = Math.max(1, Math.ceil(durationSeconds * targetSampleRate));
  const offlineContext = new OfflineAudioContext(numberOfChannels, totalSamples, targetSampleRate);

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  const channelData = renderedBuffer.getChannelData(0); // 16kHz mono Float32Array [-1.0, 1.0]

  // Encode Float32Array to 16-bit PCM WAV
  const wavBytes = encodeWav(channelData, targetSampleRate);
  const wavBlob = new Blob([wavBytes], { type: 'audio/wav' });

  return {
    blob: wavBlob,
    durationSeconds,
    sampleRate: targetSampleRate,
    byteSize: wavBlob.size,
  };
}

/**
 * Generates a valid 44-byte RIFF header + 16-bit little-endian PCM samples
 */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // 1. RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = Linear PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate (16000)
  view.setUint32(28, byteRate, true); // ByteRate (16000 * 1 * 2 = 32000)
  view.setUint16(32, blockAlign, true); // BlockAlign (2)
  view.setUint16(34, bitsPerSample, true); // BitsPerSample (16)

  // 3. "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // 4. Write 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const rawVal = samples[i] ?? 0;
    const s = Math.max(-1, Math.min(1, rawVal));
    // Convert to 16-bit signed integer [-32768, 32767]
    const pcmSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, pcmSample, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
