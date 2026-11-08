package com.mandisaathi.client.gnani;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "gnani.enabled", havingValue = "false", matchIfMissing = true)
public class GnaniTtsStubService implements GnaniTtsService {

    private static final Logger log = LoggerFactory.getLogger(GnaniTtsStubService.class);

    @Override
    public SynthesisResult synthesize(String text, String languageCode, String voiceGender) {
        log.info("Gnani TTS Stub received synthesis request (chars: {}, lang: {}, voice: {}).",
                text != null ? text.length() : 0, languageCode, voiceGender);
        byte[] wavAudio = generatePlayableWavTone();
        return SynthesisResult.success(wavAudio, "audio/wav", languageCode != null ? languageCode : "hi-IN");
    }

    private byte[] generatePlayableWavTone() {
        int sampleRate = 16000;
        int numSamples = 4000; // 0.25 seconds
        byte[] pcmData = new byte[numSamples * 2];
        for (int i = 0; i < numSamples; i++) {
            double angle = 2.0 * Math.PI * 523.25 * i / sampleRate; // 523.25 Hz (C5 audio chime)
            short sample = (short) (Math.sin(angle) * 8000 * (1.0 - (double) i / numSamples));
            pcmData[i * 2] = (byte) (sample & 0xff);
            pcmData[i * 2 + 1] = (byte) ((sample >> 8) & 0xff);
        }

        byte[] header = new byte[44];
        int totalDataLen = pcmData.length;
        int totalAudioLen = totalDataLen + 36;
        int byteRate = sampleRate * 2;

        header[0] = 'R'; header[1] = 'I'; header[2] = 'F'; header[3] = 'F';
        header[4] = (byte) (totalAudioLen & 0xff);
        header[5] = (byte) ((totalAudioLen >> 8) & 0xff);
        header[6] = (byte) ((totalAudioLen >> 16) & 0xff);
        header[7] = (byte) ((totalAudioLen >> 24) & 0xff);
        header[8] = 'W'; header[9] = 'A'; header[10] = 'V'; header[11] = 'E';
        header[12] = 'f'; header[13] = 'm'; header[14] = 't'; header[15] = ' ';
        header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0;
        header[20] = 1; header[21] = 0; // PCM
        header[22] = 1; header[23] = 0; // Mono
        header[24] = (byte) (sampleRate & 0xff);
        header[25] = (byte) ((sampleRate >> 8) & 0xff);
        header[26] = (byte) ((sampleRate >> 16) & 0xff);
        header[27] = (byte) ((sampleRate >> 24) & 0xff);
        header[28] = (byte) (byteRate & 0xff);
        header[29] = (byte) ((byteRate >> 8) & 0xff);
        header[30] = (byte) ((byteRate >> 16) & 0xff);
        header[31] = (byte) ((byteRate >> 24) & 0xff);
        header[32] = 2; header[33] = 0; // block align
        header[34] = 16; header[35] = 0; // bits per sample
        header[36] = 'd'; header[37] = 'a'; header[38] = 't'; header[39] = 'a';
        header[40] = (byte) (totalDataLen & 0xff);
        header[41] = (byte) ((totalDataLen >> 8) & 0xff);
        header[42] = (byte) ((totalDataLen >> 16) & 0xff);
        header[43] = (byte) ((totalDataLen >> 24) & 0xff);

        byte[] wav = new byte[header.length + pcmData.length];
        System.arraycopy(header, 0, wav, 0, header.length);
        System.arraycopy(pcmData, 0, wav, header.length, pcmData.length);
        return wav;
    }
}

