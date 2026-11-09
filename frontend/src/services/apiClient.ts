import {
  Commodity,
  HealthResponse,
  Mandi,
  PriceRecord,
  PriceComparison,
  GovernmentScheme,
  Complaint,
  ComplaintRequest,
  VoiceQueryResponse,
  IngestionSummary,
  SyncStatus,
  ApiError,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiClientError extends Error {
  status: number;
  errorData?: ApiError;
  voiceResponse?: VoiceQueryResponse;

  constructor(status: number, message: string, errorData?: ApiError, voiceResponse?: VoiceQueryResponse) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorData = errorData;
    this.voiceResponse = voiceResponse;
  }
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiError | undefined;
      try {
        errorData = await response.json();
      } catch {
        // Non-JSON response
      }
      const message = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiClientError(response.status, message, errorData);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiClientError(0, `Cannot connect to MandiSaathi API: ${message}`);
  }
}

export const api = {
  // System Health
  checkHealth: (): Promise<HealthResponse> => fetchJson<HealthResponse>('/api/v1/health'),

  // Commodities
  getCommodities: (category?: string): Promise<Commodity[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJson<Commodity[]>(`/api/v1/commodities${query}`);
  },

  getCommodityByCode: (code: string): Promise<Commodity> =>
    fetchJson<Commodity>(`/api/v1/commodities/${encodeURIComponent(code)}`),

  // Mandis
  getMandis: (state?: string): Promise<Mandi[]> => {
    const query = state ? `?state=${encodeURIComponent(state)}` : '';
    return fetchJson<Mandi[]>(`/api/v1/mandis${query}`);
  },

  getMandiByCode: (code: string): Promise<Mandi> =>
    fetchJson<Mandi>(`/api/v1/mandis/${encodeURIComponent(code)}`),

  // Mandi Price Intelligence
  getPrices: (commodityCode?: string, mandiCode?: string): Promise<PriceRecord[]> => {
    const params = new URLSearchParams();
    if (commodityCode) params.append('commodityCode', commodityCode);
    if (mandiCode) params.append('mandiCode', mandiCode);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<PriceRecord[]>(`/api/v1/prices${qs}`);
  },

  comparePrices: (commodityCode: string, mandiCodes?: string[]): Promise<PriceComparison> =>
    fetchJson<PriceComparison>('/api/v1/prices/compare', {
      method: 'POST',
      body: JSON.stringify({ commodityCode, mandiCodes: mandiCodes || [] }),
    }),

  syncMandiPrices: (): Promise<IngestionSummary> =>
    fetchJson<IngestionSummary>('/api/v1/prices/sync', {
      method: 'POST',
    }),

  getSyncStatus: (): Promise<SyncStatus> =>
    fetchJson<SyncStatus>('/api/v1/prices/sync/status'),

  // Government Schemes
  getSchemes: (category?: string, search?: string): Promise<GovernmentScheme[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<GovernmentScheme[]>(`/api/v1/schemes${qs}`);
  },

  getSchemeByCode: (code: string): Promise<GovernmentScheme> =>
    fetchJson<GovernmentScheme>(`/api/v1/schemes/${encodeURIComponent(code)}`),

  // Complaints
  registerComplaint: (request: ComplaintRequest): Promise<Complaint> =>
    fetchJson<Complaint>('/api/v1/complaints', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getComplaints: (): Promise<Complaint[]> => fetchJson<Complaint[]>('/api/v1/complaints'),

  getComplaintByRef: (referenceNumber: string): Promise<Complaint> =>
    fetchJson<Complaint>(`/api/v1/complaints/${encodeURIComponent(referenceNumber)}`),

  // Voice Assistant
  sendVoiceQuery: (queryText: string, language?: string): Promise<VoiceQueryResponse> =>
    fetchJson<VoiceQueryResponse>('/api/v1/voice/query', {
      method: 'POST',
      body: JSON.stringify({ queryText, language: language || 'hi' }),
    }),

  sendVoiceAudio: async (audioBlob: Blob, language?: string): Promise<VoiceQueryResponse> => {
    const url = `${API_BASE_URL}/api/v1/voice/audio`;
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    if (language) {
      formData.append('language', language);
    }

    const executeUpload = async (isRetry = false): Promise<VoiceQueryResponse> => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
        });

        // Handle HTTP 429 rate limit with a short retry
        if (response.status === 429 && !isRetry) {
          console.warn('[Voice API] HTTP 429 rate limit encountered. Retrying in 1500ms...');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return await executeUpload(true);
        }

        if (!response.ok) {
          let errorData: ApiError | undefined;
          let voiceData: VoiceQueryResponse | undefined;
          try {
            const json = await response.json();
            if (json.transcript !== undefined || json.responseText !== undefined) {
              voiceData = json as VoiceQueryResponse;
            } else {
              errorData = json as ApiError;
            }
          } catch {
            // Non-JSON response
          }
          const message = voiceData?.engineNotice || errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new ApiClientError(response.status, message, errorData, voiceData);
        }

        return (await response.json()) as VoiceQueryResponse;
      } catch (err) {
        if (err instanceof ApiClientError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : 'Audio upload failed';
        throw new ApiClientError(0, `Cannot process audio query: ${message}`);
      }
    };

    return executeUpload(false);
  },
};

export { ApiClientError };
