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
      {/* Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Landmark className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Government Welfare Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {t('schemesTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5 max-w-2xl">
            {t('schemesSubtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-surface border border-hairline px-3 py-1.5 rounded-lg text-charcoal-muted self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5 text-forest" />
          <span>Official Portal Directory</span>
        </div>
      </section>

      {/* Search & Category Filter Toolbar */}
      <section className="rounded-xl border border-hairline bg-surface-white p-4 shadow-subtle space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchSchemesPlaceholder')}
            className="w-full pl-10 pr-12 py-2.5 bg-surface border border-hairline rounded-lg text-xs text-charcoal placeholder-charcoal-subtle focus:outline-none focus:border-forest"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-hairline">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-forest text-white border-forest shadow-subtle'
                      : 'bg-surface text-charcoal border-hairline hover:bg-forest-50/50'
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
              className="text-xs text-forest hover:text-forest-dark font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('filterReset')}</span>
            </button>
          )}
        </div>
      </section>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="rounded-xl border border-hairline bg-surface-white p-12 flex justify-center shadow-subtle">
          <LoadingSpinner />
        </div>
      )}

      {isError && (
        <ErrorMessage
          message={error instanceof Error ? error.message : t('error')}
          onRetry={() => refetch()}
        />
      )}

      {/* Scheme Accordion List */}
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
                <div className="bg-surface-white border border-hairline rounded-lg p-4 space-y-1.5 shadow-subtle">
                  <div className="flex items-center space-x-1.5 font-bold text-forest text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                    <span>{t('schemeEligibility')}</span>
                  </div>
                  <p className="text-charcoal leading-relaxed">
                    {getSchemeEligibility(scheme)}
                  </p>
                </div>

                {/* Documents & Application Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Required Documents */}
                  <div className="bg-surface-white border border-hairline rounded-lg p-4 space-y-2 shadow-subtle">
                    <div className="flex items-center space-x-1.5 font-bold text-charcoal text-xs uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-harvest-dark" />
                      <span>{t('schemeDocuments')}</span>
                    </div>
                    <ul className="space-y-1 text-charcoal-muted leading-relaxed whitespace-pre-line pl-1 font-mono text-[11px]">
                      {getSchemeDocuments(scheme)}
                    </ul>
                  </div>

                  {/* Application Steps */}
                  <div className="bg-surface-white border border-hairline rounded-lg p-4 space-y-2 shadow-subtle">
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
                <div className="pt-2 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-1.5 text-[11px] text-charcoal-muted font-mono">
                    <Calendar className="w-3.5 h-3.5 text-forest" />
                    <span>
                      {t('verifiedOn')}: {scheme.verifiedDate}
                    </span>
                  </div>

                  <a
                    href={scheme.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded-lg shadow-subtle transition-all cursor-pointer active:scale-[0.98]"
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
        <div className="rounded-xl border border-hairline bg-surface-white p-8 text-center max-w-xl mx-auto shadow-subtle">
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
            className="px-4 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-light transition-all shadow-subtle cursor-pointer"
          >
            {t('filterReset')}
          </button>
        </div>
      )}
    </div>
  );
};
