import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
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
} from 'lucide-react';

export const PriceIntelligence: React.FC = () => {
  const { language, t } = useLanguage();

  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedMandi, setSelectedMandi] = useState<string>('');

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
  });

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
    if (!selectedDistrict) return priceRecords;
    return priceRecords.filter((r) => r.district.toLowerCase() === selectedDistrict.toLowerCase());
  }, [priceRecords, selectedDistrict]);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Page Header */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4 text-harvest-dark" />
              <span>{t('priceTitle')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
              {t('priceTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1 max-w-2xl">
              {t('priceSubtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-ivory border border-ivory-dark px-3 py-1.5 rounded text-charcoal-muted self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-forest" />
            <span>Agmarknet Direct Feed</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Watermelon UI pattern) */}
      <div className="bg-white border border-ivory-dark rounded-md p-4 sm:p-5 shadow-subtle">
        <div className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Search & Filter Mandi Rates</span>
          {(selectedCommodity || selectedState || selectedDistrict || selectedMandi) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-forest hover:text-forest-dark flex items-center space-x-1 font-semibold normal-case"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('filterReset')}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Commodity Selector */}
          <div>
            <label className="block text-[11px] font-medium text-charcoal-muted mb-1">
              {t('selectCommodity')}
            </label>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
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
            <label className="block text-[11px] font-medium text-charcoal-muted mb-1">
              {t('selectState')}
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
                setSelectedMandi('');
              }}
              className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
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
            <label className="block text-[11px] font-medium text-charcoal-muted mb-1">
              {t('selectDistrict')}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedMandi('');
              }}
              disabled={districts.length === 0}
              className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest disabled:opacity-50"
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
            <label className="block text-[11px] font-medium text-charcoal-muted mb-1">
              {t('selectMandi')}
            </label>
            <select
              value={selectedMandi}
              onChange={(e) => setSelectedMandi(e.target.value)}
              className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
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
      </div>

      {/* Loading & Error States */}
      {loadingPrices && (
        <div className="bg-white border border-ivory-dark rounded-md p-10 flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      {errorPrices && (
        <ErrorMessage
          message={priceError instanceof Error ? priceError.message : t('error')}
          onRetry={() => refetchPrices()}
        />
      )}

      {/* Aggregate Metric Tiles (Cult UI Pattern) */}
      {!loadingPrices && !errorPrices && summary && displayedRecords.length > 0 && (
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
            badge="Verified"
            icon={<Clock className="w-4 h-4 text-mutedGreen-dark" />}
          />
        </div>
      )}

      {/* Price Records Table / List (Watermelon UI Structured Data Grid) */}
      {!loadingPrices && !errorPrices && displayedRecords.length > 0 && (
        <div className="bg-white border border-ivory-dark rounded-md overflow-hidden shadow-subtle">
          <div className="px-5 py-4 border-b border-ivory-dark flex items-center justify-between">
            <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
              <span>Verified Market Filings</span>
              <span className="text-xs font-normal text-charcoal-muted">
                ({displayedRecords.length} records)
              </span>
            </h2>
            <div className="text-xs text-charcoal-muted flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-forest" />
              <span>Agmarknet Verified Telemetry</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ivory border-b border-ivory-dark text-charcoal-muted uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4">Commodity / फसल</th>
                  <th className="py-3 px-4">APMC Mandi / मंडी</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">{t('minPrice')}</th>
                  <th className="py-3 px-4 text-right font-bold text-forest">{t('modalPrice')}</th>
                  <th className="py-3 px-4 text-right">{t('maxPrice')}</th>
                  <th className="py-3 px-4 text-right">{t('arrivals')}</th>
                  <th className="py-3 px-4 text-center">Filing Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-dark text-charcoal">
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
                    <tr key={r.id} className="hover:bg-ivory/50 transition-colors">
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
                      <td className="py-3 px-4 text-right font-mono text-charcoal-muted">
                        ₹{r.minPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-forest text-sm bg-forest-50/50">
                        ₹{r.modalPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-charcoal-muted">
                        ₹{r.maxPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {r.arrivalQuantity ? `${r.arrivalQuantity} qtl` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-charcoal-muted">
                        {r.priceDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State (Explicit requirement: show proper empty state when no price data exists) */}
      {!loadingPrices && !errorPrices && displayedRecords.length === 0 && (
        <div className="bg-white border border-ivory-dark rounded-md p-8 text-center max-w-xl mx-auto shadow-subtle">
          <div className="w-12 h-12 bg-ivory rounded-full flex items-center justify-center mx-auto mb-3 text-charcoal-muted border border-ivory-dark">
            <Clock className="w-6 h-6 text-forest" />
          </div>
          <h3 className="font-bold text-charcoal text-base mb-1">{t('noPriceData')}</h3>
          <p className="text-xs text-charcoal-muted leading-relaxed mb-4">
            {t('noPriceNotice')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded transition-colors"
            >
              {t('filterReset')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCommodity('WHEAT')}
              className="px-3.5 py-1.5 bg-ivory hover:bg-ivory-dark border border-ivory-dark text-charcoal text-xs font-semibold rounded transition-colors"
            >
              View Wheat (गेहूं) Rates
            </button>
          </div>
        </div>
      )}

      {/* MSP Reference Notice (Benchmark) */}
      <div className="bg-ivory border border-harvest/40 rounded-md p-4 flex items-start space-x-3 text-xs text-charcoal">
        <Info className="w-4 h-4 text-harvest-dark shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-charcoal">
            Commission for Agricultural Costs and Prices (CACP) Reference
          </div>
          <p className="text-charcoal-muted leading-relaxed">
            {t('mspReferenceNotice')} The Minimum Support Price (MSP) acts as a price floor for agricultural commodities. Market modal prices fluctuate based on daily quality, moisture percentage, and arrival volume in each APMC yard.
          </p>
        </div>
      </div>
    </div>
  );
};
