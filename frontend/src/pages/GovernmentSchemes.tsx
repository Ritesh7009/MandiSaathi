import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { AccordionItem } from '../components/ui/AccordionItem';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  Landmark,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ListOrdered,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { GovernmentScheme } from '../types';

export const GovernmentSchemes: React.FC = () => {
  const { language, t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const categories = [
    { id: '', labelKey: 'allCategories' },
    { id: 'INCOME_SUPPORT', labelKey: 'catIncome' },
    { id: 'CROP_INSURANCE', labelKey: 'catInsurance' },
    { id: 'SOIL_NUTRIENTS', labelKey: 'catSoil' },
    { id: 'MARKET_ACCESS', labelKey: 'catMarket' },
    { id: 'CREDIT', labelKey: 'catCredit' },
  ];

  const {
    data: schemes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['governmentSchemes', selectedCategory, searchTerm],
    queryFn: () => api.getSchemes(selectedCategory || undefined, searchTerm || undefined),
    staleTime: 120000,
  });

  const getSchemeName = (s: GovernmentScheme) => {
    if (language === 'hi' && s.nameHi) return s.nameHi;
    if (language === 'pa' && s.namePa) return s.namePa;
    return s.nameEn;
  };

  const getSchemeDescription = (s: GovernmentScheme) => {
    if (language === 'hi' && s.descriptionHi) return s.descriptionHi;
    if (language === 'pa' && s.descriptionPa) return s.descriptionPa;
    return s.descriptionEn;
  };

  const getSchemeEligibility = (s: GovernmentScheme) => {
    if (language === 'hi' && s.eligibilityHi) return s.eligibilityHi;
    if (language === 'pa' && s.eligibilityPa) return s.eligibilityPa;
    return s.eligibilityEn;
  };

  const getSchemeDocuments = (s: GovernmentScheme) => {
    if (language === 'hi' && s.documentsHi) return s.documentsHi;
    if (language === 'pa' && s.documentsPa) return s.documentsPa;
    return s.documentsEn;
  };

  const getSchemeSteps = (s: GovernmentScheme) => {
    if (language === 'hi' && s.applicationStepsHi) return s.applicationStepsHi;
    if (language === 'pa' && s.applicationStepsPa) return s.applicationStepsPa;
    return s.applicationStepsEn;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'INCOME_SUPPORT':
        return t('catIncome');
      case 'CROP_INSURANCE':
        return t('catInsurance');
      case 'SOIL_NUTRIENTS':
        return t('catSoil');
      case 'MARKET_ACCESS':
        return t('catMarket');
      case 'CREDIT':
        return t('catCredit');
      default:
        return category;
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Page Header */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
              <Landmark className="w-4 h-4 text-harvest-dark" />
              <span>{t('schemesTitle')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
              {t('schemesTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1 max-w-2xl">
              {t('schemesSubtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-ivory border border-ivory-dark px-3 py-1.5 rounded text-charcoal-muted self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-forest" />
            <span>Official Government Verified Data</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white border border-ivory-dark rounded-md p-4 sm:p-5 shadow-subtle space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchSchemesPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-ivory border border-ivory-dark rounded text-xs text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-ivory-dark">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-forest text-white border-forest shadow-xs'
                      : 'bg-ivory text-charcoal border-ivory-dark hover:bg-ivory-dark'
                  }`}
                >
                  {t(cat.labelKey)}
                </button>
              );
            })}
          </div>

          {(searchTerm || selectedCategory) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-forest hover:text-forest-dark font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('filterReset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="bg-white border border-ivory-dark rounded-md p-10 flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      {isError && (
        <ErrorMessage
          message={error instanceof Error ? error.message : t('error')}
          onRetry={() => refetch()}
        />
      )}

      {/* Scheme Accordion List (Adapted from Motion Primitives) */}
      {!isLoading && !isError && schemes.length > 0 && (
        <div className="space-y-3">
          {schemes.map((scheme, idx) => (
            <AccordionItem
              key={scheme.code}
              title={getSchemeName(scheme)}
              badge={getCategoryLabel(scheme.category)}
              subtitle={scheme.verifiedDate}
              defaultOpen={idx === 0}
            >
              <div className="space-y-4 pt-2 text-xs">
                {/* Description */}
                <div>
                  <p className="text-charcoal leading-relaxed text-sm">
                    {getSchemeDescription(scheme)}
                  </p>
                </div>

                {/* Eligibility Criteria */}
                <div className="bg-white border border-ivory-dark rounded p-3.5 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-forest text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('schemeEligibility')}</span>
                  </div>
                  <p className="text-charcoal leading-relaxed">
                    {getSchemeEligibility(scheme)}
                  </p>
                </div>

                {/* Documents & Application Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Required Documents */}
                  <div className="bg-white border border-ivory-dark rounded p-3.5 space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-charcoal text-xs uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-harvest-dark" />
                      <span>{t('schemeDocuments')}</span>
                    </div>
                    <ul className="space-y-1 text-charcoal-muted leading-relaxed whitespace-pre-line pl-1 font-mono text-[11px]">
                      {getSchemeDocuments(scheme)}
                    </ul>
                  </div>

                  {/* Application Steps */}
                  <div className="bg-white border border-ivory-dark rounded p-3.5 space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-charcoal text-xs uppercase tracking-wider">
                      <ListOrdered className="w-3.5 h-3.5 text-forest" />
                      <span>{t('schemeApplication')}</span>
                    </div>
                    <div className="space-y-1 text-charcoal-muted leading-relaxed whitespace-pre-line pl-1 text-[11px]">
                      {getSchemeSteps(scheme)}
                    </div>
                  </div>
                </div>

                {/* Footer with Verified Provenance & Official Portal Button */}
                <div className="pt-2 border-t border-ivory-dark/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-1.5 text-[11px] text-charcoal-muted">
                    <Calendar className="w-3.5 h-3.5 text-forest" />
                    <span>
                      {t('verifiedOn')}: {scheme.verifiedDate}
                    </span>
                  </div>

                  <a
                    href={scheme.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded shadow-xs transition-colors"
                  >
                    <span>{t('officialPortalBtn')}</span>
                    <ExternalLink className="w-3 h-3 text-harvest" />
                  </a>
                </div>
              </div>
            </AccordionItem>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && schemes.length === 0 && (
        <div className="bg-white border border-ivory-dark rounded-md p-8 text-center max-w-xl mx-auto shadow-subtle">
          <Landmark className="w-10 h-10 text-charcoal-muted mx-auto mb-2" />
          <h3 className="font-bold text-charcoal text-base mb-1">
            No Schemes Found
          </h3>
          <p className="text-xs text-charcoal-muted mb-4">
            No government support schemes match your search query &quot;{searchTerm}&quot; or category.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3.5 py-1.5 bg-forest text-white text-xs font-semibold rounded hover:bg-forest-light transition-colors"
          >
            {t('filterReset')}
          </button>
        </div>
      )}
    </div>
  );
};
