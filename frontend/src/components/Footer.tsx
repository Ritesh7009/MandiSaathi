import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, Heart, Plant, Scales, TrendUp, Bank, BookOpenText } from '@phosphor-icons/react';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <footer className="mt-14 border-t border-line bg-surface-subtle/70 text-xs text-ink-muted py-8 mb-20 md:mb-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-line">
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center gap-2 text-ink font-display font-bold text-sm">
              <img src="/icon.svg" alt="MandiSaathi" className="w-6 h-6 rounded-md" />
              <span>{t('appTitle')}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-canopy-soft text-canopy dark:text-canopy-bright border border-canopy/20">
                APMC · ICAR · IMD
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {t('footerNotice')}
            </p>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-canopy dark:hover:text-canopy-bright transition-colors">
              <Plant weight="duotone" className="w-3.5 h-3.5" />
              <span>{t('navHome')}</span>
            </Link>
            <Link to="/prices" className="inline-flex items-center gap-1.5 hover:text-canopy dark:hover:text-canopy-bright transition-colors">
              <TrendUp weight="duotone" className="w-3.5 h-3.5" />
              <span>{t('navPrices')}</span>
            </Link>
            <Link to="/compare" className="inline-flex items-center gap-1.5 hover:text-canopy dark:hover:text-canopy-bright transition-colors">
              <Scales weight="duotone" className="w-3.5 h-3.5" />
              <span>{t('navCompare')}</span>
            </Link>
            <Link to="/crops" className="inline-flex items-center gap-1.5 hover:text-canopy dark:hover:text-canopy-bright transition-colors">
              <BookOpenText weight="duotone" className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'फसल ज्ञान' : language === 'pa' ? 'ਫ਼ਸਲ ਗਿਆਨ' : 'All Crops'}</span>
            </Link>
            <Link to="/schemes" className="inline-flex items-center gap-1.5 hover:text-canopy dark:hover:text-canopy-bright transition-colors">
              <Bank weight="duotone" className="w-3.5 h-3.5" />
              <span>{t('navSchemes')}</span>
            </Link>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center space-x-2 text-center sm:text-left">
            <ShieldCheck weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
            <span>Agmarknet · RSAMB · PAU Ludhiana · ICAR IIWBR · IMD Gramin Krishi Mausam Sewa</span>
          </div>
          <div className="flex items-center space-x-1.5 font-medium shrink-0">
            <span>Engineered for Indian Agriculture</span>
            <Heart weight="fill" className="w-3.5 h-3.5 text-saffron" />
          </div>
        </div>
      </div>
    </footer>
  );
};
