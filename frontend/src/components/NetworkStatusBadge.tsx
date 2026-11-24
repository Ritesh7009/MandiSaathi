import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';

export const NetworkStatusBadge: React.FC = () => {
  const { isOnline } = useNetwork();
  const { t } = useLanguage();

  if (isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-canopy-soft text-canopy dark:text-canopy-bright border border-canopy/20"
        title="Network Online · Backend Connected"
        data-testid="network-status-online"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-canopy-bright animate-pulse" />
        <span className="hidden lg:inline">{t('connected')}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-saffron-soft text-saffron-ink dark:text-saffron border border-saffron/30"
      title="Offline Mode · Serving Cached Mandi Data"
      data-testid="network-status-offline"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-saffron" />
      <span>{t('offline')}</span>
    </div>
  );
};
