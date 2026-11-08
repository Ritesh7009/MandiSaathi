import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { api } from '../services/apiClient';
import {
  savePriceRecords,
  getCachedPrices,
  saveCommodities,
  saveMandis,
} from '../services/offlineStorage';
import { MetricTile } from '../components/ui/MetricTile';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  TrendingUp,
  MapPin,
  Calendar,
  ShieldCheck,
  RotateCcw,
  Scale,
  Wheat,
  Clock,
  Info,
  RefreshCw,
  CheckCircle,
  WifiOff,
  Database,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { IngestionSummary, PriceRecord } from '../types';

export const PriceIntelligence: React.FC = () => {
  const { language, t } = useLanguage();
  const { isOnline } = useNetwork();

  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedMandi, setSelectedMandi] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<IngestionSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Offline caching states
  const [offlinePrices, setOfflinePrices] = useState<PriceRecord[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isCacheStale, setIsCacheStale] = useState<boolean>(false);
  const [isUsingCache, setIsUsingCache] = useState<boolean>(false);

  // Fetch commodities list
  const { data: commodities = [] } = useQuery({
    queryKey: ['commoditiesList'],
    queryFn: () => api.getCommodities(),
    staleTime: 120000,
  });

  // Fetch all mandis for filter cascading
  const { data: mandis = [] } = useQuery({
    queryKey: ['mandisList', selectedState],
    queryFn: () => api.getMandis(selectedState || undefined),
    staleTime: 120000,
  });

  // Fetch prices based on selection
  const {
    data: priceRecords = [],
    isLoading: loadingPrices,
    isError: errorPrices,
    error: priceError,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: ['priceRecords', selectedCommodity, selectedMandi],
    queryFn: () => api.getPrices(selectedCommodity || undefined, selectedMandi || undefined),
    staleTime: 60000,
    enabled: isOnline,
  });

  // Fetch scheduled cron sync status telemetry
  const { data: syncStatus } = useQuery({
    queryKey: ['syncScheduleStatus'],
    queryFn: () => api.getSyncStatus(),
    staleTime: 60000,
    enabled: isOnline,
  });

  // Persist live commodities into IndexedDB
  useEffect(() => {
    if (commodities.length > 0) {
      saveCommodities(commodities).catch(console.warn);
    }
  }, [commodities]);

  // Persist live mandis into IndexedDB
  useEffect(() => {
    if (mandis.length > 0) {
      saveMandis(mandis).catch(console.warn);
    }
  }, [mandis]);

  // Persist retrieved live prices into IndexedDB
  useEffect(() => {
    if (priceRecords.length > 0 && isOnline) {
      savePriceRecords(priceRecords).catch(console.warn);
      setIsUsingCache(false);
    }
  }, [priceRecords, isOnline]);

  // If offline or fetch failed, retrieve records from IndexedDB
  useEffect(() => {
    if (!isOnline || errorPrices) {
      getCachedPrices(selectedCommodity || undefined, selectedMandi || undefined)
        .then((result) => {
          setOfflinePrices(result.records);
          setLastSyncedAt(result.lastSyncedAt);
          setIsCacheStale(result.isStale);
          setIsUsingCache(true);
        })
        .catch((err) => {
          console.warn('[MandiSaathi Offline] Could not read IndexedDB:', err);
        });
    } else {
      setIsUsingCache(false);
    }
  }, [isOnline, errorPrices, selectedCommodity, selectedMandi]);

  // Active records: Live API when online, IndexedDB cache when offline
  const activeRecords = isUsingCache || !isOnline ? offlinePrices : priceRecords;

  // Unique states from mandis
  const states = useMemo(() => {
    const s = new Set<string>();
    mandis.forEach((m) => {
      if (m.state) s.add(m.state);
    });
    return Array.from(s).sort();
  }, [mandis]);

  // Unique districts for selected state
  const districts = useMemo(() => {
    const d = new Set<string>();
    mandis.forEach((m) => {
      if (!selectedState || m.state === selectedState) {
        if (m.district) d.add(m.district);
      }
    });
    return Array.from(d).sort();
  }, [mandis, selectedState]);

  // Filtered mandis based on state & district
  const filteredMandis = useMemo(() => {
    return mandis.filter((m) => {
      if (selectedState && m.state !== selectedState) return false;
      if (selectedDistrict && m.district !== selectedDistrict) return false;
      return true;
    });
  }, [mandis, selectedState, selectedDistrict]);

  const handleResetFilters = () => {
    setSelectedCommodity('');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedMandi('');
  };

  const getCommodityName = (c: { nameEn: string; nameHi: string; namePa: string | null }) => {
    if (language === 'hi' && c.nameHi) return c.nameHi;
    if (language === 'pa' && c.namePa) return c.namePa;
    return c.nameEn;
  };

  const getMandiName = (m: { nameEn: string; nameHi: string; namePa: string | null }) => {
    if (language === 'hi' && m.nameHi) return m.nameHi;
    if (language === 'pa' && m.namePa) return m.namePa;
    return m.nameEn;
  };

  // Filter records by district if selected
  const displayedRecords = useMemo(() => {
    if (!selectedDistrict) return activeRecords;
    return activeRecords.filter((r) => r.district.toLowerCase() === selectedDistrict.toLowerCase());
  }, [activeRecords, selectedDistrict]);

  // Summary figures across displayed records
  const summary = useMemo(() => {
    if (displayedRecords.length === 0) return null;
    const modalPrices = displayedRecords.map((r) => r.modalPrice);
    const avgModal = Math.round(modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length);
    const minOverall = Math.min(...displayedRecords.map((r) => r.minPrice));
    const maxOverall = Math.max(...displayedRecords.map((r) => r.maxPrice));
    const totalArrivals = displayedRecords.reduce((acc, r) => acc + (r.arrivalQuantity || 0), 0);
    return { avgModal, minOverall, maxOverall, totalArrivals };
  }, [displayedRecords]);

  // Handle manual Agmarknet data synchronization
  const handleSyncAgmarknet = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSummary(null);

    try {
      const summary = await api.syncMandiPrices();
      setSyncSummary(summary);
      await refetchPrices();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Agmarknet synchronization failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Offline Status Alert Banner */}
      {!isOnline && (
        <div
          data-testid="offline-alert-banner"
          className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-200/80 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-800" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-amber-950">
                {t('offlineBannerText')}
              </p>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                {t('offlineVoiceNotice')}
              </p>
            </div>
          </div>
          {lastSyncedAt && (
            <div className="text-[11px] text-amber-800 font-mono self-start sm:self-auto bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-200">
              {t('lastSyncedLabel')}: {new Date(lastSyncedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Screen Header & Action Toolbar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-harvest-dark" />
            <span>Market Price Telemetry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {t('priceTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5 max-w-2xl">
            {t('priceSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Live vs Offline Cache Telemetry Badges */}
          {isUsingCache || !isOnline ? (
            <div className="flex flex-wrap items-center gap-2">
              <div
                data-testid="offline-cached-badge"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold shadow-subtle"
              >
                <Database className="w-3.5 h-3.5 text-amber-800" />
                <span>{t('offlineCachedBadge')}</span>
                {lastSyncedAt && (
                  <span className="text-[11px] font-normal text-amber-800 hidden md:inline font-mono">
                    • {t('lastSyncedLabel')}: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {isCacheStale && (
                <div
                  data-testid="stale-data-badge"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-900 border border-red-300 text-xs font-bold"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-700" />
                  <span>{t('staleDataWarning')}</span>
                </div>
              )}
            </div>
          ) : (
            <div
              data-testid="live-feed-badge"
              className="flex items-center space-x-1.5 text-xs font-semibold bg-forest-50 border border-forest/20 px-3 py-1.5 rounded-lg text-forest shadow-subtle"
            >
              <ShieldCheck className="w-4 h-4 text-forest" />
              <span>{t('liveFeedBadge')}</span>
            </div>
          )}

          {/* Sync Trigger Button */}
          {isOnline && (
            <button
              type="button"
              onClick={handleSyncAgmarknet}
              disabled={isSyncing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest hover:bg-forest-light text-white text-xs font-semibold shadow-subtle transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t('dataSyncInProgress') : t('dataSyncButton')}</span>
            </button>
          )}

          {/* Nightly Scheduled Cron Telemetry */}
          {syncStatus && (
            <div
              title={`Nightly Ingestion Cron: ${syncStatus.cron} (${syncStatus.zone})`}
              className="hidden lg:flex items-center space-x-1.5 text-[11px] font-mono bg-surface border border-hairline px-2.5 py-1.5 rounded-lg text-charcoal-muted"
            >
              <Clock className="w-3.5 h-3.5 text-forest" />
              <span>Cron: {syncStatus.cron} ({syncStatus.zone})</span>
            </div>
          )}
        </div>
      </section>

      {/* Sync Result Feedback */}
      {syncSummary && (
        <div className="p-3 bg-forest-50 border border-forest/25 rounded-xl text-xs text-forest-dark flex items-center justify-between shadow-subtle">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-forest shrink-0" />
            <span>
              <strong>{t('dataSyncSuccess')}:</strong> {syncSummary.message} (Fetched: {syncSummary.totalFetched}, Inserted: {syncSummary.insertedCount}, Updated: {syncSummary.updatedCount})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSyncSummary(null)}
            className="text-forest hover:text-forest-dark text-[11px] underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {syncError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between shadow-subtle">
          <span>{syncError}</span>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="text-red-700 hover:text-red-900 text-[11px] underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* High-Density Filter Toolbar (Linear/Watermelon UI inspired) */}
      <section className="rounded-xl border border-hairline bg-surface-white p-4 shadow-subtle space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 font-semibold text-charcoal">
            <Filter className="w-3.5 h-3.5 text-forest" />
            <span className="uppercase tracking-wider text-[11px] text-charcoal-muted">Filter Telemetry</span>
          </div>
          {(selectedCommodity || selectedState || selectedDistrict || selectedMandi) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-forest hover:text-forest-dark flex items-center space-x-1 font-semibold text-xs cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('filterReset')}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Commodity Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider mb-1">
              {t('selectCommodity')}
            </label>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
            >
              <option value="">{t('allCommodities')}</option>
              {commodities.map((c) => (
                <option key={c.code} value={c.code}>
                  {getCommodityName(c)} ({c.category})
                </option>
              ))}
            </select>
          </div>

          {/* State Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider mb-1">
              {t('selectState')}
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
                setSelectedMandi('');
              }}
              className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
            >
              <option value="">{t('allStates')}</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider mb-1">
              {t('selectDistrict')}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedMandi('');
              }}
              disabled={districts.length === 0}
              className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest disabled:opacity-50"
            >
              <option value="">{t('allDistricts')}</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Mandi Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-charcoal-subtle uppercase tracking-wider mb-1">
              {t('selectMandi')}
            </label>
            <select
              value={selectedMandi}
              onChange={(e) => setSelectedMandi(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
            >
              <option value="">{t('allMandis')}</option>
              {filteredMandis.map((m) => (
                <option key={m.code} value={m.code}>
                  {getMandiName(m)} ({m.district}, {m.state})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Loading & Error States */}
      {loadingPrices && isOnline && !isUsingCache && (
        <div className="rounded-xl border border-hairline bg-surface-white p-12 flex justify-center shadow-subtle">
          <LoadingSpinner />
        </div>
      )}

      {errorPrices && !isUsingCache && (
        <ErrorMessage
          message={priceError instanceof Error ? priceError.message : t('error')}
          onRetry={() => refetchPrices()}
        />
      )}

      {/* Aggregate Metric Tiles */}
      {summary && displayedRecords.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricTile
            label={t('modalPrice')}
            value={`₹${summary.avgModal.toLocaleString('en-IN')}`}
            unit={t('perQuintal')}
            variant="forest"
            badge="Avg Rate"
            icon={<Scale className="w-4 h-4 text-forest" />}
          />
          <MetricTile
            label={t('minPrice')}
            value={`₹${summary.minOverall.toLocaleString('en-IN')}`}
            unit={t('perQuintal')}
            badge="Floor"
            icon={<TrendingUp className="w-4 h-4 text-charcoal-muted" />}
          />
          <MetricTile
            label={t('maxPrice')}
            value={`₹${summary.maxOverall.toLocaleString('en-IN')}`}
            unit={t('perQuintal')}
            variant="harvest"
            badge="Peak"
            icon={<Wheat className="w-4 h-4 text-harvest-dark" />}
          />
          <MetricTile
            label={t('arrivals')}
            value={summary.totalArrivals.toLocaleString('en-IN')}
            unit="Quintals"
            badge={isUsingCache ? 'Cached' : 'Verified'}
            icon={<Clock className="w-4 h-4 text-mutedGreen-dark" />}
          />
        </div>
      )}

      {/* Price Records Table / List */}
      {displayedRecords.length > 0 && (
        <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
          <div className="px-5 py-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
              <span>{isUsingCache ? 'Cached Local Market Filings' : 'Verified APMC Market Filings'}</span>
              <span className="text-xs font-normal text-charcoal-muted font-mono">
                ({displayedRecords.length} records)
              </span>
            </h2>
            <div className="text-xs text-charcoal-muted flex items-center space-x-2 font-mono">
              <Calendar className="w-3.5 h-3.5 text-forest" />
              <span>
                {isUsingCache
                  ? `Offline Structured Cache • ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : 'Local'}`
                  : 'Agmarknet Verified Telemetry'}
              </span>
            </div>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface border-b border-hairline text-charcoal-subtle uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Commodity / फसल</th>
                  <th className="py-3 px-4">APMC Mandi / मंडी</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">{t('minPrice')}</th>
                  <th className="py-3 px-4 text-right font-bold text-forest">{t('modalPrice')}</th>
                  <th className="py-3 px-4 text-right">{t('maxPrice')}</th>
                  <th className="py-3 px-4 text-right">{t('arrivals')}</th>
                  <th className="py-3 px-4 text-center">{t('reportingDateLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-charcoal">
                {displayedRecords.map((r) => {
                  const commName =
                    language === 'hi'
                      ? r.commodityNameHi
                      : language === 'pa' && r.commodityNamePa
                      ? r.commodityNamePa
                      : r.commodityNameEn;
                  const mandiName =
                    language === 'hi'
                      ? r.mandiNameHi
                      : language === 'pa' && r.mandiNamePa
                      ? r.mandiNamePa
                      : r.mandiNameEn;

                  return (
                    <tr key={r.id} className="hover:bg-forest-50/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-charcoal">
                        <div className="flex items-center space-x-2">
                          <Wheat className="w-3.5 h-3.5 text-forest shrink-0" />
                          <span>{commName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-charcoal">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-harvest-dark shrink-0" />
                          <span>{mandiName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-charcoal-muted">
                        {r.district}, {r.state}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-charcoal-muted tnum">
                        ₹{r.minPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-forest text-sm bg-forest-50/40 tnum">
                        ₹{r.modalPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-charcoal-muted tnum">
                        ₹{r.maxPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tnum">
                        {r.arrivalQuantity ? `${r.arrivalQuantity} qtl` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="text-charcoal font-medium">{r.priceDate}</span>
                        {isUsingCache && (
                          <div className="text-[10px] text-amber-700">Cached</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Compact Rows (< 768px) - Eliminates horizontal table scrolling */}
          <div className="md:hidden divide-y divide-hairline">
            {displayedRecords.map((r) => {
              const commName =
                language === 'hi'
                  ? r.commodityNameHi
                  : language === 'pa' && r.commodityNamePa
                  ? r.commodityNamePa
                  : r.commodityNameEn;
              const mandiName =
                language === 'hi'
                  ? r.mandiNameHi
                  : language === 'pa' && r.mandiNamePa
                  ? r.mandiNamePa
                  : r.mandiNameEn;

              return (
                <div key={r.id} className="p-4 space-y-2 hover:bg-forest-50/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-charcoal flex items-center space-x-1.5">
                        <Wheat className="w-3.5 h-3.5 text-forest shrink-0" />
                        <span>{commName}</span>
                      </div>
                      <div className="text-xs text-charcoal-muted flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-harvest-dark shrink-0" />
                        <span>{mandiName} ({r.district})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-forest tnum font-mono">
                        ₹{r.modalPrice.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-charcoal-muted">Modal / Quintal</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-muted pt-1 border-t border-hairline/60">
                    <span>Range: ₹{r.minPrice} – ₹{r.maxPrice}</span>
                    <span>Date: {r.priceDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {displayedRecords.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface-white p-8 text-center max-w-xl mx-auto shadow-subtle">
          <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 text-charcoal-muted border border-hairline">
            <Clock className="w-5 h-5 text-forest" />
          </div>
          <h3 className="font-bold text-charcoal text-base mb-1">
            {!isOnline ? t('offlineNoDataMsg') : t('noPriceData')}
          </h3>
          <p className="text-xs text-charcoal-muted leading-relaxed mb-4">
            {!isOnline
              ? t('offlineBannerText')
              : t('noPriceNotice')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded-lg transition-all shadow-subtle cursor-pointer"
            >
              {t('filterReset')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCommodity('WHEAT')}
              className="px-4 py-2 bg-surface hover:bg-forest-50 border border-hairline text-charcoal text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              View Wheat (गेहूं) Rates
            </button>
          </div>
        </div>
      )}

      {/* CACP & MSP Reference Notice */}
      <footer className="rounded-xl border border-hairline bg-surface p-4 flex items-start space-x-3 text-xs text-charcoal">
        <Info className="w-4 h-4 text-harvest-dark shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-charcoal">
            Commission for Agricultural Costs and Prices (CACP) Reference
          </div>
          <p className="text-charcoal-muted leading-relaxed">
            {t('mspReferenceNotice')} The Minimum Support Price (MSP) acts as a price floor for agricultural commodities. Market modal prices fluctuate based on daily quality, moisture percentage, and arrival volume in each APMC yard.
          </p>
        </div>
      </footer>
    </div>
  );
};
