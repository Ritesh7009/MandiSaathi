import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Table, proportional, type TableColumn } from '@astryxdesign/core/Table';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/apiClient';
import { MetricTile } from '../components/ui/MetricTile';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { GsapStaggerGrid } from '../components/ui/MotionPrimitives';
import { LottieBadge } from '../components/ui/LottieBadge';
import { MandiCorridorViz } from '../components/ui/MandiCorridorViz';
import {
  Scales,
  Grains,
  MapPin,
  Trophy,
  ArrowsLeftRight,
  Check,
  Truck,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react';
import { PriceRecord } from '../types';

type CompareTableRow = PriceRecord & Record<string, unknown>;

export const MandiComparison: React.FC = () => {
  const { language, t, getCommodityName, getMandiName } = useLanguage();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();

  const [selectedCommodity, setSelectedCommodity] = useState<string>('WHEAT');
  const [selectedVariety, setSelectedVariety] = useState<string>('');
  const [selectedMandis, setSelectedMandis] = useState<string[]>([
    'KHANNA_PB',
    'SIRSA_HR',
    'KARNAL_HR',
  ]);
  const [transportRatePerQtl, setTransportRatePerQtl] = useState<number>(35);
  const [isCustomTransport, setIsCustomTransport] = useState<boolean>(false);
  const [mandiSearchQuery, setMandiSearchQuery] = useState<string>('');
  const [zoomChartAxis, setZoomChartAxis] = useState<boolean>(true);

  const { data: commodities = [] } = useQuery({
    queryKey: ['commoditiesForCompare'],
    queryFn: () => api.getCommodities(),
    staleTime: 120000,
  });

  useEffect(() => {
    const requestedCommodity = searchParams.get('commodity');
    if (requestedCommodity && commodities.length > 0) {
      const normalized = requestedCommodity.trim().toLowerCase();
      const matched = commodities.find(
        (c) =>
          c.code.toLowerCase() === normalized ||
          c.nameEn.toLowerCase() === normalized ||
          c.nameHi?.toLowerCase() === normalized
      );
      if (matched) {
        setSelectedCommodity(matched.code);
        setSelectedVariety('');
      }
    }
  }, [searchParams, commodities]);

  const { data: mandis = [] } = useQuery({
    queryKey: ['allMandisForCompare'],
    queryFn: () => api.getMandis(),
    staleTime: 120000,
  });

  // Discover distinct varieties reported for selectedCommodity so farmers can switch varieties cleanly
  const { data: commodityPrices = [] } = useQuery({
    queryKey: ['commodityVarietiesForCompare', selectedCommodity],
    queryFn: () => api.getPrices(selectedCommodity, undefined),
    staleTime: 120000,
  });

  const availableVarieties = useMemo(() => {
    const vars = new Set<string>();
    commodityPrices.forEach((p) => {
      if (p.variety && p.variety.trim()) vars.add(p.variety.trim());
    });
    return Array.from(vars).sort();
  }, [commodityPrices]);

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

  const {
    data: comparison,
    isLoading: loadingComparison,
    isError: errorComparison,
    error: compError,
    refetch: refetchComparison,
  } = useQuery({
    queryKey: ['priceComparison', selectedCommodity, selectedMandis, selectedVariety],
    queryFn: () =>
      api.comparePrices(selectedCommodity, selectedMandis, selectedVariety || undefined),
    enabled: !!selectedCommodity && selectedMandis.length >= 2,
    staleTime: 60000,
  });

  const toggleMandiSelection = (code: string) => {
    setSelectedMandis((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= 6) return prev;
      return [...prev, code];
    });
  };

  const analytics = useMemo(() => {
    if (!comparison?.records || comparison.records.length === 0) return null;
    const records = comparison.records;
    let best = records[0]!;
    let lowest = records[0]!;
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
    return { grossSpread50Qtl, transportTotal, netEstimatedSpread };
  }, [analytics, transportRatePerQtl]);

  const chartData = useMemo(() => {
    if (!comparison?.records) return [];
    return comparison.records.map((r) => ({
      name: getMandiName(r.mandiCode, r.mandiNameHi || r.mandiNameEn),
      min: r.minPrice,
      modal: r.modalPrice,
      max: r.maxPrice,
      date: r.priceDate,
    }));
  }, [comparison, getMandiName]);

  const chartYAxisDomain = useMemo<[number, number] | undefined>(() => {
    if (!zoomChartAxis || chartData.length === 0) return undefined;
    const lows = chartData.map((d) => d.min);
    const highs = chartData.map((d) => d.max);
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    const pad = Math.max(25, Math.round((hi - lo) * 0.45));
    const lower = Math.max(0, Math.floor((lo - pad) / 10) * 10);
    const upper = Math.ceil((hi + pad) / 10) * 10;
    return [lower, upper];
  }, [zoomChartAxis, chartData]);

  const summaryText = useMemo(() => {
    if (!comparison) return '';
    if (language === 'hi' && comparison.summaryHi) return comparison.summaryHi;
    if (language === 'pa' && comparison.summaryPa) return comparison.summaryPa;
    return comparison.summaryEn;
  }, [comparison, language]);

  const ui = useMemo(() => {
    if (language === 'hi') {
      return {
        pickVariety: 'किस्म (Variety) चुनें',
        allVarietiesAuto: 'स्वतः समान किस्म मिलाएं',
        pickMandis: '2. तुलना हेतु मंडियाँ चुनें',
        chooseLimit: '2 से 6 मंडियाँ चुनें',
        selectedLabel: 'चयनित मंडियाँ:',
        searchPlaceholder: 'नाम, जिले या राज्य से मंडी खोजें...',
        clearAll: 'साफ़ करें',
        comparingLabel: 'तुलना सारांश',
        mandisSuffix: 'मंडियाँ',
        gainUnit: 'लाभ / क्विंटल',
        diffBadge: 'अंतर',
        advisoryTitle: 'बाज़ार तुलना सलाह',
        advisoryNote: 'केवल मॉडल भाव के आधार पर निर्णय न लें। नमी, गुणवत्ता ग्रेड, आढ़त शुल्क व दूरी का वास्तविक आकलन आवश्यक है।',
        tableHeaders: {
          mandi: 'मंडी बाजार',
          variety: 'किस्म',
          location: 'स्थान',
          min: 'न्यूनतम',
          modal: 'मॉडल भाव',
          max: 'अधिकतम',
          spread: 'सर्वोत्तम से अंतर',
          date: 'रिपोर्ट तिथि',
        },
        bestBadge: 'सर्वोत्तम',
        noCommonTitle: 'समान तिथि व किस्म का डेटा उपलब्ध नहीं',
        resetBtn: 'सक्रिय गेहूँ मंडियाँ दिखाएं',
        estDisclaimer: 'अनुमानित परिवहन व्यय के बाद अंतर; यह गारंटीड लाभ नहीं है।',
        corridorTitle: 'एपीएमसी मूल्य प्रवाह कॉरिडोर',
        corridorSubtitle: 'चुनी मंडियों से सर्वोत्तम मॉडल भाव मंडी तक का सीधा अंतर',
        zoomSpread: 'अंतर ज़ूम (Zoomed)',
        zeroScale: '₹0 आधार',
      };
    }
    if (language === 'pa') {
      return {
        pickVariety: 'ਫ਼ਸਲ ਦੀ ਕਿਸਮ ਚੁਣੋ',
        allVarietiesAuto: 'ਆਪਣੇ-ਆਪ ਸਾਂਝੀ ਕਿਸਮ ਮਿਲਾਓ',
        pickMandis: '2. ਤੁਲਨਾ ਲਈ ਮੰਡੀਆਂ ਚੁਣੋ',
        chooseLimit: '2 ਤੋਂ 6 ਮੰਡੀਆਂ ਚੁਣੋ',
        selectedLabel: 'ਚੁਣੀਆਂ ਮੰਡੀਆਂ:',
        searchPlaceholder: 'ਨਾਂ, ਜ਼ਿਲ੍ਹੇ ਜਾਂ ਰਾਜ ਨਾਲ ਮੰਡੀ ਲੱਭੋ...',
        clearAll: 'ਸਾਫ਼ ਕਰੋ',
        comparingLabel: 'ਤੁਲਨਾ ਵੇਰਵਾ',
        mandisSuffix: 'ਮੰਡੀਆਂ',
        gainUnit: 'ਫ਼ਰਕ / ਕੁਇੰਟਲ',
        diffBadge: 'ਅੰਤਰ',
        advisoryTitle: 'ਮੰਡੀ ਤੁਲਨਾ ਸਲਾਹ',
        advisoryNote: 'ਸਿਰਫ਼ ਮਾਡਲ ਭਾਅ ਉੱਤੇ ਨਿਰਭਰ ਨਾ ਰਹੋ। ਨਮੀ, ਗੁਣਵੱਤਾ ਅਤੇ ਢੋਆ-ਢੁਆਈ ਖਰਚੇ ਦੀ ਜਾਂਚ ਜ਼ਰੂਰ ਕਰੋ।',
        tableHeaders: {
          mandi: 'ਮੰਡੀ',
          variety: 'ਕਿਸਮ',
          location: 'ਥਾਂ',
          min: 'ਘੱਟੋ-ਘੱਟ',
          modal: 'ਮਾਡਲ ਭਾਅ',
          max: 'ਵੱਧ ਤੋਂ ਵੱਧ',
          spread: 'ਸਿਖਰ ਤੋਂ ਫ਼ਰਕ',
          date: 'ਮਿਤੀ',
        },
        bestBadge: 'ਸਭ ਤੋਂ ਵੱਧ',
        noCommonTitle: 'ਸਾਂਝੀ ਮਿਤੀ ਤੇ ਕਿਸਮ ਦਾ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ',
        resetBtn: 'ਕਣਕ ਦੀਆਂ ਮੁੱਖ ਮੰਡੀਆਂ ਚੁਣੋ',
        estDisclaimer: 'ਢੋਆ-ਢੁਆਈ ਤੋਂ ਬਾਅਦ ਅਨੁਮਾਨਿਤ ਫ਼ਰਕ; ਇਹ ਪੱਕੀ ਕਮਾਈ ਨਹੀਂ ਹੈ।',
        corridorTitle: 'ਏ.ਪੀ.ਐਮ.ਸੀ. ਕੀਮਤ ਫ਼ਰਕ ਕੋਰੀਡੋਰ',
        corridorSubtitle: 'ਚੁਣੀਆਂ ਮੰਡੀਆਂ ਤੋਂ ਸਿਖਰਲੇ ਮਾਡਲ ਭਾਅ ਤੱਕ ਸਿੱਧਾ ਫ਼ਰਕ',
        zoomSpread: 'ਫ਼ਰਕ ਜ਼ੂਮ',
        zeroScale: '₹0 ਅਧਾਰ',
      };
    }
    return {
      pickVariety: 'Crop Variety Filter',
      allVarietiesAuto: 'Auto-match shared variety',
      pickMandis: '2. Select Mandis',
      chooseLimit: 'Select 2 to 6 markets',
      selectedLabel: 'Selected:',
      searchPlaceholder: 'Search mandi by name, district, or state...',
      clearAll: 'Reset selection',
      comparingLabel: 'Markets Aligned',
      mandisSuffix: 'Mandis',
      gainUnit: 'Spread / Qtl',
      diffBadge: 'Spread',
      advisoryTitle: 'Market Intelligence Advisory',
      advisoryNote:
        'Never base sale decisions on modal rate alone. Realization depends on produce moisture, grading, commission fees, and exact freight distance.',
      tableHeaders: {
        mandi: 'Mandi Market',
        variety: 'Variety',
        location: 'State & District',
        min: 'Min Rate',
        modal: 'Modal Rate',
        max: 'Max Rate',
        spread: 'vs Best',
        date: 'Filing Date',
      },
      bestBadge: 'Best Rate',
      noCommonTitle: 'No Common-Date & Variety Data Available',
      resetBtn: 'Load Active Wheat Mandis',
      estDisclaimer: 'Estimated margin after transport deduction; not guaranteed earnings.',
      corridorTitle: 'APMC Price Spread Corridor',
      corridorSubtitle: 'Interactive rate flow from participating markets to highest-realization hub',
      zoomSpread: 'Spread Focus',
      zeroScale: 'Full ₹0 Scale',
    };
  }, [language]);

  const isDark = theme === 'dark';
  const axisTickColor = isDark ? '#9eb5a8' : '#445a4f';
  const gridStrokeColor = isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(11, 79, 55, 0.08)';

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t('compareTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
            {t('compareSubtitle')}
          </p>
        </div>

        <div className="inline-flex items-center space-x-2 text-xs font-medium bg-surface border border-line px-3.5 py-2 rounded-full text-ink-muted self-start sm:self-auto">
          <ArrowsLeftRight weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
          <span>{t('compareMarketsCardTitle')}</span>
        </div>
      </section>

      {/* Commodity, Variety & Mandi Controls */}
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card space-y-5">
        {/* Step 1: Commodity + Optional Variety */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-2">
            <label className="block text-xs font-semibold text-ink-muted">
              1. {t('pickCommodityToCompare')}
            </label>
            <div className="flex flex-wrap gap-2">
              {commodities.map((c) => {
                const active = selectedCommodity === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCommodity(c.code);
                      setSelectedVariety('');
                    }}
                    className={`min-h-[44px] inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-canopy text-white border-canopy shadow-subtle'
                        : 'bg-surface-subtle text-ink border-line hover:border-canopy/35'
                    }`}
                  >
                    <Grains weight="duotone" className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-saffron'}`} />
                    <span>{getCommodityName(c.code, c.nameHi || c.nameEn)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-2">
            <label className="block text-xs font-semibold text-ink-muted">
              {ui.pickVariety}
            </label>
            <select
              value={selectedVariety}
              onChange={(e) => setSelectedVariety(e.target.value)}
              className="w-full min-h-[44px] bg-surface-subtle border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-canopy-bright"
            >
              <option value="">{ui.allVarietiesAuto}</option>
              {availableVarieties.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Mandis Selection */}
        <div className="pt-4 border-t border-line space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-ink-muted">
              {ui.pickMandis} ({selectedMandis.length})
            </span>
            <span className="text-[11px] font-mono text-ink-subtle">{ui.chooseLimit}</span>
          </div>

          {selectedMandis.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-surface-subtle rounded-xl border border-line">
              <span className="text-[11px] font-semibold text-ink-muted mr-1">{ui.selectedLabel}</span>
              {selectedMandis.map((code) => {
                const m = mandis.find((x) => x.code === code);
                const mName = m ? getMandiName(m.code, m.nameHi || m.nameEn) : code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleMandiSelection(code)}
                    className="inline-flex items-center space-x-1 text-xs font-medium bg-surface px-2.5 py-1 rounded-full border border-line hover:border-red-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <span>{mName}</span>
                    {selectedMandis.length > 1 && <X weight="bold" className="w-3 h-3" />}
                  </button>
                );
              })}
              {selectedMandis.length > 2 && (
                <button
                  type="button"
                  onClick={() => setSelectedMandis(selectedMandis.slice(0, 2))}
                  className="text-[11px] text-ink-muted hover:text-ink underline ml-auto cursor-pointer px-1"
                >
                  {ui.clearAll}
                </button>
              )}
            </div>
          )}

          <TextInput
            label={ui.searchPlaceholder}
            isLabelHidden
            placeholder={ui.searchPlaceholder}
            value={mandiSearchQuery}
            onChange={setMandiSearchQuery}
            startIcon={<MagnifyingGlass weight="bold" className="w-4 h-4" />}
            hasClear
            size="md"
            width="100%"
          />

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredMandis.map((m) => {
              const isSelected = selectedMandis.includes(m.code);
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => toggleMandiSelection(m.code)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-canopy-soft border-canopy text-canopy dark:text-canopy-bright font-semibold'
                      : 'bg-surface border-line text-ink hover:bg-surface-subtle'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="text-xs truncate">{getMandiName(m.code, m.nameHi || m.nameEn)}</div>
                    <div className="text-[10px] text-ink-muted truncate">
                      {m.district}, {m.state}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected ? 'bg-canopy text-white border-canopy' : 'border-line-strong bg-surface'
                    }`}
                  >
                    {isSelected && <Check weight="bold" className="w-2.5 h-2.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {selectedMandis.length < 2 && (
        <Banner status="warning" collapsible={false} title={t('selectTwoMandisNotice')} />
      )}

      {loadingComparison && <LoadingSpinner />}

      {errorComparison && (
        <ErrorMessage
          message={compError instanceof Error ? compError.message : t('error')}
          onRetry={() => refetchComparison()}
        />
      )}

      {/* Results & Visualizations */}
      {!loadingComparison && !errorComparison && analytics && analytics.count > 0 && (
        <div className="space-y-6">
          <GsapStaggerGrid depKey={`${selectedCommodity}-${selectedVariety}-${analytics.count}`} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricTile
              className="gs-stagger-item"
              label={t('bestRateBadge')}
              value={analytics.best.modalPrice}
              numericValue={analytics.best.modalPrice}
              prefix="₹"
              unit={t('perQuintal')}
              variant="emerald"
              badge={getMandiName(analytics.best.mandiCode, analytics.best.mandiNameHi || analytics.best.mandiNameEn)}
              icon={<Trophy weight="duotone" className="w-4 h-4" />}
            />

            <MetricTile
              className="gs-stagger-item"
              label={t('differenceSpread')}
              value={analytics.spread}
              numericValue={analytics.spread}
              prefix="₹"
              unit={ui.gainUnit}
              subtext={t('trolleyNetGainText').replace(
                '{gain}',
                (analytics.spread * 50).toLocaleString('en-IN')
              )}
              variant="saffron"
              badge={ui.diffBadge}
              icon={<ArrowsLeftRight weight="duotone" className="w-4 h-4" />}
            />

            <MetricTile
              className="gs-stagger-item"
              label={ui.comparingLabel}
              value={`${analytics.count}/${selectedMandis.length} ${ui.mandisSuffix}`}
              unit={comparison?.commonVariety ? `${ui.tableHeaders.variety}: ${comparison.commonVariety}` : ''}
              badge={comparison?.commonDate ? `${comparison.commonDate}` : t('verifiedRecords')}
              icon={<Scales weight="duotone" className="w-4 h-4" />}
            />
          </GsapStaggerGrid>

          {/* 50-Quintal Transport Margin Simulator */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
              <div className="flex items-center space-x-2">
                <Truck weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
                <h3 className="font-display font-bold text-sm text-ink">{t('trolleyNetMarginTitle')}</h3>
              </div>
              <span className="text-[11px] font-mono text-ink-muted bg-surface-subtle px-2.5 py-1 rounded-full border border-line self-start sm:self-auto">
                {t('trolleyEstimateBadge')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-surface-subtle rounded-xl border border-line space-y-1">
                <span className="text-[11px] font-semibold text-ink-muted block">{t('grossPriceDiff')}</span>
                <div className="text-lg font-bold text-ink font-mono tnum">
                  ₹{transportCalc ? transportCalc.grossSpread50Qtl.toLocaleString('en-IN') : 0}
                </div>
                <p className="text-[11px] text-ink-muted">
                  {t('trolleySpreadExplainer').replace('{spread}', analytics.spread.toString())}
                </p>
              </div>

              <div className="p-4 bg-surface-subtle rounded-xl border border-line space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-ink-muted">{t('transportAllowance')}</span>
                  <span className="text-[10px] font-mono text-canopy dark:text-canopy-bright">
                    {isCustomTransport ? t('userEnteredRate') : t('defaultTransportRate')}
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-ink">₹</span>
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
                      aria-label={t('transportAllowance')}
                      className="w-24 min-h-[40px] bg-surface border border-line rounded-xl px-3 py-1.5 font-mono text-sm text-ink focus:outline-none focus:border-canopy-bright"
                    />
                    <span className="text-[11px] text-ink-muted">/ Qtl</span>
                  </div>
                  <SegmentedControl
                    value={String(transportRatePerQtl)}
                    onChange={(val) => {
                      const preset = Number(val);
                      if (!Number.isNaN(preset)) {
                        setTransportRatePerQtl(preset);
                        setIsCustomTransport(preset !== 35);
                      }
                    }}
                    label={t('transportAllowance')}
                    size="sm"
                    layout="fill"
                  >
                    {[25, 35, 50, 75].map((preset) => (
                      <SegmentedControlItem key={preset} value={String(preset)} label={`₹${preset}`} />
                    ))}
                  </SegmentedControl>
                </div>
                <p className="text-[11px] text-ink-muted">
                  {t('trolleyTotalTransport').replace(
                    '{cost}',
                    (transportCalc ? transportCalc.transportTotal : 0).toLocaleString('en-IN')
                  )}
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border space-y-1 ${
                  transportCalc && transportCalc.netEstimatedSpread > 0
                    ? 'bg-canopy-soft border-canopy/30'
                    : 'bg-surface-subtle border-line'
                }`}
              >
                <span className="text-[11px] font-semibold text-ink-muted block">{t('netEstDifference')}</span>
                <div className="text-lg font-bold font-mono tnum text-ink">
                  {transportCalc && transportCalc.netEstimatedSpread > 0 ? '+' : ''}
                  ₹{transportCalc ? transportCalc.netEstimatedSpread.toLocaleString('en-IN') : 0}
                </div>
                <p className="text-[11px] text-ink-muted">{ui.estDisclaimer}</p>
              </div>
            </div>

            <Banner status="info" collapsible={false} title={ui.advisoryNote} />
          </div>

          {summaryText && (
            <Banner status="success" collapsible={false} title={ui.advisoryTitle} description={summaryText} />
          )}

          {/* ThreeUI-Inspired APMC Price Corridor Spread Topology */}
          {comparison?.records && (
            <MandiCorridorViz
              records={comparison.records}
              bestRecord={analytics.best}
              commodityLabel={
                selectedVariety || comparison.commonVariety || selectedCommodity
              }
              getMandiLabel={(r) => getMandiName(r.mandiCode, r.mandiNameHi || r.mandiNameEn)}
              title={ui.corridorTitle}
              subtitle={ui.corridorSubtitle}
            />
          )}

          {/* Recharts Bar Comparison Chart with Zoomed Spread Mode */}
          {chartData.length >= 2 && (
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold text-ink">{t('priceTrendChart')}</h2>
                  <p className="text-xs text-ink-muted mt-0.5">{t('historicalNote')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SegmentedControl
                    value={zoomChartAxis ? 'zoom' : 'zero'}
                    onChange={(val) => setZoomChartAxis(val === 'zoom')}
                    label="Chart scale mode"
                    size="sm"
                  >
                    <SegmentedControlItem value="zoom" label={ui.zoomSpread} />
                    <SegmentedControlItem value="zero" label={ui.zeroScale} />
                  </SegmentedControl>
                  <Badge variant="neutral" label="₹ / Qtl" />
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 16, left: 4, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: axisTickColor, fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: gridStrokeColor }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={chartYAxisDomain || [0, 'auto']}
                      tick={{ fill: axisTickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(11, 79, 55, 0.05)' }}
                      contentStyle={{
                        backgroundColor: isDark ? '#0c1a13' : '#ffffff',
                        borderColor: isDark ? 'rgba(52,211,153,0.28)' : 'rgba(11,79,55,0.18)',
                        borderRadius: '14px',
                        color: isDark ? '#f0f5f2' : '#0d1f17',
                        fontSize: '12px',
                        boxShadow: '0 10px 28px -8px rgba(0,0,0,0.22)',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value) => <span style={{ color: axisTickColor }}>{value}</span>}
                    />
                    <Bar dataKey="min" name={ui.tableHeaders.min} fill="#64748b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="modal" name={ui.tableHeaders.modal} fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="max" name={ui.tableHeaders.max} fill="#d97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Astryx Parity Comparison Ledger Table */}
          <section className="rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
            <CompareLedgerTable
              records={(comparison?.records ?? []) as CompareTableRow[]}
              bestRecordId={analytics.best.id}
              bestModalPrice={analytics.best.modalPrice}
              commonVariety={comparison?.commonVariety}
              ui={ui}
              getMandiName={getMandiName}
            />
          </section>
        </div>
      )}

      {/* Empty State */}
      {!loadingComparison &&
        !errorComparison &&
        selectedMandis.length >= 2 &&
        (!comparison || comparison.records.length === 0) && (
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-subtle max-w-xl mx-auto">
            <EmptyState
              icon={<LottieBadge variant="empty" loop className="w-16 h-16" />}
              title={ui.noCommonTitle}
              description={summaryText}
              actions={
                <Button
                  label={ui.resetBtn}
                  variant="primary"
                  onClick={() => {
                    setSelectedCommodity('WHEAT');
                    setSelectedVariety('');
                    setSelectedMandis(['KHANNA_PB', 'SIRSA_HR', 'KARNAL_HR']);
                  }}
                />
              }
            />
          </section>
        )}
    </div>
  );
};

interface CompareLedgerTableProps {
  records: CompareTableRow[];
  bestRecordId: number;
  bestModalPrice: number;
  commonVariety?: string | null;
  ui: {
    bestBadge: string;
    tableHeaders: {
      mandi: string;
      variety: string;
      location: string;
      min: string;
      modal: string;
      max: string;
      spread: string;
      date: string;
    };
  };
  getMandiName: (code: string, fallback: string) => string;
}

const CompareLedgerTable: React.FC<CompareLedgerTableProps> = ({
  records,
  bestRecordId,
  bestModalPrice,
  commonVariety,
  ui,
  getMandiName,
}) => {
  const columns: TableColumn<CompareTableRow>[] = useMemo(
    () => [
      {
        key: 'mandi',
        header: ui.tableHeaders.mandi,
        width: proportional(1.4, { minWidth: 150 }),
        renderCell: (r) => {
          const isBest = bestRecordId === r.id;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin weight="duotone" className="w-3.5 h-3.5 text-saffron-text shrink-0" />
              <span className="font-semibold text-ink">
                {getMandiName(r.mandiCode, r.mandiNameHi || r.mandiNameEn)}
              </span>
              {isBest && <Badge variant="success" label={ui.bestBadge} />}
            </div>
          );
        },
      },
      {
        key: 'variety',
        header: ui.tableHeaders.variety,
        width: proportional(1, { minWidth: 100 }),
        renderCell: (r) => (
          <Badge variant="neutral" label={r.variety || commonVariety || 'Common'} />
        ),
      },
      {
        key: 'location',
        header: ui.tableHeaders.location,
        width: proportional(1.2, { minWidth: 120 }),
        renderCell: (r) => (
          <span className="text-ink-muted">
            {r.district}, {r.state}
          </span>
        ),
      },
      {
        key: 'minPrice',
        header: ui.tableHeaders.min,
        align: 'end',
        width: proportional(0.8, { minWidth: 85 }),
        renderCell: (r) => (
          <span className="font-mono tnum text-ink-muted">₹{r.minPrice.toLocaleString('en-IN')}</span>
        ),
      },
      {
        key: 'modalPrice',
        header: ui.tableHeaders.modal,
        align: 'end',
        width: proportional(0.9, { minWidth: 95 }),
        renderCell: (r) => (
          <span className="font-mono tnum font-bold text-canopy dark:text-canopy-bright text-sm">
            ₹{r.modalPrice.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'maxPrice',
        header: ui.tableHeaders.max,
        align: 'end',
        width: proportional(0.8, { minWidth: 85 }),
        renderCell: (r) => (
          <span className="font-mono tnum text-ink-muted">₹{r.maxPrice.toLocaleString('en-IN')}</span>
        ),
      },
      {
        key: 'spread',
        header: ui.tableHeaders.spread,
        align: 'end',
        width: proportional(0.95, { minWidth: 100 }),
        renderCell: (r) => {
          const isBest = bestRecordId === r.id;
          const diff = bestModalPrice - r.modalPrice;
          return isBest ? (
            <span className="font-mono tnum text-canopy dark:text-canopy-bright font-bold">₹0</span>
          ) : (
            <span className="font-mono tnum text-danger font-semibold">
              -₹{diff.toLocaleString('en-IN')}
            </span>
          );
        },
      },
      {
        key: 'priceDate',
        header: ui.tableHeaders.date,
        align: 'center',
        width: proportional(0.95, { minWidth: 100 }),
        renderCell: (r) => (
          <span className="font-mono tnum text-xs text-ink-muted">{r.priceDate}</span>
        ),
      },
    ],
    [bestRecordId, bestModalPrice, commonVariety, ui, getMandiName]
  );

  return (
    <Table<CompareTableRow>
      data={records}
      columns={columns}
      idKey="id"
      density="balanced"
      dividers="rows"
      hasHover
    />
  );
};
