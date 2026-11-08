import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';

export const NetworkStatusBadge: React.FC = () => {
  const { isOnline } = useNetwork();
  const { t } = useLanguage();

  if (isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm"
        title="Live APMC Network Connected"
        data-testid="network-status-online"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline">{t('connected')}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
      title="Operating in Offline Mode — Serving Cached Mandi Data"
      data-testid="network-status-offline"
    >
      <svg
        className="w-3.5 h-3.5 text-amber-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-6.364m2.828 6.364L3 21m0-18l18 18"
        />
      </svg>
      <span>{t('offline')}</span>
    </div>
  );
};
