import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { useAnimatedLayout } from '@astryxdesign/core/hooks';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { GsapStaggerGrid } from '../components/ui/MotionPrimitives';
import { LottieBadge } from '../components/ui/LottieBadge';
import {
  Bank,
  MagnifyingGlass,
  CheckCircle,
  FileText,
  ListChecks,
  ArrowSquareOut,
  ShieldCheck,
  CalendarCheck,
  X,
} from '@phosphor-icons/react';
import { GovernmentScheme } from '../types';

/**
 * Normalizes stored multiline database strings (converting literal "\n" escapes to real newlines)
 * and cleans redundant list prefixes so documents and steps render crisply without raw tokens.
 */
const parseMultilineItems = (raw?: string | null, stripNumbers = false): string[] => {
  if (!raw) return [];
  return raw
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((line) => {
      let cleaned = line.trim().replace(/^[•\-*]\s*/, '');
      if (stripNumbers) {
        cleaned = cleaned.replace(/^\d+[.)]\s*/, '');
      }
      return cleaned.trim();
    })
    .filter(Boolean);
};

const isSafeHttpUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('http://');
};

export const GovernmentSchemes: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const listContainerRef = useRef<HTMLDivElement>(null);
  const animatedLayout = useAnimatedLayout({ containerRef: listContainerRef });

  const categories = [
    { code: '', label: t('allCategories') },
    { code: 'INCOME_SUPPORT', label: t('catIncome') },
    { code: 'CROP_INSURANCE', label: t('catInsurance') },
    { code: 'SOIL_NUTRIENTS', label: t('catSoil') },
    { code: 'MARKET_ACCESS', label: t('catMarket') },
    { code: 'CREDIT', label: t('catCredit') },
  ];

  const categoryLabelMap: Record<string, string> = {
    INCOME_SUPPORT: t('catIncome'),
    CROP_INSURANCE: t('catInsurance'),
    SOIL_NUTRIENTS: t('catSoil'),
    MARKET_ACCESS: t('catMarket'),
    CREDIT: t('catCredit'),
  };

  const {
    data: schemes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['governmentSchemes', selectedCategory, searchTerm],
    queryFn: () =>
      api.getSchemes(selectedCategory || undefined, searchTerm.trim() || undefined),
    staleTime: 120000,
  });

  const getLocalizedField = (
    en: string | null | undefined,
    hi: string | null | undefined,
    pa: string | null | undefined
  ): string => {
    if (language === 'hi') return hi || en || '';
    if (language === 'pa') return pa || hi || en || '';
    return en || '';
  };

  const getSchemeName = (s: GovernmentScheme) =>
    getLocalizedField(s.nameEn, s.nameHi, s.namePa);
  const getSchemeDescription = (s: GovernmentScheme) =>
    getLocalizedField(s.descriptionEn, s.descriptionHi, s.descriptionPa);
  const getSchemeEligibility = (s: GovernmentScheme) =>
    getLocalizedField(s.eligibilityEn, s.eligibilityHi, s.eligibilityPa);
  const getSchemeDocuments = (s: GovernmentScheme) =>
    getLocalizedField(s.documentsEn, s.documentsHi, s.documentsPa);
  const getSchemeSteps = (s: GovernmentScheme) =>
    getLocalizedField(s.applicationStepsEn, s.applicationStepsHi, s.applicationStepsPa);

  const countLabel =
    language === 'hi'
      ? 'योजनाएं उपलब्ध'
      : language === 'pa'
      ? 'ਸਕੀਮਾਂ ਉਪਲਬਧ'
      : 'Schemes Indexed';

  const overviewHeading =
    language === 'hi'
      ? 'योजना विवरण'
      : language === 'pa'
      ? 'ਸਕੀਮ ਵੇਰਵਾ'
      : 'Scheme Overview';

  const emptyHeadline =
    language === 'hi'
      ? 'इस खोज या श्रेणी में कोई योजना नहीं मिली'
      : language === 'pa'
      ? 'ਇਸ ਖੋਜ ਜਾਂ ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਕੋਈ ਸਕੀਮ ਨਹੀਂ ਮਿਲੀ'
      : 'No welfare schemes match your current search';

  const emptyHint =
    language === 'hi'
      ? 'कृपया खोज शब्द बदलें या सभी श्रेणियों का चयन करें।'
      : language === 'pa'
      ? 'ਕਿਰਪਾ ਕਰਕੇ ਖੋਜ ਸ਼ਬਦ ਬਦਲੋ ਜਾਂ ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ ਚੁਣੋ।'
      : 'Try clearing the search query or switching back to all categories.';

  const officialDisclaimer =
    language === 'hi'
      ? 'योजना पात्रता और आवेदन लिंक आधिकारिक सरकारी पोर्टल (gov.in / nic.in) से सत्यापित हैं।'
      : language === 'pa'
      ? 'ਸਕੀਮ ਦੀ ਯੋਗਤਾ ਅਤੇ ਅਰਜ਼ੀ ਲਿੰਕ ਅਧਿਕਾਰਤ ਸਰਕਾਰੀ ਪੋਰਟਲ (gov.in / nic.in) ਤੋਂ ਪ੍ਰਮਾਣਿਤ ਹਨ।'
      : 'Scheme eligibility criteria and direct application links are verified against official government portals.';

  return (
    <div className="space-y-6 pb-8">
      {/* Editorial Masthead */}
      <Card padding={6} className="bg-surface">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center flex-wrap gap-2">
              <Badge
                variant="success"
                icon={<Bank weight="duotone" className="w-3.5 h-3.5" />}
                label={t('moreSchemesBadge')}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                04 · WELFARE &amp; SUBSIDY DIRECTORY
              </span>
            </div>
            <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight">
              {t('schemesTitle')}
            </h1>
            <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
              {t('schemesSubtitle')}
            </p>
          </div>

          <Badge
            variant="neutral"
            icon={<ShieldCheck weight="fill" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />}
            label={`${schemes.length} ${countLabel}`}
          />
        </div>
      </Card>

      {/* Search & Category Filter Card */}
      <Card padding={5} className="bg-surface">
        <div className="space-y-4">
          <TextInput
            label={t('searchSchemesPlaceholder')}
            isLabelHidden
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('searchSchemesPlaceholder')}
            startIcon={<MagnifyingGlass weight="bold" className="w-4 h-4" />}
            hasClear
            size="lg"
            width="100%"
          />

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('allCategories')}>
            {categories.map((cat) => {
              const active = selectedCategory === cat.code;
              return (
                <button
                  key={cat.code || 'ALL'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(cat.code)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    active
                      ? 'bg-canopy text-white border-canopy shadow-subtle'
                      : 'bg-surface-subtle text-ink-muted border-line hover:text-ink hover:border-line-strong'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Schemes Accordion Ledger */}
      {isLoading ? (
        <LoadingSpinner message={t('loading')} />
      ) : isError ? (
        <ErrorMessage
          message={(error as Error)?.message || t('error')}
          onRetry={() => refetch()}
        />
      ) : schemes.length === 0 ? (
        <Card padding={6} className="bg-surface">
          <EmptyState
            icon={<LottieBadge variant="empty" loop className="w-16 h-16" />}
            title={emptyHeadline}
            description={emptyHint}
            actions={
              (selectedCategory || searchTerm) ? (
                <Button
                  label={t('filterReset')}
                  variant="primary"
                  icon={<X weight="bold" className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedCategory('');
                    setSearchTerm('');
                  }}
                />
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div ref={listContainerRef}>
          <GsapStaggerGrid
            depKey={`${selectedCategory}-${searchTerm}-${schemes.length}`}
            className="space-y-3"
          >
            {schemes.map((scheme, idx) => {
              const descLines = parseMultilineItems(getSchemeDescription(scheme));
              const eligibilityLines = parseMultilineItems(getSchemeEligibility(scheme));
              const documentLines = parseMultilineItems(getSchemeDocuments(scheme));
              const stepLines = parseMultilineItems(getSchemeSteps(scheme), true);

              return (
                <Card key={scheme.id} padding={4} className="gs-stagger-item bg-surface">
                  <Collapsible
                    defaultIsOpen={idx === 0}
                    animatedLayout={animatedLayout}
                    trigger={
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left pr-2 w-full">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-semibold text-ink-subtle">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="font-display font-semibold text-base text-ink">
                              {getSchemeName(scheme)}
                            </span>
                            <Badge
                              variant="success"
                              label={categoryLabelMap[scheme.category] || scheme.category}
                            />
                          </div>
                          <p className="text-xs text-ink-muted line-clamp-1">
                            {descLines[0] || getSchemeDescription(scheme)}
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <div className="pt-4 space-y-4">
                      <Divider />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Overview & Eligibility */}
                        <div className="rounded-xl bg-surface-subtle/50 border border-line p-4 space-y-3">
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                              <Bank weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                              <span>{overviewHeading}</span>
                            </h4>
                            <div className="space-y-1.5 text-xs text-ink leading-relaxed">
                              {descLines.map((line, i) => (
                                <p key={i}>{line}</p>
                              ))}
                            </div>
                          </div>

                          <Divider />

                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-canopy dark:text-canopy-bright flex items-center gap-1.5">
                              <CheckCircle weight="duotone" className="w-3.5 h-3.5" />
                              <span>{t('schemeEligibility')}</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-ink leading-relaxed">
                              {eligibilityLines.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-canopy dark:bg-canopy-bright mt-1.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Required Documents */}
                        <div className="rounded-xl bg-surface-subtle/50 border border-line p-4 space-y-2.5">
                          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-saffron-text flex items-center gap-1.5">
                            <FileText weight="duotone" className="w-3.5 h-3.5" />
                            <span>{t('schemeDocuments')}</span>
                          </h4>
                          <ul className="space-y-2 text-xs text-ink leading-relaxed">
                            {documentLines.map((doc, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2.5 p-2 rounded-lg bg-surface border border-line/70"
                              >
                                <CheckCircle
                                  weight="fill"
                                  className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright mt-0.5 shrink-0"
                                />
                                <span>{doc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Application Steps */}
                      {stepLines.length > 0 && (
                        <div className="rounded-xl bg-surface-subtle/50 border border-line p-4 space-y-3">
                          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                            <ListChecks weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                            <span>{t('schemeApplication')}</span>
                          </h4>
                          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {stepLines.map((step, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface border border-line/70 text-xs text-ink leading-relaxed"
                              >
                                <span className="font-mono tnum text-[10px] font-semibold px-1.5 py-0.5 rounded bg-canopy-soft text-canopy dark:text-canopy-bright border border-canopy/20 shrink-0">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Verification Footer & Official Portal Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-line">
                        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                          <CalendarCheck weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
                          <span>
                            {t('verifiedOn')}:{' '}
                            <span className="font-mono tnum font-medium text-ink">
                              {scheme.verifiedDate}
                            </span>
                          </span>
                        </div>

                        {scheme.officialUrl && isSafeHttpUrl(scheme.officialUrl) && (
                          <Button
                            label={t('officialPortalBtn')}
                            variant="primary"
                            size="md"
                            href={scheme.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            endContent={<ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />}
                          />
                        )}
                      </div>
                    </div>
                  </Collapsible>
                </Card>
              );
            })}
          </GsapStaggerGrid>
        </div>
      )}

      {/* Official Provenance Banner */}
      <Banner status="info" collapsible={false} title={officialDisclaimer} />
    </div>
  );
};
