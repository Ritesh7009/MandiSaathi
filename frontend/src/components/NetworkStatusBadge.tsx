import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';

export const NetworkStatusBadge: React.FC = () => {
  const { isOnline } = useNetwork();
  const { t } = useLanguage();

  if (isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-forest-50 text-forest border border-forest/20 shadow-subtle"
        title="Live APMC Network Connected"
        data-testid="network-status-online"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
        <span className="hidden sm:inline font-medium">{t('connected')}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-subtle"
      title="Operating in Offline Mode — Serving Cached Mandi Data"
      data-testid="network-status-offline"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
      <span>{t('offline')}</span>
    </div>
  );
};
