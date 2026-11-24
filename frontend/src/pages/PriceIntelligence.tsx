import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import {
  Table,
  proportional,
  useTableSortableState,
  useTableSortable,
  type TableColumn,
} from '@astryxdesign/core/Table';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { api } from '../services/apiClient';
import { savePriceRecords, getCachedPrices, saveCommodities, saveMandis } from '../services/offlineStorage';
import { MetricTile } from '../components/ui/MetricTile';
import { PriceSpreadBar } from '../components/ui/PriceSpreadBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { WatchlistBar } from '../components/ui/WatchlistBar';
import { GsapStaggerGrid, MorphingActionButton } from '../components/ui/MotionPrimitives';
import { LottieBadge } from '../components/ui/LottieBadge';
import {
  TrendUp,
  MapPin,
  Calendar,
  ShieldCheck,
  ArrowCounterClockwise,
  Scales,
  Grains,
  Clock,
  ArrowsClockwise,
  Database,
  CaretDown,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react';
import { IngestionSummary, PriceRecord } from '../types';

type PriceTableRow = PriceRecord & Record<string, unknown>;

const ALL_INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Chandigarh',
  'Puducherry',
] as const;

export const PriceIntelligence: React.FC = () => {
  const { language, t, getCommodityName, getMandiName } = useLanguage();
  const { isOnline } = useNetwork();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [pageSelection, setPageSelection] = useState({ filters: '', page: 0 });
  const [selectedMandi, setSelectedMandi] = useState<string>(() => searchParams.get('mandi') || '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncJustSucceeded, setSyncJustSucceeded] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<IngestionSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [offlinePrices, setOfflinePrices] = useState<PriceRecord[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isCacheStale, setIsCacheStale] = useState<boolean>(false);
  const [isUsingCache, setIsUsingCache] = useState<boolean>(false);

  const { data: commodities = [] } = useQuery({
    queryKey: ['commoditiesList'],
    queryFn: () => api.getCommodities(),
    staleTime: 120000,
  });

  useEffect(() => {
    const requestedCommodity = searchParams.get('commodity');
    if (requestedCommodity && commodities.length > 0) {
      const normalized = requestedCommodity.trim().toLowerCase();
      const matched = commodities.find((c) => {
        const code = c.code.toLowerCase();
        const en = c.nameEn.toLowerCase();
        const hi = (c.nameHi || '').toLowerCase();
        const pa = (c.namePa || '').toLowerCase();
        return (
          code === normalized ||
          en === normalized ||
          en.includes(normalized) ||
          normalized.includes(code) ||
          (normalized.includes('chilli') && (code === 'chilli' || en.includes('chilli'))) ||
          (normalized.includes('mirch') && (code === 'chilli' || en.includes('chilli') || hi.includes('मिर्च'))) ||
          (normalized.includes('cumin') && (code === 'cumin' || en.includes('cumin'))) ||
          (normalized.includes('jeera') && (code === 'cumin' || en.includes('cumin') || hi.includes('जीरा'))) ||
          (normalized.includes('haldi') && (code === 'turmeric' || en.includes('turmeric') || hi.includes('हल्दी'))) ||
          (normalized.includes('turmeric') && (code === 'turmeric' || en.includes('turmeric'))) ||
          (normalized.includes('groundnut') && (code === 'groundnut' || en.includes('groundnut'))) ||
          (normalized.includes('mungfali') && (code === 'groundnut' || en.includes('groundnut') || hi.includes('मूंगफली'))) ||
          hi.includes(normalized) ||
          pa.includes(normalized)
        );
      });
      if (matched) {
        setSelectedCommodity(matched.code);
      }
    }
  }, [searchParams, commodities]);

  const { data: mandis = [] } = useQuery({
    queryKey: ['allMandisList'],
    queryFn: () => api.getMandis(),
    staleTime: 120000,
  });

  const pageSize = 50;
  const filterKey = [selectedCommodity, selectedState, selectedDistrict, selectedMandi].join('|');
  const page = pageSelection.filters === filterKey ? pageSelection.page : 0;

  const {
    data: priceRecords = [],
    isLoading: loadingPrices,
    isError: errorPrices,
    error: priceError,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: ['priceRecords', filterKey, page],
    queryFn: () => api.getPrices(selectedCommodity || undefined, selectedMandi || undefined, {
      state: selectedState || undefined,
      district: selectedDistrict || undefined,
      page,
      size: pageSize,
    }),
    staleTime: 60000,
    enabled: isOnline,
  });

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('mandisaathi_admin_key') : null;
  const { data: syncStatus } = useQuery({
    queryKey: ['syncScheduleStatus', adminKey],
    queryFn: () => api.getSyncStatus(adminKey || undefined),
    staleTime: 60000,
    enabled: isOnline && !!adminKey,
  });

  useEffect(() => {
    if (commodities.length > 0) saveCommodities(commodities).catch(() => {});
  }, [commodities]);

  useEffect(() => {
    if (mandis.length > 0) saveMandis(mandis).catch(() => {});
  }, [mandis]);

  useEffect(() => {
    if (isOnline && priceRecords.length > 0) {
      savePriceRecords(priceRecords).catch(() => {});
    }
  }, [isOnline, priceRecords]);

  useEffect(() => {
    if (!isOnline || errorPrices) {
      getCachedPrices(selectedCommodity || undefined, selectedMandi || undefined)
        .then((result) => {
          setOfflinePrices(result.records);
          setLastSyncedAt(result.lastSyncedAt);
          setIsCacheStale(result.isStale);
          setIsUsingCache(true);
        })
        .catch(() => {});
    } else {
      setIsUsingCache(false);
    }
  }, [isOnline, errorPrices, selectedCommodity, selectedMandi]);

  const activeRecords = isUsingCache || !isOnline ? offlinePrices : priceRecords;
  const reportingDate = activeRecords.reduce(
    (latest, row) => (row.priceDate > latest ? row.priceDate : latest), '',
  );

  const states = useMemo(() => {
    const s = new Set<string>(ALL_INDIAN_STATES);
    mandis.forEach((m) => {
      if (m.state) s.add(m.state);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [mandis]);

  const districts = useMemo(() => {
    const d = new Set<string>();
    mandis.forEach((m) => {
      if (!selectedState || m.state.toLowerCase() === selectedState.toLowerCase()) {
        if (m.district) d.add(m.district);
      }
    });
    return Array.from(d).sort();
  }, [mandis, selectedState]);

  const filteredMandis = useMemo(() => {
    return mandis.filter((m) => {
      if (selectedState && m.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedDistrict && m.district.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      return true;
    });
  }, [mandis, selectedState, selectedDistrict]);

  const handleResetFilters = () => {
    setSelectedCommodity('');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedMandi('');
    setSearchQuery('');
  };

  const displayedRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeRecords.filter((r) => {
      if (selectedState && r.state && r.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedDistrict && r.district && r.district.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      if (!q) return true;
      const commName = (
        getCommodityName(r.commodityCode, r.commodityNameEn) +
        ' ' +
        (r.commodityNameHi || '') +
        ' ' +
        (r.commodityNamePa || '')
      ).toLowerCase();
      const mandiName = (
        (r.mandiNameEn || '') +
        ' ' +
        (r.mandiNameHi || '') +
        ' ' +
        (r.mandiNamePa || '')
      ).toLowerCase();
      const stateName = (r.state || '').toLowerCase();
      const distName = (r.district || '').toLowerCase();
      const variety = (r.variety || '').toLowerCase();
      const code = (r.commodityCode || '').toLowerCase();
      return (
        commName.includes(q) ||
        code.includes(q) ||
        mandiName.includes(q) ||
        stateName.includes(q) ||
        distName.includes(q) ||
        variety.includes(q) ||
        (q.includes('chilli') && (code === 'chilli' || commName.includes('chilli') || commName.includes('mirch') || commName.includes('मिर्च'))) ||
        (q.includes('mirch') && (code === 'chilli' || commName.includes('chilli') || commName.includes('mirch') || commName.includes('मिर्च'))) ||
        (q.includes('jeera') && (code === 'cumin' || commName.includes('cumin') || commName.includes('jeera') || commName.includes('जीरा'))) ||
        (q.includes('cumin') && (code === 'cumin' || commName.includes('cumin') || commName.includes('jeera') || commName.includes('जीरा'))) ||
        (q.includes('haldi') && (code === 'turmeric' || commName.includes('turmeric') || commName.includes('haldi') || commName.includes('हल्दी')))
      );
    });
  }, [activeRecords, selectedState, selectedDistrict, searchQuery, getCommodityName]);

  const summary = useMemo(() => {
    if (displayedRecords.length === 0) return null;
    const modalPrices = displayedRecords.map((r) => r.modalPrice);
    const avgModal = Math.round(modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length);
    const minOverall = Math.min(...displayedRecords.map((r) => r.minPrice));
    const maxOverall = Math.max(...displayedRecords.map((r) => r.maxPrice));
    const arrivalRows = displayedRecords.filter((record) => record.arrivalQuantity != null);
    const totalArrivals = arrivalRows.length
      ? arrivalRows.reduce((sum, record) => sum + (record.arrivalQuantity ?? 0), 0)
      : undefined;
    return { avgModal, minOverall, maxOverall, totalArrivals };
  }, [displayedRecords]);

  const handleRefreshPrices = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSummary(null);
    try {
      if (adminKey) {
        const res = await api.syncMandiPrices(adminKey);
        setSyncSummary(res);
        if (res.status !== 'CONNECTED') {
          await refetchPrices();
          return;
        }
      }
      const refreshed = await refetchPrices();
      if (refreshed.isError) throw refreshed.error;
      setSyncJustSucceeded(true);
      setTimeout(() => setSyncJustSucceeded(false), 1800);
    } catch (err: unknown) {
      await refetchPrices();
      setSyncError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const labels = useMemo(() => {
    if (language === 'hi') {
      return {
        refreshBtn: adminKey ? t('dataSyncButton') : 'भाव रीफ्रेश करें',
        refreshing: adminKey ? t('dataSyncInProgress') : 'लोड हो रहा है...',
        avgBadge: 'औसत',
        floorBadge: 'न्यूनतम',
        peakBadge: 'अधिकतम',
        verifiedBadge: isUsingCache ? 'संग्रहीत' : 'सत्यापित',
        syncedLabel: 'अपडेट हुआ',
        applyFilters: 'फ़िल्टर लागू करें',
        tableTitle: isUsingCache ? 'ऑफ़लाइन सहेजे गए भाव' : 'सत्यापित एपीएमसी बाज़ार रिकॉर्ड',
        colCommodity: 'फ़सल एवं किस्म',
        colMandi: 'एपीएमसी मंडी',
        colLocation: 'जिला व राज्य',
        filtersToggle: 'राज्य, जिला व मंडी चुनें',
        recordsUnit: 'रिकॉर्ड',
      };
    }
    if (language === 'pa') {
      return {
        refreshBtn: adminKey ? t('dataSyncButton') : 'ਭਾਅ ਰੀਫ੍ਰੈਸ਼ ਕਰੋ',
        refreshing: adminKey ? t('dataSyncInProgress') : 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
        avgBadge: 'ਔਸਤ',
        floorBadge: 'ਘੱਟੋ-ਘੱਟ',
        peakBadge: 'ਵੱਧ ਤੋਂ ਵੱਧ',
        verifiedBadge: isUsingCache ? 'ਸੁਰੱਖਿਅਤ' : 'ਪ੍ਰਮਾਣਿਤ',
        syncedLabel: 'ਅੱਪਡੇਟ ਹੋਇਆ',
        applyFilters: 'ਫ਼ਿਲਟਰ ਲਾਗੂ ਕਰੋ',
        tableTitle: isUsingCache ? 'ਆਫਲਾਈਨ ਸੁਰੱਖਿਅਤ ਭਾਅ' : 'ਪ੍ਰਮਾਣਿਤ ਏ.ਪੀ.ਐਮ.ਸੀ. ਮੰਡੀ ਰਿਕਾਰਡ',
        colCommodity: 'ਫ਼ਸਲ ਅਤੇ ਕਿਸਮ',
        colMandi: 'ਮੰਡੀ',
        colLocation: 'ਜ਼ਿਲ੍ਹਾ ਅਤੇ ਰਾਜ',
        filtersToggle: 'ਰਾਜ, ਜ਼ਿਲ੍ਹਾ ਤੇ ਮੰਡੀ ਚੁਣੋ',
        recordsUnit: 'ਰਿਕਾਰਡ',
      };
    }
    return {
      refreshBtn: adminKey ? t('dataSyncButton') : 'Refresh Rates',
      refreshing: adminKey ? t('dataSyncInProgress') : 'Refreshing...',
      avgBadge: 'Avg Rate',
      floorBadge: 'Floor',
      peakBadge: 'Peak',
      verifiedBadge: isUsingCache ? 'Cached' : 'Reported',
      syncedLabel: 'Updated',
      applyFilters: 'Apply Filters',
      tableTitle: isUsingCache ? 'Cached market filings' : 'Market filings',
      colCommodity: 'Commodity & Variety',
      colMandi: 'APMC Mandi',
      colLocation: 'District & State',
      filtersToggle: 'Filter by State, District & Mandi',
      recordsUnit: 'records',
    };
  }, [language, adminKey, isUsingCache, t]);

  return (
    <div className="space-y-6">
      {!isOnline && (
        <Banner
          status="warning"
          collapsible={false}
          title={t('offlineBannerTitle')}
          description={
            <>
              {t('offlineBannerText')}{' '}
              {lastSyncedAt && (
                <span className="font-mono font-semibold text-ink">
                  ({t('lastSyncedLabel')}: {new Date(lastSyncedAt).toLocaleString()})
                </span>
              )}
            </>
          }
          endContent={isCacheStale ? <Badge variant="warning" label={t('staleWarning')} /> : undefined}
        />
      )}

      {/* Clean Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t('priceTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
            {t('priceSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isOnline && (
            <MorphingActionButton
              state={isSyncing ? 'loading' : syncJustSucceeded ? 'success' : 'idle'}
              idleLabel={labels.refreshBtn}
              loadingLabel={labels.refreshing}
              successLabel={labels.syncedLabel}
              icon={<ArrowsClockwise weight="bold" className="w-4 h-4 shrink-0" />}
              onClick={handleRefreshPrices}
              className="whitespace-nowrap shrink-0"
            />
          )}

          <div
            title={
              syncStatus?.latestRun
                ? `Agmarknet Sync: ${syncStatus.latestRun.status}`
                : t('marketDataDate')
            }
            className="min-h-[44px] inline-flex items-center space-x-1.5 text-xs font-medium bg-surface border border-line px-3.5 py-2 rounded-full text-ink-muted"
          >
            {isUsingCache ? (
              <Database weight="duotone" className="w-4 h-4 text-saffron" />
            ) : (
              <Clock weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
            )}
            <span>{isUsingCache ? labels.verifiedBadge : t('marketDataDate')}{reportingDate ? ` · ${reportingDate}` : ''}</span>
          </div>
        </div>
      </section>

      {activeRecords.some((row) => row.provenanceType === 'SEEDED_BASELINE') && (
        <p className="text-sm text-ink-muted border-l-2 border-saffron pl-3">{t('baselinePriceNotice')}</p>
      )}

      {syncSummary && (
        <Banner
          status={syncSummary.status === 'CONNECTED' ? 'success' : 'warning'}
          collapsible={false}
          title={t('dataSyncSuccess')}
          description={syncSummary.message}
          isDismissable
          dismissLabel={t('dismiss')}
          onDismiss={() => setSyncSummary(null)}
        />
      )}

      {syncError && (
        <Banner
          status="error"
          role="alert"
          collapsible={false}
          title={syncError}
          isDismissable
          dismissLabel={t('dismiss')}
          onDismiss={() => setSyncError(null)}
        />
      )}

      {/* Adaptive Filter Bar (Compact on Mobile so rates show immediately!) */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-subtle space-y-3">
        {/* Search input + Reset / Drawer actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'फसल, मंडी, किस्म या राज्य खोजें (जैसे मिर्च, जीरा, गुंटूर, हल्दी, गेहूं...)'
                  : language === 'pa'
                  ? 'ਫ਼ਸਲ, ਮੰਡੀ, ਕਿਸਮ ਜਾਂ ਰਾਜ ਖੋਜੋ (ਜਿਵੇਂ ਮਿਰਚ, ਜ਼ੀਰਾ, ਗੁੰਟੂਰ...)'
                  : 'Search crop, mandi, variety or state (e.g. Chilli, Cumin, Guntur, Kolar...)'
              }
              className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl bg-surface-subtle border border-line text-xs sm:text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-canopy-bright transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 rounded-full cursor-pointer"
                aria-label="Clear search"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
            {(selectedCommodity || selectedState || selectedDistrict || selectedMandi || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-canopy dark:text-canopy-bright hover:underline flex items-center space-x-1 font-semibold text-xs cursor-pointer"
              >
                <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5" />
                <span>{t('filterReset')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden min-h-[44px] inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-surface-subtle border border-line text-xs font-semibold text-ink cursor-pointer"
            >
              <span>{labels.filtersToggle}</span>
              <CaretDown weight="bold" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Farmer Watchlist & Opt-In Price Alerts */}
        <WatchlistBar
          priceRecords={priceRecords}
          onSelectCommodity={(c) => setSelectedCommodity(c)}
          onSelectMandi={(m) => setSelectedMandi(m)}
        />

        {/* 1-Tap Commodity Horizontal Pills (All available crops with smooth scroll) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 select-none scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setSelectedCommodity('');
              setSearchQuery('');
            }}
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              !selectedCommodity
                ? 'bg-canopy text-white shadow-subtle'
                : 'bg-surface-subtle text-ink-muted hover:text-ink border border-line'
            }`}
          >
            {t('allCommodities')}
          </button>
          {commodities.map((c) => {
            const isSelected = selectedCommodity === c.code;
            const localizedName = getCommodityName(
              c.code,
              (language === 'hi' ? c.nameHi : language === 'pa' ? c.namePa : c.nameEn) || c.nameEn
            );
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setSelectedCommodity(isSelected ? '' : c.code);
                  setSearchQuery('');
                }}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-canopy text-white shadow-subtle'
                    : 'bg-surface-subtle text-ink hover:bg-canopy-soft border border-line'
                }`}
              >
                {localizedName}
              </button>
            );
          })}
        </div>

        {/* Desktop Inline Selectors & Mobile Cult UI FamilyDrawer sharing one helper */}
        {(() => {
          const selectClass =
            'w-full min-h-[44px] bg-surface-subtle border border-line rounded-xl px-3.5 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-canopy-bright disabled:opacity-50';

          const locationControls = (prefix: string) => (
            <>
              <div>
                <label htmlFor={`${prefix}-commodity`} className="block text-[11px] font-semibold text-ink-muted mb-1">
                  {t('selectCommodity')}
                </label>
                <select
                  id={`${prefix}-commodity`}
                  value={selectedCommodity}
                  onChange={(e) => setSelectedCommodity(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t('allCommodities')}</option>
                  {commodities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {getCommodityName(c.code, (language === "hi" ? c.nameHi : language === "pa" ? c.namePa : c.nameEn) || c.nameEn)} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${prefix}-state`} className="block text-[11px] font-semibold text-ink-muted mb-1">
                  {t('selectState')}
                </label>
                <select
                  id={`${prefix}-state`}
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict('');
                    setSelectedMandi('');
                  }}
                  className={selectClass}
                >
                  <option value="">{t('allStates')}</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${prefix}-district`} className="block text-[11px] font-semibold text-ink-muted mb-1">
                  {t('selectDistrict')}
                </label>
                <select
                  id={`${prefix}-district`}
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedMandi('');
                  }}
                  disabled={districts.length === 0}
                  className={selectClass}
                >
                  <option value="">{t('allDistricts')}</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${prefix}-mandi`} className="block text-[11px] font-semibold text-ink-muted mb-1">
                  {t('selectMandi')}
                </label>
                <select
                  id={`${prefix}-mandi`}
                  value={selectedMandi}
                  onChange={(e) => setSelectedMandi(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t('allMandis')}</option>
                  {filteredMandis.map((m) => (
                    <option key={m.code} value={m.code}>
                      {getMandiName(m.code, m.nameHi || m.nameEn)} ({m.district})
                    </option>
                  ))}
                </select>
              </div>
            </>
          );

          return (
            <>
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {locationControls('price-filter')}
              </div>
              <BottomSheet
                isOpen={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
                label={labels.filtersToggle}
                height="capped"
                purpose="info"
              >
                <div className="space-y-4 pb-2">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h3 className="font-display font-bold text-base text-ink">{labels.filtersToggle}</h3>
                    <Button
                      label={t('filterReset')}
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                    />
                  </div>
                  <div className="space-y-3">{locationControls('mobile-price-filter')}</div>
                  <Button
                    label={labels.applyFilters}
                    variant="primary"
                    size="lg"
                    width="100%"
                    onClick={() => setMobileFiltersOpen(false)}
                  />
                </div>
              </BottomSheet>
            </>
          );
        })()}
      </section>

      {loadingPrices && isOnline && !isUsingCache && <LoadingSpinner message={t('loading')} />}

      {errorPrices && !isUsingCache && (
        <ErrorMessage
          message={priceError instanceof Error ? priceError.message : t('error')}
          onRetry={() => refetchPrices()}
        />
      )}

      {/* Animated Summary KPI Bento Grid */}
      {summary && displayedRecords.length > 0 && (
        <GsapStaggerGrid
          depKey={`${displayedRecords.length}-${selectedCommodity}-${selectedMandi}`}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          <MetricTile
            className="gs-stagger-item"
            label={t('modalPrice')}
            value={summary.avgModal}
            numericValue={summary.avgModal}
            prefix="₹"
            unit={t('perQuintal')}
            variant="emerald"
            badge={labels.avgBadge}
            icon={<Scales weight="duotone" className="w-4 h-4" />}
          />
          <MetricTile
            className="gs-stagger-item"
            label={t('minPrice')}
            value={summary.minOverall}
            numericValue={summary.minOverall}
            prefix="₹"
            unit={t('perQuintal')}
            badge={labels.floorBadge}
            icon={<TrendUp weight="duotone" className="w-4 h-4" />}
          />
          <MetricTile
            className="gs-stagger-item"
            label={t('maxPrice')}
            value={summary.maxOverall}
            numericValue={summary.maxOverall}
            prefix="₹"
            unit={t('perQuintal')}
            variant="saffron"
            badge={labels.peakBadge}
            icon={<Grains weight="duotone" className="w-4 h-4" />}
          />
          <MetricTile
            className="gs-stagger-item"
            label={t('reportedArrivals')}
            value={summary.totalArrivals ?? '—'}
            numericValue={summary.totalArrivals}
            unit={summary.totalArrivals === undefined ? undefined : 'Qtl'}
            subtext={summary.totalArrivals === undefined ? t('arrivalsUnavailable') : undefined}
            icon={<ShieldCheck weight="duotone" className="w-4 h-4" />}
          />
        </GsapStaggerGrid>
      )}

      {/* Market Filings Table & Mobile Card Stream */}
      {displayedRecords.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="font-display text-sm sm:text-base font-bold text-ink flex items-center space-x-2">
              <span>{labels.tableTitle}</span>
              <span className="text-xs font-mono font-normal text-ink-muted">
                ({displayedRecords.length} {labels.recordsUnit})
              </span>
            </h2>
            <div className="text-xs text-ink-muted flex items-center space-x-2 font-mono">
              <Calendar weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
              <span>
                {isUsingCache
                  ? `IndexedDB · ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : 'Local'}`
                  : 'Agmarknet / State APMC'}
              </span>
            </div>
          </div>

          {/* Desktop Sortable Astryx Ledger Table */}
          <div className="hidden xl:block">
            <SortablePriceTable
              rows={displayedRecords as PriceTableRow[]}
              labels={labels}
              t={t}
              getCommodityName={getCommodityName}
              getMandiName={getMandiName}
            />
          </div>

          {/* Mobile Responsive Stacked Cards */}
          <div className="xl:hidden divide-y divide-line">
            <AnimatePresence initial={false}>
              {displayedRecords.map((r) => {
                const commName = getCommodityName(r.commodityCode, r.commodityNameEn);
                const mandiName = getMandiName(r.mandiCode, r.mandiNameEn);

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-ink flex items-center flex-wrap gap-1.5">
                          <Grains weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
                          <span>{commName}</span>
                          {r.variety && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle border border-line text-ink-muted">
                              {r.variety}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-muted flex items-center space-x-1 mt-0.5 truncate">
                          <MapPin weight="duotone" className="w-3.5 h-3.5 text-saffron shrink-0" />
                          <span className="truncate">
                            {mandiName} ({r.district})
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-canopy dark:text-canopy-bright tnum font-mono">
                          ₹{r.modalPrice.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-ink-muted font-mono">{r.priceDate}</div>
                      </div>
                    </div>

                    <PriceSpreadBar
                      minPrice={r.minPrice}
                      modalPrice={r.modalPrice}
                      maxPrice={r.maxPrice}
                      unit={r.unit || '₹/Qtl'}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      {isOnline && !isUsingCache && (page > 0 || priceRecords.length === pageSize) && (
        <nav aria-label={t('pricePagination')} className="flex flex-wrap items-center justify-between gap-3">
          <Button
            label={t('previousPricePage')}
            variant="secondary"
            isDisabled={page === 0 || loadingPrices}
            onClick={() => setPageSelection({ filters: filterKey, page: Math.max(0, page - 1) })}
          />
          <p className="text-sm text-ink-muted">{t('pricePage')} {page + 1}</p>
          <Button
            label={t('nextPricePage')}
            variant="secondary"
            isDisabled={priceRecords.length < pageSize || loadingPrices}
            onClick={() => setPageSelection({ filters: filterKey, page: page + 1 })}
          />
        </nav>
      )}

      {/* Astryx Empty State */}
      {displayedRecords.length === 0 && !loadingPrices && (
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-subtle">
          <EmptyState
            icon={<LottieBadge variant="empty" className="w-16 h-16" />}
            title={!isOnline ? t('offlineNoDataMsg') : t('noPriceData')}
            description={!isOnline ? t('offlineBannerText') : t('noPriceNotice')}
            actions={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button label={t('filterReset')} variant="primary" onClick={handleResetFilters} />
                <Button
                  label={getCommodityName('WHEAT', 'Wheat')}
                  variant="secondary"
                  onClick={() => setSelectedCommodity('WHEAT')}
                />
              </div>
            }
          />
        </section>
      )}

      {/* CACP MSP Notice */}
      <Banner status="info" collapsible={false} title={t('mspReferenceNotice')} />
    </div>
  );
};

interface SortablePriceTableProps {
  rows: PriceTableRow[];
  labels: {
    colCommodity: string;
    colMandi: string;
    colLocation: string;
  };
  t: (key: string) => string;
  getCommodityName: (code: string, fallback: string) => string;
  getMandiName: (code: string, fallback: string) => string;
}

const SortablePriceTable: React.FC<SortablePriceTableProps> = ({
  rows,
  labels,
  t,
  getCommodityName,
  getMandiName,
}) => {
  const { sortedData, sortConfig } = useTableSortableState<PriceTableRow>({
    data: rows,
    comparators: {
      minPrice: (a, b) => a.minPrice - b.minPrice,
      modalPrice: (a, b) => a.modalPrice - b.modalPrice,
      maxPrice: (a, b) => a.maxPrice - b.maxPrice,
      arrivalQuantity: (a, b) => (a.arrivalQuantity || 0) - (b.arrivalQuantity || 0),
      commodity: (a, b) =>
        getCommodityName(a.commodityCode, a.commodityNameEn).localeCompare(
          getCommodityName(b.commodityCode, b.commodityNameEn)
        ),
      mandi: (a, b) =>
        getMandiName(a.mandiCode, a.mandiNameEn).localeCompare(
          getMandiName(b.mandiCode, b.mandiNameEn)
        ),
    },
  });

  const sortPlugin = useTableSortable<PriceTableRow>(sortConfig);

  const columns: TableColumn<PriceTableRow>[] = useMemo(
    () => [
      {
        key: 'commodity',
        header: labels.colCommodity,
        width: proportional(1.6, { minWidth: 160 }),
        sortable: true,
        renderCell: (r) => (
          <div className="flex items-center gap-2 flex-wrap">
            <Grains weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
            <span className="font-semibold text-ink">
              {getCommodityName(r.commodityCode, r.commodityNameEn)}
            </span>
            {r.variety && <Badge label={r.variety} variant="neutral" />}
          </div>
        ),
      },
      {
        key: 'mandi',
        header: labels.colMandi,
        width: proportional(1.3, { minWidth: 140 }),
        sortable: true,
        renderCell: (r) => (
          <div className="flex items-center gap-1.5">
            <MapPin weight="duotone" className="w-3.5 h-3.5 text-saffron-text shrink-0" />
            <span className="font-medium text-ink">
              {getMandiName(r.mandiCode, r.mandiNameEn)}
            </span>
          </div>
        ),
      },
      {
        key: 'location',
        header: labels.colLocation,
        width: proportional(1.1, { minWidth: 120 }),
        renderCell: (r) => (
          <span className="text-ink-muted">
            {r.district}, {r.state}
          </span>
        ),
      },
      {
        key: 'minPrice',
        header: t('minPrice'),
        align: 'end',
        width: proportional(0.8, { minWidth: 90 }),
        sortable: true,
        renderCell: (r) => (
          <span className="font-mono tnum text-ink-muted">
            ₹{r.minPrice.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'modalPrice',
        header: t('modalPrice'),
        align: 'end',
        width: proportional(0.9, { minWidth: 100 }),
        sortable: true,
        renderCell: (r) => (
          <span className="font-mono tnum font-bold text-canopy dark:text-canopy-bright text-sm">
            ₹{r.modalPrice.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'maxPrice',
        header: t('maxPrice'),
        align: 'end',
        width: proportional(0.8, { minWidth: 90 }),
        sortable: true,
        renderCell: (r) => (
          <span className="font-mono tnum text-ink-muted">
            ₹{r.maxPrice.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'arrivalQuantity',
        header: t('arrivalsShort'),
        align: 'end',
        width: proportional(0.85, { minWidth: 90 }),
        sortable: true,
        renderCell: (r) => (
          <span className="font-mono tnum text-ink">
            {r.arrivalQuantity ? `${r.arrivalQuantity} Qtl` : '-'}
          </span>
        ),
      },
      {
        key: 'priceDate',
        header: t('reportingDateLabel'),
        align: 'center',
        width: proportional(0.9, { minWidth: 100 }),
        sortable: true,
        renderCell: (r) => (
          <span className="font-mono tnum text-xs text-ink-muted">{r.priceDate}</span>
        ),
      },
    ],
    [labels, t, getCommodityName, getMandiName]
  );

  return (
    <Table<PriceTableRow>
      data={sortedData}
      columns={columns}
      idKey="id"
      density="balanced"
      dividers="rows"
      hasHover
      plugins={{ sort: sortPlugin }}
    />
  );
};
