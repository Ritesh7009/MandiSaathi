import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { Wheat, Filter } from 'lucide-react';

export const CommoditiesView: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: commodities, isLoading, error, refetch } = useQuery({
    queryKey: ['commodities', selectedCategory],
    queryFn: () => api.getCommodities(selectedCategory || undefined),
  });

  const categories = [
    { key: '', label: t('allCategories') },
    { key: 'CEREALS', label: language === 'hi' ? 'अनाज (Cereals)' : language === 'pa' ? 'ਅਨਾਜ (Cereals)' : 'Cereals' },
    { key: 'OILSEEDS', label: language === 'hi' ? 'तिलहन (Oilseeds)' : language === 'pa' ? 'ਤੇਲ ਬੀਜ (Oilseeds)' : 'Oilseeds' },
    { key: 'PULSES', label: language === 'hi' ? 'दलहन (Pulses)' : language === 'pa' ? 'ਦਾਲਾਂ (Pulses)' : 'Pulses' },
    { key: 'VEGETABLES', label: language === 'hi' ? 'सब्जियां (Vegetables)' : language === 'pa' ? 'ਸਬਜ਼ੀਆਂ (Vegetables)' : 'Vegetables' },
    { key: 'FIBRES', label: language === 'hi' ? 'रेशा (Fibres)' : language === 'pa' ? 'ਰੇਸ਼ਾ (Fibres)' : 'Fibres' },
  ];

  return (
    <div className="bg-white border border-ivory-dark rounded-md p-5 mb-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-ivory-dark gap-3">
        <div className="flex items-center space-x-2.5">
          <Wheat className="w-5 h-5 text-forest" />
          <h2 className="text-base font-bold text-charcoal">{t('commodities')}</h2>
          {commodities && (
            <span className="text-xs bg-forest-50 text-forest font-semibold px-2 py-0.5 rounded border border-forest/20">
              {commodities.length}
            </span>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-charcoal-muted mr-1 hidden sm:inline" />
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 text-xs rounded font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-forest text-white'
                    : 'bg-ivory text-charcoal hover:bg-ivory-dark'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingSpinner message={t('loading')} />}
      {error && <ErrorMessage message={error.message} onRetry={() => refetch()} />}

      {commodities && commodities.length === 0 && (
        <p className="text-center py-8 text-sm text-charcoal-muted">{t('noData')}</p>
      )}

      {commodities && commodities.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-ivory-dark text-charcoal-muted uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">English</th>
                <th className="py-2.5 px-3 font-hindi">हिन्दी</th>
                <th className="py-2.5 px-3 font-punjabi">ਪੰਜਾਬੀ</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">{t('unit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-dark/60">
              {commodities.map((item) => (
                <tr key={item.id} className="hover:bg-ivory/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-forest-dark">{item.code}</td>
                  <td className="py-2.5 px-3 font-medium text-charcoal">{item.nameEn}</td>
                  <td className="py-2.5 px-3 font-hindi text-charcoal">{item.nameHi}</td>
                  <td className="py-2.5 px-3 font-punjabi text-charcoal">{item.namePa || '—'}</td>
                  <td className="py-2.5 px-3 text-charcoal-muted">
                    <span className="bg-ivory px-2 py-0.5 rounded text-[11px] font-medium border border-ivory-dark">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-charcoal-muted">{item.defaultUnit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

