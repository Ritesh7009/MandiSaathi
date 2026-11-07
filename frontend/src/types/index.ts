export type Language = 'en' | 'hi' | 'pa';

export interface HealthResponse {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: {
      status: string;
      type: string;
    };
    gnaniVoice: {
      status: string;
      prismaStt: string;
      timbreTts: string;
    };
  };
}

export interface Commodity {
  id: number;
  code: string;
  nameEn: string;
  nameHi: string;
  namePa: string | null;
  category: string;
  defaultUnit: string;
}

export interface Mandi {
  id: number;
  code: string;
  nameEn: string;
  nameHi: string;
  namePa: string | null;
  state: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  validationErrors?: Record<string, string>;
}

