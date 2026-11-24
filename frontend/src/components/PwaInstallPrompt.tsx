import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DownloadSimple } from '@phosphor-icons/react';
import { subscribeToInstallPrompt, promptPwaInstall, isAppInstalled } from '../pwa';
import { useLanguage } from '../context/LanguageContext';

export const PwaInstallPrompt: React.FC = () => {
  const { t } = useLanguage();
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isAppInstalled()) return;
    const previouslyDismissed = localStorage.getItem('mandisaathi_pwa_dismissed') === 'true';
    setDismissed(previouslyDismissed);

    return subscribeToInstallPrompt((installable) => {
      setCanInstall(installable);
    });
  }, []);

  const handleInstall = async () => {
    const success = await promptPwaInstall();
    if (success) setCanInstall(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('mandisaathi_pwa_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {canInstall && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          role="banner"
          aria-label="Install MandiSaathi application"
          className="fixed bottom-24 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-canopy-deep text-white rounded-2xl p-4 shadow-dock border border-canopy-bright/30 flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-saffron/20 border border-saffron/40 flex items-center justify-center shrink-0">
              <img src="/pwa-192x192.png" alt="MandiSaathi" className="w-7 h-7 rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display text-sm font-semibold text-white">{t('installAppTitle')}</h4>
              <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                {t('installAppSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={t('dismissBtnText')}
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center space-x-1.5 bg-saffron hover:brightness-105 text-[#0d1f17] font-bold text-xs py-2.5 px-3 rounded-xl shadow-subtle transition-all cursor-pointer"
            >
              <DownloadSimple weight="bold" className="w-4 h-4" />
              <span>{t('installBtnText')}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
            >
              {t('dismissBtnText')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
