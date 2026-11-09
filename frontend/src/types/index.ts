export type Language =
  | 'hi'   // हिन्दी (Hindi - hi-IN)
  | 'pa'   // ਪੰਜਾਬੀ (Punjabi - pa-IN)
  | 'en'   // English (Indian English - en-IN)
  | 'mr'   // मराठी (Marathi - mr-IN)
  | 'gu'   // ગુજરાતી (Gujarati - gu-IN)
  | 'bn'   // বাংলা (Bengali - bn-IN)
  | 'te'   // తెలుగు (Telugu - te-IN)
  | 'ta'   // தமிழ் (Tamil - ta-IN)
  | 'kn'   // ಕನ್ನಡ (Kannada - kn-IN)
  | 'ml';  // മലയാളം (Malayalam - ml-IN)

export interface HealthResponse {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: {
      status: string;
      connectionStatus?: string;
      type: string;
    };
    gnaniVoice?: {
      status: string;
      prismaStt: string;
      timbreTts: string;
    };
    gnaniPrismaStt?: {
      status: string;
      model: string;
      endpoint: string;
    };
    gnaniTimbreTts?: {
      status: string;
      model: string;
      voiceHindi?: string;
      voicePunjabi?: string;
      voiceEnglish?: string;
      endpoint: string;
    };
    mandiDataSource?: {
      status: string;
      source: string;
      catalog: string;
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

export interface PriceRecord {
  id: number;
  commodityCode: string;
  commodityNameEn: string;
  commodityNameHi: string;
  commodityNamePa: string | null;
  mandiCode: string;
  mandiNameEn: string;
  mandiNameHi: string;
  mandiNamePa: string | null;
  state: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  priceDate: string;
  arrivalQuantity: number | null;
  unit: string;
  dataSource: string;
  verified: boolean;
}

export interface PriceComparison {
  commodity: Commodity;
  records: PriceRecord[];
  summaryEn: string;
  summaryHi: string;
  summaryPa: string;
}

export interface GovernmentScheme {
  id: number;
  code: string;
  nameEn: string;
  nameHi: string;
  namePa: string | null;
  category: string;
  descriptionEn: string;
  descriptionHi: string;
  descriptionPa: string | null;
  eligibilityEn: string;
  eligibilityHi: string;
  eligibilityPa: string | null;
  documentsEn: string;
  documentsHi: string;
  documentsPa: string | null;
  applicationStepsEn: string;
  applicationStepsHi: string;
  applicationStepsPa: string | null;
  officialUrl: string;
  verifiedDate: string;
  active: boolean;
}

export interface ComplaintRequest {
  category: string;
  description: string;
  state: string;
  district: string;
  mandiCode?: string;
  farmerName?: string;
  farmerPhone?: string;
}

export interface Complaint {
  id: number;
  referenceNumber: string;
  category: string;
  description: string;
  state: string;
  district: string;
  mandiCode: string | null;
  mandiName: string | null;
  farmerName: string | null;
  farmerPhone: string | null;
  status: string;
  createdAt: string;
}

export interface VoiceQueryResponse {
  transcript: string;
  detectedLanguage: string;
  intent?: string;
  extractedEntities?: Record<string, string>;
  priceRecords?: PriceRecord[];
  responseText: string;
  responseTextHi: string;
  responseTextPa: string;
  audioBase64: string | null;
  source?: string;
  reportingDate?: string;
  aiServiceStatus?: string;
  isLiveGnaniConnected: boolean;
  engineNotice: string;
  relatedQueries: string[];
  backendLatencyMs?: number;
  sttLatencyMs?: number;
  statusCode?: number;
  errorCode?: string;
}

export interface IngestionSummary {
  totalFetched: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  status: string;
  message: string;
  timestamp: string;
}

export interface IngestionRun {
  id: number;
  startedAt: string;
  completedAt: string | null;
  status: string;
  totalFetched: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  message: string | null;
  errorDetails: string | null;
  triggeredBy: string;
}

export interface SyncStatus {
  scheduleEnabled: boolean;
  cron: string;
  zone: string;
  isRunning: boolean;
  upstreamStatus: string;
  latestRun: IngestionRun | null;
  recentRuns: IngestionRun[];
}

export interface RecentConversation {
  id: string;
  query: string;
  response: string;
  language: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  validationErrors?: Record<string, string>;
}
