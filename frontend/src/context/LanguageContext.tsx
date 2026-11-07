import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    appTitle: 'MandiSaathi',
    appSubtitle: 'Agricultural Intelligence Platform for Indian Farmers',
    phase1Badge: 'Phase 1: Foundation',
    systemHealth: 'System Health',
    commodities: 'Commodities',
    mandis: 'Mandis',
    voiceDiagnostic: 'Voice Engine Diagnostic',
    connected: 'Connected',
    degraded: 'Degraded',
    offline: 'Offline',
    backendStatus: 'Spring Boot Backend',
    databaseStatus: 'PostgreSQL Database',
    gnaniStatus: 'Gnani Voice AI (Prisma/Timbre)',
    refresh: 'Refresh Status',
    allCategories: 'All Categories',
    allStates: 'All States',
    unit: 'Unit',
    active: 'Active',
    state: 'State',
    district: 'District',
    testMicrophone: 'Test Microphone Access',
    testingMic: 'Requesting permission...',
    micAllowed: 'Microphone permission granted & audio input ready',
    micDenied: 'Microphone permission denied by browser',
    retry: 'Retry Connection',
    loading: 'Loading platform data...',
    noData: 'No records found matching filter.',
    footerText: 'MandiSaathi — Production Foundation. No synthetic prices, strict data provenance.',
  },
  hi: {
    appTitle: 'मंडी साथी',
    appSubtitle: 'भारतीय किसानों के लिए कृषि बाज़ार आसूचना मंच',
    phase1Badge: 'चरण 1: आधारशिला',
    systemHealth: 'सिस्टम स्थिति',
    commodities: 'प्रमुख फसलें',
    mandis: 'कृषि मंडियां',
    voiceDiagnostic: 'आवाज़ इंजन परीक्षण',
    connected: 'सक्रिय (Connected)',
    degraded: 'आंशिक (Degraded)',
    offline: 'ऑफलाइन (Offline)',
    backendStatus: 'स्प्रिंग बूट बैकएंड',
    databaseStatus: 'पोस्टग्रेएसक्यूएल डेटाबेस',
    gnaniStatus: 'ज्ञानी वॉयस एआई (प्रिज्मा/टिम्ब्रे)',
    refresh: 'स्थिति ताज़ा करें',
    allCategories: 'सभी श्रेणियां',
    allStates: 'सभी राज्य',
    unit: 'इकाई',
    active: 'सक्रिय',
    state: 'राज्य',
    district: 'जिला',
    testMicrophone: 'माइक एक्सेस जांचें',
    testingMic: 'अनुमति मांगी जा रही है...',
    micAllowed: 'माइक एक्सेस स्वीकृत एवं ऑडियो इनपुट तैयार',
    micDenied: 'ब्राउज़र द्वारा माइक अनुमति अस्वीकृत',
    retry: 'पुनः प्रयास करें',
    loading: 'डेटा लोड हो रहा है...',
    noData: 'कोई रिकॉर्ड उपलब्ध नहीं है।',
    footerText: 'मंडी साथी — प्रमाणित कृषि मंच। कोई कृत्रिम भाव नहीं, पूर्ण डेटा सत्यता।',
  },
  pa: {
    appTitle: 'ਮੰਡੀ ਸਾਥੀ',
    appSubtitle: 'ਭਾਰਤੀ ਕਿਸਾਨਾਂ ਲਈ ਖੇਤੀਬਾੜੀ ਮੰਡੀ ਜਾਣਕਾਰੀ ਪਲੇਟਫਾਰਮ',
    phase1Badge: 'ਪੜਾਅ 1: ਨੀਂਹ',
    systemHealth: 'ਸਿਸਟਮ ਸਥਿਤੀ',
    commodities: 'ਮੁੱਖ ਫ਼ਸਲਾਂ',
    mandis: 'ਖੇਤੀਬਾੜੀ ਮੰਡੀਆਂ',
    voiceDiagnostic: 'ਆਵਾਜ਼ ਇੰਜਣ ਟੈਸਟ',
    connected: 'ਕਨੈਕਟਡ (Connected)',
    degraded: 'ਅੰਸ਼ਕ (Degraded)',
    offline: 'ਆਫਲਾਈਨ (Offline)',
    backendStatus: 'ਸਪ੍ਰਿੰਗ ਬੂਟ ਬੈਕਐਂਡ',
    databaseStatus: 'ਪੋਸਟਗ੍ਰੇਐਸਕਿਊਐਲ ਡਾਟਾਬੇਸ',
    gnaniStatus: 'ਗਿਆਨੀ ਵੌਇਸ ਏਆਈ (ਪ੍ਰਿਜ਼ਮਾ/ਟਿੰਬਰੇ)',
    refresh: 'ਸਥਿਤੀ ਤਾਜ਼ਾ ਕਰੋ',
    allCategories: 'ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ',
    allStates: 'ਸਾਰੇ ਰਾਜ',
    unit: 'ਇਕਾਈ',
    active: 'ਸਰਗਰਮ',
    state: 'ਰਾਜ',
    district: 'ਜ਼ਿਲ੍ਹਾ',
    testMicrophone: 'ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਜਾਂਚ ਕਰੋ',
    testingMic: 'ਇਜਾਜ਼ਤ ਮੰਗੀ ਜਾ ਰਹੀ ਹੈ...',
    micAllowed: 'ਮਾਈਕ੍ਰੋਫੋਨ ਇਜਾਜ਼ਤ ਮਿਲ ਗਈ ਅਤੇ ਆਡੀਓ ਤਿਆਰ ਹੈ',
    micDenied: 'ਬ੍ਰਾਊਜ਼ਰ ਦੁਆਰਾ ਮਾਈਕ੍ਰੋਫੋਨ ਇਜਾਜ਼ਤ ਰੱਦ ਕੀਤੀ ਗਈ',
    retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    loading: 'ਡਾਟਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
    noData: 'ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ।',
    footerText: 'ਮੰਡੀ ਸਾਥੀ — ਪ੍ਰਮਾਣਿਤ ਖੇਤੀਬਾੜੀ ਪਲੇਟਫਾਰਮ। ਕੋਈ ਨਕਲੀ ਭਾਅ ਨਹੀਂ।',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('mandisaathi_lang');
    return (saved === 'hi' || saved === 'pa' || saved === 'en') ? saved : 'hi';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mandisaathi_lang', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const current = translations[language];
    return current[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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

