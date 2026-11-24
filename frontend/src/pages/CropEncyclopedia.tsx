import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plant,
  MagnifyingGlass,
  Calendar,
  Drop,
  Flask,
  Bug,
  Warehouse,
  MapPin,
  ArrowRight,
  Microphone,
  TrendUp,
  SunHorizon,
  Thermometer,
  X,
} from '@phosphor-icons/react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import {
  INDIAN_CROPS,
  CROP_CATEGORIES,
  CROP_SEASONS,
  CropCategory,
  CropSeason,
  IndianCropProfile,
} from '../data/indianCrops';

export const CropEncyclopedia: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CropCategory | 'ALL'>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<CropSeason | 'ALL'>('ALL');
  const [activeCrop, setActiveCrop] = useState<IndianCropProfile | null>(null);

  useEffect(() => {
    const requestedCrop = searchParams.get('crop');
    if (requestedCrop) {
      const found = INDIAN_CROPS.find(
        (c) =>
          c.id.toLowerCase() === requestedCrop.toLowerCase() ||
          c.commodityCode?.toLowerCase() === requestedCrop.toLowerCase()
      );
      if (found) setActiveCrop(found);
    }
  }, [searchParams]);

  const getCropTitle = (crop: IndianCropProfile) =>
    language === 'hi' ? crop.nameHi : language === 'pa' ? crop.namePa : crop.nameEn;

  const filteredCrops = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INDIAN_CROPS.filter((crop) => {
      if (selectedCategory !== 'ALL' && crop.category !== selectedCategory) return false;
      if (selectedSeason !== 'ALL' && crop.season !== selectedSeason) return false;
      if (!q) return true;
      return (
        crop.nameEn.toLowerCase().includes(q) ||
        crop.nameHi.toLowerCase().includes(q) ||
        crop.namePa.toLowerCase().includes(q) ||
        crop.scientificName.toLowerCase().includes(q) ||
        crop.category.toLowerCase().includes(q) ||
        crop.majorStates.some((s) => s.toLowerCase().includes(q)) ||
        crop.keyMandis.some((m) => m.toLowerCase().includes(q)) ||
        crop.varieties.some((v) => v.toLowerCase().includes(q))
      );
    });
  }, [query, selectedCategory, selectedSeason]);

  const seasonBadgeVariant = (season: CropSeason): 'success' | 'warning' | 'info' | 'neutral' => {
    switch (season) {
      case 'Kharif':
        return 'success';
      case 'Rabi':
        return 'info';
      case 'Zaid':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const openCropDossier = (crop: IndianCropProfile) => {
    setActiveCrop(crop);
    setSearchParams({ crop: crop.id }, { replace: true });
  };

  const closeCropDossier = () => {
    setActiveCrop(null);
    if (searchParams.has('crop')) {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-line ms-hero-surface p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canopy-soft border border-canopy/20 text-canopy dark:text-canopy-bright text-xs font-semibold">
              <Plant weight="duotone" className="w-4 h-4" />
              <span>
                {language === 'hi'
                  ? 'अखिल भारतीय फसल ज्ञानकोश · ICAR व SAU प्रमाणित'
                  : language === 'pa'
                  ? 'ਆਲ ਇੰਡੀਆ ਫ਼ਸਲ ਗਿਆਨਕੋਸ਼ · ICAR ਪ੍ਰਮਾਣਿਤ'
                  : 'All-India Crop Encyclopedia · ICAR & SAU Verified'}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-ink tracking-tight">
              {language === 'hi'
                ? 'भारत की प्रमुख फसलें: एक ही स्थान पर संपूर्ण जानकारी'
                : language === 'pa'
                ? 'ਭਾਰਤ ਦੀਆਂ ਸਾਰੀਆਂ ਫ਼ਸਲਾਂ: ਇੱਕੋ ਥਾਂ ਤੇ ਪੂਰੀ ਜਾਣਕਾਰੀ'
                : 'Every Major Indian Crop, In One Place'}
            </h1>

            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {language === 'hi'
                ? 'खरीफ, रबी, जायद और बागवानी की प्रमुख फसलों की किस्में, बुवाई समय, सिंचाई, खाद, रोग प्रबंधन, भंडारण नमी और प्रमुख मंडियाँ देखें।'
                : language === 'pa'
                ? 'ਖਰੀਫ, ਰਬੀ, ਜ਼ਾਇਦ ਅਤੇ ਬਾਗਬਾਨੀ ਦੀਆਂ ਫ਼ਸਲਾਂ ਦੀਆਂ ਕਿਸਮਾਂ, ਬਿਜਾਈ ਸਮਾਂ, ਸਿੰਚਾਈ, ਖਾਦ, ਰੋਗ ਅਤੇ ਮੰਡੀਆਂ ਬਾਰੇ ਜਾਣੋ।'
                : 'Complete agronomic & market dossiers across Cereals, Millets (Shri Anna), Pulses, Oilseeds, Fibre, Spices, Vegetables, and Fruits.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-surface border border-line shadow-subtle text-center">
              <div className="font-display font-extrabold text-xl text-canopy dark:text-canopy-bright tnum">
                {INDIAN_CROPS.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                {language === 'hi' ? 'फ़सलें' : language === 'pa' ? 'ਫ਼ਸਲਾਂ' : 'Crops'}
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-surface border border-line shadow-subtle text-center">
              <div className="font-display font-extrabold text-xl text-saffron tnum">
                {CROP_CATEGORIES.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                {language === 'hi' ? 'श्रेणियाँ' : language === 'pa' ? 'ਸ਼੍ਰੇਣੀਆਂ' : 'Groups'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search + Season & Category Filter Dock */}
      <section className="bg-surface rounded-3xl border border-line p-4 sm:p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass
              weight="bold"
              className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'फसल, किस्म, राज्य या मंडी खोजें (जैसे: जीरा, रागी, हल्दी, कपास)...'
                  : language === 'pa'
                  ? 'ਫ਼ਸਲ, ਕਿਸਮ, ਰਾਜ ਜਾਂ ਮੰਡੀ ਖੋਜੋ (ਜਿਵੇਂ: ਜ਼ੀਰਾ, ਰਾਗੀ, ਹਲਦੀ)...'
                  : 'Search any crop, variety, state, or mandi (e.g. Turmeric, Ragi, Unjha, HD-3086)...'
              }
              aria-label="Search Indian crops"
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-2xl bg-surface-subtle border border-line text-xs sm:text-sm text-ink placeholder-ink-subtle focus:border-canopy-bright focus:ring-2 focus:ring-canopy-bright/20 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-ink-muted hover:text-ink cursor-pointer"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Season Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSeason('ALL')}
              className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                selectedSeason === 'ALL'
                  ? 'bg-canopy text-white border-canopy shadow-subtle'
                  : 'bg-surface-subtle text-ink-muted border-line hover:text-ink'
              }`}
            >
              {language === 'hi' ? 'सभी सीजन' : language === 'pa' ? 'ਸਾਰੇ ਸੀਜ਼ਨ' : 'All Seasons'}
            </button>
            {CROP_SEASONS.map((season) => (
              <button
                key={season}
                type="button"
                onClick={() => setSelectedSeason(season)}
                className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedSeason === season
                    ? 'bg-canopy text-white border-canopy shadow-subtle'
                    : 'bg-surface-subtle text-ink-muted border-line hover:text-ink'
                }`}
              >
                {season}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-line">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-saffron-soft text-saffron-ink dark:text-saffron border-saffron/30 font-bold'
                : 'bg-surface-subtle text-ink-muted border-line hover:text-ink'
            }`}
          >
            {language === 'hi' ? 'सभी फसल श्रेणियाँ' : language === 'pa' ? 'ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ' : 'All Categories'} ({INDIAN_CROPS.length})
          </button>
          {CROP_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-saffron-soft text-saffron-ink dark:text-saffron border-saffron/30 font-bold'
                  : 'bg-surface-subtle text-ink-muted border-line hover:text-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Crop Grid */}
      {filteredCrops.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-line p-8">
          <EmptyState
            title={language === 'hi' ? 'कोई फसल नहीं मिली' : 'No matching crop found'}
            description={
              language === 'hi'
                ? 'कृपया खोज शब्द बदलें या सभी श्रेणियाँ चुनें।'
                : 'Try clearing filters or searching by English/Hindi name, variety, or state.'
            }
          />
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCrops.map((crop) => (
            <motion.button
              key={crop.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => openCropDossier(crop)}
              className="text-left bg-surface rounded-3xl border border-line p-5 shadow-subtle hover:border-canopy/40 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-ink group-hover:text-canopy dark:group-hover:text-canopy-bright transition-colors">
                      {getCropTitle(crop)}
                    </h2>
                    <div className="text-xs text-ink-muted">
                      {language === 'en' ? `${crop.nameHi} · ${crop.namePa}` : crop.nameEn}{' '}
                      <span className="italic text-ink-subtle">({crop.scientificName})</span>
                    </div>
                  </div>
                  <Badge label={crop.season} variant={seasonBadgeVariant(crop.season)} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle border border-line text-ink-muted">
                    {crop.category}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle border border-line text-ink-muted">
                    {crop.durationDays}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-ink-muted pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright shrink-0" />
                    <span className="truncate">
                      <strong className="text-ink">Sowing:</strong> {crop.sowingWindow}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin weight="duotone" className="w-3.5 h-3.5 text-saffron shrink-0" />
                    <span className="truncate">
                      <strong className="text-ink">States:</strong> {crop.majorStates.slice(0, 3).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-canopy dark:text-canopy-bright">
                <span>
                  {language === 'hi' ? 'संपूर्ण विवरण देखें' : language === 'pa' ? 'ਪੂਰਾ ਵੇਰਵਾ ਵੇਖੋ' : 'Open Full Dossier'}
                </span>
                <ArrowRight weight="bold" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </section>
      )}

      {/* Full Crop Dossier Dialog */}
      <Dialog
        isOpen={activeCrop !== null}
        onOpenChange={(open) => {
          if (!open) closeCropDossier();
        }}
        purpose="info"
        width={680}
      >
        {activeCrop && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <DialogHeader
              title={`${getCropTitle(activeCrop)} — ${activeCrop.nameEn}`}
              subtitle={`${activeCrop.scientificName} · ${activeCrop.category} · ${activeCrop.season} (${activeCrop.durationDays})`}
              onOpenChange={(open) => {
                if (!open) closeCropDossier();
              }}
            />

            {/* Quick Facts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-surface-subtle border border-line space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  <Calendar weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                  <span>Sowing & Harvest</span>
                </div>
                <p className="text-ink font-medium">
                  <strong>Sow:</strong> {activeCrop.sowingWindow}
                </p>
                <p className="text-ink font-medium">
                  <strong>Harvest:</strong> {activeCrop.harvestWindow}
                </p>
                <p className="text-ink-muted">
                  <strong>Seed Rate:</strong> {activeCrop.seedRate}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-subtle border border-line space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  <Thermometer weight="duotone" className="w-3.5 h-3.5 text-saffron" />
                  <span>Soil & Climate</span>
                </div>
                <p className="text-ink font-medium">{activeCrop.soil}</p>
                <p className="text-ink-muted">
                  <strong>pH:</strong> {activeCrop.phRange} · <strong>Temp:</strong> {activeCrop.tempRange}
                </p>
              </div>
            </div>

            {/* Varieties & Producing Regions */}
            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-line space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <SunHorizon weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                <span>Recommended Varieties & Key Indian Mandis</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeCrop.varieties.map((v) => (
                  <Badge key={v} label={v} variant="success" />
                ))}
              </div>
              <p className="text-ink-muted pt-1">
                <strong className="text-ink">Major States:</strong> {activeCrop.majorStates.join(', ')}
              </p>
              <p className="text-ink-muted">
                <strong className="text-ink">Key Mandis:</strong> {activeCrop.keyMandis.join(' · ')}
              </p>
            </div>

            {/* Agronomic Practice Details */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl border border-line bg-surface space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <Drop weight="duotone" className="w-4 h-4 text-blue-500" />
                  <span>Irrigation Schedule</span>
                </div>
                <p className="text-ink-muted leading-relaxed">{activeCrop.irrigation}</p>
              </div>

              <div className="p-3.5 rounded-2xl border border-line bg-surface space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <Flask weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
                  <span>Fertilizer & Soil Nutrition (NPK)</span>
                </div>
                <p className="text-ink-muted leading-relaxed">{activeCrop.fertilizerNPK}</p>
              </div>

              <div className="p-3.5 rounded-2xl border border-saffron/30 bg-saffron-soft/40 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <Bug weight="duotone" className="w-4 h-4 text-saffron" />
                  <span>Pest & Disease Advisory</span>
                </div>
                <p className="text-ink leading-relaxed">{activeCrop.pestsAndDiseases}</p>
              </div>

              <div className="p-3.5 rounded-2xl border border-line bg-surface space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <Warehouse weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />
                  <span>Storage & Market Note</span>
                </div>
                <p className="text-ink-muted leading-relaxed">
                  <strong className="text-ink">Safe Storage:</strong> {activeCrop.storageMoisture}
                </p>
                <p className="text-ink-muted leading-relaxed">
                  <strong className="text-ink">Market / MSP:</strong> {activeCrop.marketNote}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-line">
              <div className="flex-1">
                <Button
                  label={
                    language === 'hi'
                      ? `${activeCrop.nameHi} के बारे में AI से पूछें`
                      : `Ask Voice AI about ${activeCrop.nameEn}`
                  }
                  variant="primary"
                  size="lg"
                  width="100%"
                  icon={<Microphone weight="duotone" className="w-4 h-4" />}
                  onClick={() => {
                    const q = `Tell me about ${activeCrop.nameEn}`;
                    closeCropDossier();
                    navigate(`/?q=${encodeURIComponent(q)}`);
                  }}
                />
              </div>
              {activeCrop.commodityCode && (
                <Button
                  label={language === 'hi' ? 'लाइव मंडी भाव देखें' : 'Check Live Mandi Prices'}
                  variant="secondary"
                  size="lg"
                  icon={<TrendUp weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright" />}
                  onClick={() => {
                    const code = activeCrop.commodityCode!;
                    closeCropDossier();
                    navigate(`/prices?commodity=${encodeURIComponent(code)}`);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

