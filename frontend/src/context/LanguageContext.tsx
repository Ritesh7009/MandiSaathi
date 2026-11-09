import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import {
  translations,
  COMMODITY_LOCALIZATIONS,
  MANDI_LOCALIZATIONS,
  getLocalizedCommodityName,
  getLocalizedMandiName,
} from './translations';

export interface SupportedLanguage {
  code: Language;
  label: string;       // Native script name
  name: string;        // English name
  script: string;      // Script family
  bcp47: string;       // BCP-47 locale tag
  greeting: string;    // Culturally authentic farmer greeting
  description: string; // Agricultural region & relevance
  region: string;      // Broad Indian geographic zone
}

/**
 * The 10 official Indian languages fully supported by Gnani AI
 * (Prisma STT speech-to-text and Timbre TTS voice synthesis)
 */
export const ALL_RECOGNIZED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'hi',
    label: 'हिन्दी',
    name: 'Hindi',
    script: 'Devanagari',
    bcp47: 'hi-IN',
    greeting: 'राम राम, किसान साथी',
    description: 'Northern & Central India (UP, MP, Bihar, Rajasthan, Haryana, Delhi)',
    region: 'North & Central India',
  },
  {
    code: 'pa',
    label: 'ਪੰਜਾਬੀ',
    name: 'Punjabi',
    script: 'Gurmukhi',
    bcp47: 'pa-IN',
    greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਸਾਥੀ',
    description: 'Punjab & Haryana wheat, paddy & cotton belt',
    region: 'North India',
  },
  {
    code: 'en',
    label: 'English',
    name: 'English (Indian)',
    script: 'Latin',
    bcp47: 'en-IN',
    greeting: 'Welcome, Farmer Friend',
    description: 'National and inter-state agricultural trade and extension',
    region: 'All India',
  },
  {
    code: 'mr',
    label: 'मराठी',
    name: 'Marathi',
    script: 'Devanagari',
    bcp47: 'mr-IN',
    greeting: 'नमस्कार, शेतकरी मित्र',
    description: 'Maharashtra onion, soybean, cotton & sugarcane mandis (Lasalgaon, Nashik, Pune)',
    region: 'Western India',
  },
  {
    code: 'gu',
    label: 'ગુજરાતી',
    name: 'Gujarati',
    script: 'Gujarati',
    bcp47: 'gu-IN',
    greeting: 'નમસ્તે, ખેડૂત મિત્ર',
    description: 'Gujarat groundnut, cotton, cumin & castor mandis (Rajkot, Unjha, Gondal)',
    region: 'Western India',
  },
  {
    code: 'bn',
    label: 'বাংলা',
    name: 'Bengali',
    script: 'Bengali',
    bcp47: 'bn-IN',
    greeting: 'নমস্কার, কৃষক বন্ধু',
    description: 'West Bengal & Tripura paddy, jute & potato markets (Burdwan, Siliguri)',
    region: 'Eastern India',
  },
  {
    code: 'te',
    label: 'తెలుగు',
    name: 'Telugu',
    script: 'Telugu',
    bcp47: 'te-IN',
    greeting: 'నమస్కారం, రైతు మిత్రమా',
    description: 'Andhra Pradesh & Telangana chilli, cotton & paddy mandis (Guntur, Warangal)',
    region: 'Southern India',
  },
  {
    code: 'ta',
    label: 'தமிழ்',
    name: 'Tamil',
    script: 'Tamil',
    bcp47: 'ta-IN',
    greeting: 'வணக்கம், உழவர் தோழரே',
    description: 'Tamil Nadu paddy, turmeric, banana & copra markets (Erode, Madurai, Salem)',
    region: 'Southern India',
  },
  {
    code: 'kn',
    label: 'ಕನ್ನಡ',
    name: 'Kannada',
    script: 'Kannada',
    bcp47: 'kn-IN',
    greeting: 'ನಮಸ್ಕಾರ, ರೈತ ಮಿತ್ರ',
    description: 'Karnataka ragi, maize, coffee, areca & pulse markets (Hubballi, Mysuru)',
    region: 'Southern India',
  },
  {
    code: 'ml',
    label: 'മലയാളം',
    name: 'Malayalam',
    script: 'Malayalam',
    bcp47: 'ml-IN',
    greeting: 'നമസ്കാരം, കർഷക സുഹൃത്തേ',
    description: 'Kerala spices, rubber, coconut, pepper & cardamom trading (Kochi, Wayanad)',
    region: 'Southern India',
  },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: 'normal' | 'large';
  setFontSize: (size: 'normal' | 'large') => void;
  t: (key: string) => string;
  getCommodityName: (codeOrName: string | undefined | null, fallback?: string) => string;
  getMandiName: (codeOrName: string | undefined | null, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('mandisaathi_lang');
    return saved && ALL_RECOGNIZED_LANGUAGES.some((l) => l.code === saved)
      ? (saved as Language)
      : 'hi';
  });

  const [fontSize, setFontSizeState] = useState<'normal' | 'large'>(() => {
    const saved = localStorage.getItem('mandisaathi_fontsize');
    return saved === 'large' ? 'large' : 'normal';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mandisaathi_lang', lang);
  };

  const setFontSize = (size: 'normal' | 'large') => {
    setFontSizeState(size);
    localStorage.setItem('mandisaathi_fontsize', size);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (fontSize === 'large') {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
  }, [fontSize]);

  const t = (key: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) return langDict[key];
    if (translations.hi && translations.hi[key]) return translations.hi[key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return key;
  };

  const getCommodityName = (codeOrName: string | undefined | null, fallback?: string): string => {
    return getLocalizedCommodityName(codeOrName, language, fallback);
  };

  const getMandiName = (codeOrName: string | undefined | null, fallback?: string): string => {
    return getLocalizedMandiName(codeOrName, language, fallback);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        fontSize,
        setFontSize,
        t,
        getCommodityName,
        getMandiName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};

export {
  translations,
  COMMODITY_LOCALIZATIONS,
  MANDI_LOCALIZATIONS,
  getLocalizedCommodityName,
  getLocalizedMandiName,
};
