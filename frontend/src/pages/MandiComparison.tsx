import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { MetricTile } from '../components/ui/MetricTile';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Scale,
  Wheat,
  MapPin,
  TrendingUp,
  Award,
  ArrowRightLeft,
  Check,
  AlertCircle,
  ShieldCheck,
  Truck,
  Info,
  Search,
  X,
} from 'lucide-react';

export const MandiComparison: React.FC = () => {
  const { language, t, getCommodityName: getLocalizedComm, getMandiName: getLocalizedM } = useLanguage();

  const [selectedCommodity, setSelectedCommodity] = useState<string>('WHEAT');
  const [selectedMandis, setSelectedMandis] = useState<string[]>([
    'KHANNA_PB',
    'SIRSA_HR',
    'KARNAL_HR',
  ]);
  const [transportRatePerQtl, setTransportRatePerQtl] = useState<number>(35);
  const [isCustomTransport, setIsCustomTransport] = useState<boolean>(false);
  const [mandiSearchQuery, setMandiSearchQuery] = useState<string>('');

  // Fetch commodities list
  const { data: commodities = [] } = useQuery({
    queryKey: ['commoditiesForCompare'],
    queryFn: () => api.getCommodities(),
    staleTime: 120000,
  });

  // Fetch all mandis
  const { data: mandis = [] } = useQuery({
    queryKey: ['allMandisForCompare'],
    queryFn: () => api.getMandis(),
    staleTime: 120000,
  });

  const filteredMandis = useMemo(() => {
    if (!mandiSearchQuery.trim()) return mandis;
    const q = mandiSearchQuery.toLowerCase();
    return mandis.filter(
      (m) =>
        m.nameEn.toLowerCase().includes(q) ||
        m.nameHi?.toLowerCase().includes(q) ||
        m.namePa?.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q) ||
        m.state.toLowerCase().includes(q)
    );
  }, [mandis, mandiSearchQuery]);

  // Fetch price comparison data
  const {
    data: comparison,
    isLoading: loadingComparison,
    isError: errorComparison,
    error: compError,
    refetch: refetchComparison,
  } = useQuery({
    queryKey: ['priceComparison', selectedCommodity, selectedMandis],
    queryFn: () => api.comparePrices(selectedCommodity, selectedMandis),
    enabled: !!selectedCommodity && selectedMandis.length >= 2,
    staleTime: 60000,
  });

  const toggleMandiSelection = (code: string) => {
    setSelectedMandis((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev; // Keep at least 1
        return prev.filter((c) => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const getCommodityName = (c: { code?: string; nameEn: string; nameHi: string; namePa: string | null }) => {
    return getLocalizedComm(c.code || c.nameEn, c.nameHi || c.nameEn);
  };

  const getMandiName = (m: { code?: string; nameEn: string; nameHi: string; namePa: string | null }) => {
    return getLocalizedM(m.code || m.nameEn, m.nameHi || m.nameEn);
  };

  // Find best modal rate & price spread
  const analytics = useMemo(() => {
    if (!comparison?.records || comparison.records.length === 0) return null;
    const records = comparison.records;
    const first = records[0];
    if (!first) return null;

    let best = first;
    let lowest = first;
    records.forEach((r) => {
      if (r.modalPrice > best.modalPrice) best = r;
      if (r.modalPrice < lowest.modalPrice) lowest = r;
    });

    const spread = best.modalPrice - lowest.modalPrice;
    return { best, lowest, spread, count: records.length };
  }, [comparison]);

  const transportCalc = useMemo(() => {
    if (!analytics) return null;
    const grossSpread50Qtl = analytics.spread * 50;
    const transportTotal = transportRatePerQtl * 50;
    const netEstimatedSpread = grossSpread50Qtl - transportTotal;
    return {
      grossSpread50Qtl,
      transportTotal,
      netEstimatedSpread,
    };
  }, [analytics, transportRatePerQtl]);

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!comparison || !comparison.records) return [];
    return comparison.records.map((r) => {
      const name =
        language === 'hi'
          ? r.mandiNameHi
          : language === 'pa' && r.mandiNamePa
          ? r.mandiNamePa
          : r.mandiNameEn;

      return {
        name,
        min: r.minPrice,
        modal: r.modalPrice,
        max: r.maxPrice,
        location: `${r.district}, ${r.state}`,
        date: r.priceDate,
      };
    });
  }, [comparison, language]);

  const summaryText = useMemo(() => {
    if (!comparison) return '';
    if (language === 'hi' && comparison.summaryHi) return comparison.summaryHi;
    if (language === 'pa' && comparison.summaryPa) return comparison.summaryPa;
    return comparison.summaryEn;
  }, [comparison, language]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Screen Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Scale className="w-3.5 h-3.5 text-harvest-dark" />
            <span>{t('compareTitle')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {t('compareTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5 max-w-2xl">
            {t('compareSubtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium bg-surface border border-hairline px-3 py-1.5 rounded-lg text-charcoal-muted self-start sm:self-center">
          <ArrowRightLeft className="w-3.5 h-3.5 text-forest" />
          <span>
            {language === 'hi'
              ? 'मंडी भाव अंतर एवं ट्रॉली बचत'
              : language === 'pa'
              ? 'ਮੰਡੀ ਭਾਅ ਤੁਲਨਾ ਅਤੇ ਬੱਚਤ'
              : 'Inter-Mandi Price Difference & Net Gain'}
          </span>
        </div>
      </section>

      {/* Control Panel: Commodity Choice & Mandi Multi-Selector */}
      <section className="rounded-xl border border-hairline bg-surface-white p-5 shadow-subtle space-y-4">
        {/* Commodity Choice */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-subtle uppercase tracking-wider mb-2">
            1. {t('pickCommodityToCompare')}
          </label>
          <div className="flex flex-wrap gap-2">
            {commodities.map((c) => {
              const isSelected = selectedCommodity === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCommodity(c.code)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-forest text-white border-forest shadow-subtle'
                      : 'bg-surface text-charcoal border-hairline hover:bg-forest-50/50'
                  }`}
                >
                  <Wheat className={`w-3.5 h-3.5 ${isSelected ? 'text-harvest' : 'text-charcoal-muted'}`} />
                  <span>{getCommodityName(c)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mandi Multi-Selector with Pinned Strip & Search */}
        <div className="pt-3 border-t border-hairline space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-charcoal-subtle uppercase tracking-wider">
              2. Select Mandis ({selectedMandis.length} SELECTED)
            </label>
            <span className="text-xs text-charcoal-muted font-mono">
              Choose 2 to 6 to compare
            </span>
          </div>

          {/* Pinned Active Mandis Strip */}
          {selectedMandis.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-forest-50/60 rounded-lg border border-forest/20">
              <span className="text-[10px] font-bold text-forest uppercase tracking-wider mr-1">
                Active Markets:
              </span>
              {selectedMandis.map((code) => {
                const m = mandis.find((item) => item.code === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-surface-white text-forest border border-forest/30 px-2 py-0.5 rounded shadow-xs"
                  >
                    <span>{m ? getMandiName(m) : code}</span>
                    <button
                      type="button"
                      onClick={() => toggleMandiSelection(code)}
                      className="text-forest/70 hover:text-red-600 cursor-pointer ml-1"
                      title="Remove market"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedMandis([])}
                className="text-[10px] text-charcoal-muted hover:text-red-600 underline ml-auto cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Quick Mandi Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-charcoal-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter mandis by name, district, or state..."
              value={mandiSearchQuery}
              onChange={(e) => setMandiSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-surface border border-hairline rounded-lg text-xs text-charcoal focus:outline-none focus:border-forest"
            />
            {mandiSearchQuery && (
              <button
                type="button"
                onClick={() => setMandiSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Compact Scrollable Mandi Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredMandis.map((m) => {
              const isSelected = selectedMandis.includes(m.code);
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => toggleMandiSelection(m.code)}
                  className={`flex items-center justify-between p-2 rounded-lg text-left border transition-all duration-150 cursor-pointer tactile-press ${
                    isSelected
                      ? 'bg-forest-50/80 border-forest text-forest font-semibold shadow-subtle'
                      : 'bg-surface-white border-hairline text-charcoal hover:bg-surface'
                  }`}
                >
                  <div className="truncate mr-1.5">
                    <div className="text-xs truncate">{getMandiName(m)}</div>
                    <div className="text-[10px] text-charcoal-muted truncate">
                      {m.district}, {m.state}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-forest text-white border-forest'
                        : 'border-hairline-dark bg-surface-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Notice if less than 2 mandis are selected */}
      {selectedMandis.length < 2 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center space-x-3 text-xs text-charcoal shadow-subtle">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
          <span>{t('selectTwoMandisNotice')}</span>
        </div>
      )}

      {/* Loading state */}
      {loadingComparison && (
        <div className="rounded-xl border border-hairline bg-surface-white p-12 flex justify-center shadow-subtle">
          <LoadingSpinner />
        </div>
      )}

      {/* Error state */}
      {errorComparison && (
        <ErrorMessage
          message={compError instanceof Error ? compError.message : t('error')}
          onRetry={() => refetchComparison()}
        />
      )}

      {/* Summary Metrics & Analytics */}
      {!loadingComparison && !errorComparison && analytics && analytics.best && analytics.count > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MetricTile
              label={t('bestRateBadge')}
              value={`₹${analytics.best.modalPrice.toLocaleString('en-IN')}`}
              unit={t('perQuintal')}
              variant="forest"
              badge={
                language === 'hi'
                  ? analytics.best.mandiNameHi
                  : language === 'pa' && analytics.best.mandiNamePa
                  ? analytics.best.mandiNamePa
                  : analytics.best.mandiNameEn
              }
              icon={<Award className="w-4 h-4 text-harvest-dark" />}
            />

            <MetricTile
              label={t('differenceSpread')}
              value={`₹${analytics.spread.toLocaleString('en-IN')}`}
              unit="Gain / Quintal"
              subtext={
                analytics.spread > 0
                  ? t('trolleyNetGainText').replace('{gain}', (analytics.spread * 50).toLocaleString('en-IN'))
                  : 'Zero spread across selected markets'
              }
              variant="harvest"
              badge="Differential"
              icon={<ArrowRightLeft className="w-4 h-4 text-forest" />}
            />

            <MetricTile
              label="Comparing Markets"
              value={`${analytics.count} of ${selectedMandis.length} Mandis`}
              unit={analytics.count === selectedMandis.length ? 'All Selected Reporting' : 'Active Mandi Filings'}
              badge={t('verifiedRecords')}
              icon={<Scale className="w-4 h-4 text-mutedGreen-dark" />}
            />
          </div>

          {/* 50-Quintal Trolley Transport & Net Margin Estimate Card */}
          <div className="rounded-xl border border-hairline bg-surface-white p-5 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-forest" />
                <h3 className="font-bold text-sm text-charcoal">
                  {t('trolleyNetMarginTitle')}
                </h3>
              </div>
              <span className="text-xs font-mono text-charcoal-muted bg-surface px-2.5 py-0.5 rounded border border-hairline self-start sm:self-auto">
                {t('trolleyEstimateBadge')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-surface rounded-lg border border-hairline space-y-1">
                <span className="text-xs font-semibold text-charcoal-subtle uppercase tracking-wider block">
                  {t('grossPriceDiff')}
                </span>
                <div className="text-lg font-bold text-charcoal font-mono tnum">
                  ₹{transportCalc ? transportCalc.grossSpread50Qtl.toLocaleString('en-IN') : 0}
                </div>
                <p className="text-xs text-charcoal-muted">
                  {t('trolleySpreadExplainer').replace('{spread}', analytics.spread.toString())}
                </p>
              </div>

              <div className="p-3 bg-surface rounded-lg border border-hairline space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-subtle uppercase tracking-wider block">
                    {t('transportAllowance')}
                  </span>
                  <span className="text-xs font-mono font-medium text-forest">
                    {isCustomTransport ? t('userEnteredRate') : t('defaultTransportRate')}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs font-mono font-semibold text-charcoal">₹</span>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={transportRatePerQtl}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTransportRatePerQtl(val >= 0 ? val : 0);
                      setIsCustomTransport(true);
                    }}
                    className="w-20 bg-surface-white border border-hairline rounded px-2 py-1 font-mono text-xs text-charcoal focus:outline-none focus:border-forest"
                  />
                  <span className="text-[11px] text-charcoal-muted">/ qtl</span>
                  {isCustomTransport && (
                    <button
                      type="button"
                      onClick={() => {
                        setTransportRatePerQtl(35);
                        setIsCustomTransport(false);
                      }}
                      className="text-[10px] text-forest hover:underline ml-auto cursor-pointer"
                    >
                      {t('resetDefault')}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-charcoal-muted">
                  {t('trolleyTotalTransport').replace('{cost}', (transportCalc ? transportCalc.transportTotal : 0).toLocaleString('en-IN'))}
                </p>
              </div>

              <div className={`p-3 rounded-lg border space-y-1 ${
                transportCalc && transportCalc.netEstimatedSpread > 0
                  ? 'bg-forest-50/70 border-forest/30 text-forest-dark'
                  : 'bg-surface border-hairline text-charcoal'
              }`}>
                <span className="text-[10px] font-semibold uppercase tracking-wider block text-charcoal-subtle">
                  {t('netEstDifference')}
                </span>
                <div className="text-lg font-bold font-mono tnum">
                  {transportCalc && transportCalc.netEstimatedSpread >= 0 ? '+' : ''}₹{transportCalc ? transportCalc.netEstimatedSpread.toLocaleString('en-IN') : 0}
                </div>
                <p className="text-[11px] text-charcoal-muted">
                  Estimated profit after transport deductions; not guaranteed earnings.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-charcoal-muted bg-ivory/60 p-3 rounded-lg border border-hairline leading-relaxed flex items-start space-x-2">
              <Info className="w-3.5 h-3.5 text-charcoal-subtle shrink-0 mt-0.5" />
              <span>
                <strong>Advisory Note:</strong> Market recommendations should never be based solely on modal prices. Net realization depends on produce grading, moisture tests, commission agent fees, weighment charges, and actual distance. Always verify active trading hours and auction schedules before dispatching produce.
              </span>
            </div>
          </div>

          {/* Multilingual Advisory Callout */}
          {summaryText && (
            <div className="rounded-xl bg-forest-50 border border-forest/20 p-4 text-xs text-forest-dark flex items-start space-x-3 shadow-subtle">
              <TrendingUp className="w-4 h-4 text-forest shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-forest">
                  Market Intelligence Advisory
                </span>
                <p className="text-xs text-charcoal leading-relaxed font-medium">
                  {summaryText}
                </p>
              </div>
            </div>
          )}

          {/* Recharts Bar Chart Comparison */}
          {chartData.length >= 2 && (
            <section className="rounded-xl border border-hairline bg-surface-white p-5 shadow-subtle">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-charcoal">
                    {t('priceTrendChart')}
                  </h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    {t('historicalNote')}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-charcoal-muted bg-surface px-2.5 py-1 rounded-md border border-hairline">
                  Unit: ₹ / Quintal
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DC" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#1B2620', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#E8E5DC' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#5A6B62', fontSize: 11 }}
                      axisLine={{ stroke: '#E8E5DC' }}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length && payload[0]?.payload) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-surface-white border border-hairline p-3 rounded-lg shadow-float text-xs space-y-1">
                              <div className="font-bold text-forest">{data.name}</div>
                              <div className="text-xs text-charcoal-muted">{data.location}</div>
                              <div className="pt-1.5 border-t border-hairline space-y-0.5">
                                <div className="text-forest font-semibold tnum font-mono">
                                  {t('modalPrice')}: ₹{data.modal?.toLocaleString('en-IN')} / qtl
                                </div>
                                <div className="text-charcoal-muted tnum font-mono">
                                  {t('minPrice')} – {t('maxPrice')}: ₹{data.min?.toLocaleString('en-IN')} – ₹{data.max?.toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs text-charcoal-muted pt-0.5 font-mono">
                                  Auction Date: {data.date}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs font-semibold text-charcoal capitalize">
                          {val === 'modal' ? t('modalPrice') : val === 'min' ? t('minPrice') : t('maxPrice')}
                        </span>
                      )}
                    />
                    <Bar dataKey="min" fill="#78917E" radius={[4, 4, 0, 0]} name="min" maxBarSize={32} />
                    <Bar dataKey="modal" fill="#174B35" radius={[4, 4, 0, 0]} name="modal" maxBarSize={32} />
                    <Bar dataKey="max" fill="#9E6500" radius={[4, 4, 0, 0]} name="max" maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Side-by-Side Comparison Matrix */}
          <section className="rounded-xl border border-hairline bg-surface-white overflow-hidden shadow-subtle">
            <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
              <h2 className="text-sm font-bold text-charcoal">
                Comparative Rate Breakdown
              </h2>
              <span className="text-xs text-charcoal-muted flex items-center space-x-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                <span>Agmarknet Verified</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface border-b border-hairline text-charcoal-subtle uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Mandi Market</th>
                    <th className="py-3 px-4">State & District</th>
                    <th className="py-3 px-4 text-right">Min Rate</th>
                    <th className="py-3 px-4 text-right font-bold text-forest">Modal Rate</th>
                    <th className="py-3 px-4 text-right">Max Rate</th>
                    <th className="py-3 px-4 text-right">Spread vs Best</th>
                    <th className="py-3 px-4 text-center">Filing Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-charcoal">
                  {comparison?.records?.map((r) => {
                    const mandiName =
                      language === 'hi'
                        ? r.mandiNameHi
                        : language === 'pa' && r.mandiNamePa
                        ? r.mandiNamePa
                        : r.mandiNameEn;

                    const isBest = analytics?.best ? r.id === analytics.best.id : false;
                    const diffFromBest = analytics?.best ? analytics.best.modalPrice - r.modalPrice : 0;

                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors ${
                          isBest ? 'bg-forest-50/50 font-medium' : 'hover:bg-surface'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-harvest-dark shrink-0" />
                            <span className="font-semibold text-charcoal">{mandiName}</span>
                            {isBest && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-forest text-white uppercase font-mono shadow-xs">
                                Best Rate
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-charcoal-muted">
                          {r.district}, {r.state}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-charcoal-muted tnum">
                          ₹{r.minPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-forest text-sm bg-forest-50/30 tnum">
                          ₹{r.modalPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-charcoal-muted tnum">
                          ₹{r.maxPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tnum">
                          {isBest ? (
                            <span className="text-forest font-bold">—</span>
                          ) : (
                            <span className="text-red-700 font-semibold">
                              -₹{diffFromBest.toLocaleString('en-IN')}
                            </span>
                          )}
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
          </section>
        </div>
      )}

      {/* Empty State */}
      {!loadingComparison &&
        !errorComparison &&
        selectedMandis.length >= 2 &&
        (!comparison || comparison.records.length === 0) && (
          <div className="rounded-xl border border-hairline bg-surface-white p-8 text-center max-w-xl mx-auto shadow-subtle">
            <Wheat className="w-10 h-10 text-charcoal-muted mx-auto mb-2" />
            <h3 className="font-bold text-charcoal text-base mb-1">
              No Common-Date Comparison Data Available
            </h3>
            <p className="text-xs text-charcoal-muted mb-4 leading-relaxed">
              {summaryText || `None of the selected mandis have filed price reports for ${selectedCommodity} on a common reporting date. Try selecting Khanna (PB), Sirsa (HR), or Karnal (HR).`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCommodity('WHEAT');
                setSelectedMandis(['KHANNA_PB', 'SIRSA_HR', 'KARNAL_HR']);
              }}
              className="px-4 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-light transition-all shadow-subtle cursor-pointer"
            >
              Reset to Active Wheat Mandis
            </button>
          </div>
        )}
    </div>
  );
};
