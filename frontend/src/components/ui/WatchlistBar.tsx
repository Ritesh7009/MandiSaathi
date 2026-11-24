import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Bell, BellSlash, X, MapPin, Plant } from '@phosphor-icons/react';
import {
  getSavedCrops,
  toggleSavedCrop,
  getSavedMandis,
  toggleSavedMandi,
  getPriceAlertSettings,
  updatePriceAlertSettings,
} from '../../services/watchlistService';
import { useLanguage } from '../../context/LanguageContext';
import { PriceRecord } from '../../types';

interface WatchlistBarProps {
  priceRecords?: PriceRecord[];
  onSelectCommodity?: (code: string) => void;
  onSelectMandi?: (code: string) => void;
}

export const WatchlistBar: React.FC<WatchlistBarProps> = ({
  priceRecords = [],
  onSelectCommodity,
  onSelectMandi,
}) => {
  const { language, t, getCommodityName, getMandiName } = useLanguage();
  const [savedCrops, setSavedCrops] = useState<string[]>([]);
  const [savedMandis, setSavedMandis] = useState<string[]>([]);
  const [alertSettings, setAlertSettings] = useState(getPriceAlertSettings());

  const refreshWatchlist = () => {
    setSavedCrops(getSavedCrops());
    setSavedMandis(getSavedMandis());
    setAlertSettings(getPriceAlertSettings());
  };

  useEffect(() => {
    refreshWatchlist();
    const handleWatchlistChange = () => refreshWatchlist();
    window.addEventListener('mandisaathi:watchlist_changed', handleWatchlistChange);
    window.addEventListener('mandisaathi:alerts_changed', handleWatchlistChange);
    return () => {
      window.removeEventListener('mandisaathi:watchlist_changed', handleWatchlistChange);
      window.removeEventListener('mandisaathi:alerts_changed', handleWatchlistChange);
    };
  }, []);

  const handleToggleAlerts = () => {
    const next = updatePriceAlertSettings({ enabled: !alertSettings.enabled });
    setAlertSettings(next);
  };

  const getLatestPrice = (cropCode: string) => {
    return priceRecords.find((r) => r.commodityCode?.toUpperCase() === cropCode.toUpperCase());
  };

  return (
    <section
      aria-label="Farmer Watchlist and Price Alerts"
      className="relative overflow-hidden bg-surface rounded-3xl border border-line p-5 sm:p-6 shadow-subtle space-y-4 ms-card-interactive"
    >
      {/* Top subtle accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-canopy/60 via-saffron/60 to-canopy/60 opacity-75" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-saffron-soft border border-saffron/20 flex items-center justify-center shrink-0">
            <Star weight="fill" className="w-4 h-4 text-saffron" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-sm sm:text-base text-ink">
                {language === 'hi'
                  ? 'किसान वॉचलिस्ट एवं भाव अलर्ट'
                  : language === 'pa'
                  ? 'ਕਿਸਾਨ ਵਾਚਲਿਸਟ ਅਤੇ ਭਾਅ ਅਲਰਟ'
                  : 'Saved Watchlist & Price Alerts'}
              </h2>
              <span className="text-[11px] font-mono font-semibold bg-canopy-soft text-canopy dark:text-canopy-bright px-2.5 py-0.5 rounded-full border border-canopy/20">
                {savedCrops.length + savedMandis.length} {t('pinned') || 'Pinned'}
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              {language === 'hi'
                ? 'पिन की गई फसलों में नया भाव दर्ज होने पर तुरंत अलर्ट पाएं'
                : language === 'pa'
                ? 'ਪਿੰਨ ਕੀਤੀਆਂ ਫ਼ਸਲਾਂ ਦਾ ਨਵਾਂ ਭਾਅ ਆਉਣ ਤੇ ਤੁਰੰਤ ਅਲਰਟ ਪਾਓ'
                : 'One-tap filter & daily alert notifications for your priority crops and yards'}
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleToggleAlerts}
          className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
            alertSettings.enabled
              ? 'bg-canopy text-white border-canopy shadow-emeraldGlow'
              : 'bg-surface-subtle text-ink-muted border-line hover:text-ink'
          }`}
          title="Toggle daily morning price filing notifications"
        >
          {alertSettings.enabled ? (
            <Bell weight="fill" className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <BellSlash weight="duotone" className="w-3.5 h-3.5" />
          )}
          <span>
            {alertSettings.enabled
              ? language === 'hi'
                ? 'अलर्ट सक्रिय (दैनिक)'
                : language === 'pa'
                ? 'ਅਲਰਟ ਚਾਲੂ (ਰੋਜ਼ਾਨਾ)'
                : 'Daily Alerts Active'
              : language === 'hi'
              ? 'अलर्ट बंद'
              : language === 'pa'
              ? 'ਅਲਰਟ ਬੰਦ'
              : 'Alerts Paused'}
          </span>
        </motion.button>
      </div>

      {/* Two-row crisp pill layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
        {/* Saved Commodity Chips */}
        <div className="bg-surface-subtle/60 rounded-2xl p-3 border border-line flex items-center flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider mr-1">
            <Plant weight="duotone" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
            {language === 'hi' ? 'फसलें:' : language === 'pa' ? 'ਫ਼ਸਲਾਂ:' : 'Crops:'}
          </span>
          {savedCrops.map((cropCode) => {
            const latest = getLatestPrice(cropCode);
            return (
              <motion.div
                key={cropCode}
                whileHover={{ y: -1 }}
                className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-1.5 py-1 text-xs text-ink hover:border-canopy/40 shadow-subtle transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelectCommodity?.(cropCode)}
                  className="font-semibold hover:text-canopy dark:hover:text-canopy-bright cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>{getCommodityName(cropCode)}</span>
                  {latest && (
                    <span className="font-bold font-mono tnum text-canopy dark:text-canopy-bright bg-canopy-soft px-1.5 py-0.5 rounded-full text-[11px]">
                      ₹{Number(latest.modalPrice).toLocaleString('en-IN')}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSavedCrop(cropCode)}
                  aria-label={`Remove ${cropCode} from saved crops`}
                  className="p-1 rounded-full text-ink-muted hover:text-red-500 hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  <X weight="bold" className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}

          {savedCrops.length === 0 && (
            <span className="text-xs text-ink-muted italic">
              {language === 'hi'
                ? 'कोई पसंदीदा फसल नहीं चुनी गई।'
                : language === 'pa'
                ? 'ਕੋਈ ਪਸੰਦੀਦਾ ਫਸਲ ਨਹੀਂ ਚੁਣੀ।'
                : 'No crops pinned yet.'}
            </span>
          )}
        </div>

        {/* Saved Mandis Chips */}
        <div className="bg-surface-subtle/60 rounded-2xl p-3 border border-line flex items-center flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider mr-1">
            <MapPin weight="duotone" className="w-3.5 h-3.5 text-saffron" />
            {language === 'hi' ? 'मंडियां:' : language === 'pa' ? 'ਮੰਡੀਆਂ:' : 'Mandis:'}
          </span>
          {savedMandis.map((mandiCode) => (
            <motion.div
              key={mandiCode}
              whileHover={{ y: -1 }}
              className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-1.5 py-1 text-xs text-ink hover:border-canopy/40 shadow-subtle transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelectMandi?.(mandiCode)}
                className="font-semibold hover:text-canopy dark:hover:text-canopy-bright cursor-pointer"
              >
                {getMandiName(mandiCode)}
              </button>
              <button
                type="button"
                onClick={() => toggleSavedMandi(mandiCode)}
                aria-label={`Remove ${mandiCode} from saved mandis`}
                className="p-1 rounded-full text-ink-muted hover:text-red-500 hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                <X weight="bold" className="w-3 h-3" />
              </button>
            </motion.div>
          ))}

          {savedMandis.length === 0 && (
            <span className="text-xs text-ink-muted italic">
              {language === 'hi'
                ? 'कोई मंडी पिन नहीं की गई।'
                : language === 'pa'
                ? 'ਕੋਈ ਮੰਡੀ ਪਿੰਨ ਨਹੀਂ ਕੀਤੀ।'
                : 'No mandis pinned yet.'}
            </span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-line flex items-center justify-between flex-wrap gap-2 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-canopy-bright" />
          {language === 'hi'
            ? 'Agmarknet एवं राज्य मंडी बोर्ड के दैनिक बंद भाव से जुड़ा हुआ'
            : language === 'pa'
            ? 'Agmarknet ਅਤੇ ਰਾਜ ਮੰਡੀ ਬੋਰਡ ਦੇ ਰੋਜ਼ਾਨਾ ਭਾਅ ਨਾਲ ਜੁੜਿਆ'
            : 'Synced with daily Agmarknet & State Mandi Board auction filings'}
        </span>
        <span className="font-mono text-canopy dark:text-canopy-bright font-medium">
          Agmarknet Sync: 19:00 IST
        </span>
      </div>
    </section>
  );
};
