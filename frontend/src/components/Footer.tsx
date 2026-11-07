import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-12 py-6 border-t border-ivory-dark bg-white/60 text-xs text-charcoal-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-forest" />
          <span>{t('footerNotice')}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>Engineered with care for Bharat's farmers</span>
          <Heart className="w-3.5 h-3.5 text-harvest-dark fill-harvest-dark" />
        </div>
      </div>
    </footer>
  );
};

