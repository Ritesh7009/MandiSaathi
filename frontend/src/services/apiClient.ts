import { Commodity, HealthResponse, Mandi, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiClientError extends Error {
  status: number;
  errorData?: ApiError;

  constructor(status: number, message: string, errorData?: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorData = errorData;
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
        // Response was not JSON
      }
      const message = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiClientError(response.status, message, errorData);
    }

    return await response.json() as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiClientError(0, `Cannot connect to MandiSaathi API: ${message}`);
  }
}

export const api = {
  checkHealth: (): Promise<HealthResponse> => fetchJson<HealthResponse>('/api/v1/health'),

  getCommodities: (category?: string): Promise<Commodity[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJson<Commodity[]>(`/api/v1/commodities${query}`);
  },

  getCommodityByCode: (code: string): Promise<Commodity> =>
    fetchJson<Commodity>(`/api/v1/commodities/${encodeURIComponent(code)}`),

  getMandis: (state?: string): Promise<Mandi[]> => {
    const query = state ? `?state=${encodeURIComponent(state)}` : '';
    return fetchJson<Mandi[]>(`/api/v1/mandis${query}`);
  },

  getMandiByCode: (code: string): Promise<Mandi> =>
    fetchJson<Mandi>(`/api/v1/mandis/${encodeURIComponent(code)}`),
};

export { ApiClientError };

