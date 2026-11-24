import React from 'react';
import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { useLanguage } from '../context/LanguageContext';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 sm:p-5 my-4 text-red-900 dark:text-red-200">
      <div className="flex items-start space-x-3">
        <WarningCircle weight="duotone" className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-display text-sm font-semibold text-red-800 dark:text-red-300">{t('error')}</h4>
          <p className="text-xs text-red-700 dark:text-red-300/90 mt-1 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
              <span>{t('retry')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
