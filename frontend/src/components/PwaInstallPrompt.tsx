import React, { useState, useEffect } from 'react';
import { subscribeToInstallPrompt, promptPwaInstall, isAppInstalled } from '../pwa';
import { useLanguage } from '../context/LanguageContext';

export const PwaInstallPrompt: React.FC = () => {
  const { t } = useLanguage();
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // If running in standalone PWA, never show install prompt
    if (isAppInstalled()) {
      return;
    }

    const previouslyDismissed = localStorage.getItem('mandisaathi_pwa_dismissed') === 'true';
    setDismissed(previouslyDismissed);

    const unsubscribe = subscribeToInstallPrompt((installable) => {
      setCanInstall(installable);
    });

    return unsubscribe;
  }, []);

  const handleInstall = async () => {
    const success = await promptPwaInstall();
    if (success) {
      setCanInstall(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('mandisaathi_pwa_dismissed', 'true');
  };

  if (!canInstall || dismissed) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Install MandiSaathi application"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-forest text-ivory rounded-2xl p-4 shadow-xl border border-gold/30 flex flex-col gap-3 animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
          <img src="/pwa-192x192.png" alt="MandiSaathi" className="w-7 h-7 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-ivory">{t('installAppTitle')}</h4>
          <p className="text-xs text-ivory/80 leading-relaxed mt-0.5">
            {t('installAppSubtitle')}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-ivory/60 hover:text-ivory p-1 -mr-1"
          aria-label={t('dismissBtnText')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleInstall}
          className="flex-1 bg-gold hover:bg-gold-dark text-forest font-semibold text-xs py-2 px-3 rounded-lg shadow-sm transition-colors text-center"
        >
          {t('installBtnText')}
        </button>
        <button
          onClick={handleDismiss}
          className="bg-white/10 hover:bg-white/15 text-ivory/90 text-xs py-2 px-3 rounded-lg transition-colors"
        >
          {t('dismissBtnText')}
        </button>
      </div>
    </div>
  );
};
