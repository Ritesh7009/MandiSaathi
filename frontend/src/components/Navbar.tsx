import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, Globe } from 'lucide-react';
import { Language } from '../types';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; label: string; nativeName: string }[] = [
    { code: 'hi', label: 'हिन्दी', nativeName: 'Hindi' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', nativeName: 'Punjabi' },
    { code: 'en', label: 'English', nativeName: 'English' },
  ];

  return (
    <header className="bg-forest text-ivory border-b border-forest-dark sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-harvest text-forest-dark p-2 rounded-md flex items-center justify-center">
              <Sprout className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight">{t('appTitle')}</span>
                <span className="bg-forest-light text-harvest text-xs font-semibold px-2 py-0.5 rounded border border-harvest/30">
                  {t('phase1Badge')}
                </span>
              </div>
              <p className="text-xs text-ivory/80 hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-1 sm:space-x-2 bg-forest-dark p-1 rounded-md border border-forest-light/30">
            <Globe className="w-4 h-4 text-harvest ml-1.5 hidden sm:inline" />
            {languages.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-harvest text-forest-dark font-semibold shadow-xs'
                      : 'text-ivory hover:text-white hover:bg-forest-light/40'
                  }`}
                  aria-pressed={isActive}
                  title={`Switch language to ${lang.nativeName}`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

