#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================================="
echo "MandiSaathi - Gnani AI Unified Authentication Verifier"
echo "=========================================================="

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
    # Export without printing
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
fi

KEY="${GNANI_API_KEY:-}"

if [ -z "$KEY" ]; then
    echo "⚠️  No GNANI_API_KEY found in environment or .env file."
    echo ""
    echo "Usage:"
    echo "  GNANI_API_KEY=your_gnani_key ./scripts/verify-gnani.sh"
    echo "  OR add GNANI_API_KEY=your_key to $ROOT_DIR/.env"
    echo ""
    exit 1
fi

KEY_LEN=${#KEY}
echo "🔐 Using configured GNANI_API_KEY (Length: $KEY_LEN characters, Header: X-API-Key-ID)"
echo "----------------------------------------------------------"

STT_ENDPOINT="${GNANI_STT_URL:-https://api.vachana.ai/stt/v3}"
TTS_ENDPOINT="${GNANI_TTS_URL:-https://api.vachana.ai/api/v1/tts/inference}"

# 1. Verify Gnani Prisma STT Endpoint
echo "[1/2] Verifying Gnani Prisma STT Endpoint..."
echo "  URL: $STT_ENDPOINT"

# Generate 0.5s silent WAV in memory for live verification test
# A standard 44-byte RIFF WAV header for PCM 16kHz mono
TMP_WAV=$(mktemp --suffix=.wav)
python3 -c "
import struct
sample_rate = 16000
num_samples = 8000
data = b'\x00' * (num_samples * 2)
header = struct.pack(
    '<4sI4s4sIHHIIHH4sI',
    b'RIFF', 36 + len(data), b'WAVE',
    b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
    b'data', len(data)
)
with open('$TMP_WAV', 'wb') as f:
    f.write(header + data)
" 2>/dev/null || dd if=/dev/zero of="$TMP_WAV" bs=1024 count=4 status=none

STT_HTTP_CODE=$(curl -s -o /tmp/stt_resp.json -w "%{http_code}" -X POST \
    -H "X-API-Key-ID: $KEY" \
    -F "audio_file=@$TMP_WAV" \
    -F "language_code=hi-IN" \
    -F "model=prisma-v2.5" \
    --max-time 15 \
    "$STT_ENDPOINT" || echo "000")

rm -f "$TMP_WAV"

if [ "$STT_HTTP_CODE" = "200" ]; then
    STT_STATUS="AUTHENTICATED & ACTIVE (HTTP 200 OK)"
    STT_SUCCESS=1
elif [ "$STT_HTTP_CODE" = "400" ] || [ "$STT_HTTP_CODE" = "422" ]; then
    STT_STATUS="AUTHENTICATED (HTTP $STT_HTTP_CODE - API Gateway Authorized)"
    STT_SUCCESS=1
elif [ "$STT_HTTP_CODE" = "401" ] || [ "$STT_HTTP_CODE" = "403" ]; then
    STT_STATUS="AUTHENTICATION FAILED (HTTP $STT_HTTP_CODE - Invalid API Key or Scope)"
    STT_SUCCESS=0
else
    STT_STATUS="FAILED (HTTP $STT_HTTP_CODE)"
    STT_SUCCESS=0
fi

echo "  Result: $STT_STATUS"
if [ "$STT_SUCCESS" -eq 1 ] && [ -f /tmp/stt_resp.json ]; then
    # Safely show transcript snippet if valid JSON
    TRANSCRIPT=$(python3 -c "import json; d=json.load(open('/tmp/stt_resp.json')); print(d.get('transcript', ''))" 2>/dev/null || echo "")
    if [ -n "$TRANSCRIPT" ]; then
        echo "  Sample Transcript: \"$TRANSCRIPT\""
    fi
fi
rm -f /tmp/stt_resp.json

echo ""

# 2. Verify Gnani Timbre TTS Endpoint
echo "[2/2] Verifying Gnani Timbre TTS Endpoint..."
echo "  URL: $TTS_ENDPOINT"

TMP_TTS_OUT=$(mktemp --suffix=.wav)
TTS_HTTP_CODE=$(curl -s -o "$TMP_TTS_OUT" -w "%{http_code}" -X POST \
    -H "X-API-Key-ID: $KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "नमस्ते किसान साथी",
        "voice": "Nalini",
        "model": "timbre-v2.5",
        "language": "hi-IN",
        "speed": 1.0,
        "audio_config": {
            "sample_rate": 22050,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm",
            "container": "wav"
        }
    }' \
    --max-time 15 \
    "$TTS_ENDPOINT" || echo "000")

AUDIO_SIZE=$(wc -c < "$TMP_TTS_OUT" 2>/dev/null || echo "0")
rm -f "$TMP_TTS_OUT"

if [ "$TTS_HTTP_CODE" = "200" ] && [ "$AUDIO_SIZE" -gt 100 ]; then
    TTS_STATUS="AUTHENTICATED & ACTIVE (HTTP 200 OK, Received $AUDIO_SIZE bytes WAV)"
    TTS_SUCCESS=1
elif [ "$TTS_HTTP_CODE" = "400" ] || [ "$TTS_HTTP_CODE" = "422" ]; then
    TTS_STATUS="AUTHENTICATED (HTTP $TTS_HTTP_CODE - API Gateway Authorized)"
    TTS_SUCCESS=1
elif [ "$TTS_HTTP_CODE" = "401" ] || [ "$TTS_HTTP_CODE" = "403" ]; then
    TTS_STATUS="AUTHENTICATION FAILED (HTTP $TTS_HTTP_CODE - Invalid API Key or Scope)"
    TTS_SUCCESS=0
else
    TTS_STATUS="FAILED (HTTP $TTS_HTTP_CODE)"
    TTS_SUCCESS=0
fi

echo "  Result: $TTS_STATUS"
echo ""

echo "=========================================================="
echo "Verification Summary:"
echo "  GNANI PRISMA STT : $STT_STATUS"
echo "  GNANI TIMBRE TTS : $TTS_STATUS"
echo "=========================================================="

if [ "$STT_SUCCESS" -eq 1 ] && [ "$TTS_SUCCESS" -eq 1 ]; then
    echo "✅ SUCCESS: Single API Key authenticated successfully for both STT and TTS!"
    exit 0
else
    echo "⚠️  One or more endpoints failed authentication or connectivity."
    exit 1
fi
