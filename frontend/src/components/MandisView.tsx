import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { Landmark, MapPin } from 'lucide-react';

export const MandisView: React.FC = () => {
  const { t } = useLanguage();
  const [selectedState, setSelectedState] = useState<string>('');

  const { data: mandis, isLoading, error, refetch } = useQuery({
    queryKey: ['mandis', selectedState],
    queryFn: () => api.getMandis(selectedState || undefined),
  });

  const states = [
    '',
    'Punjab',
    'Haryana',
    'Rajasthan',
    'Madhya Pradesh',
    'Maharashtra',
    'Uttar Pradesh',
    'Delhi',
  ];

  return (
    <div className="bg-white border border-ivory-dark rounded-md p-5 mb-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-ivory-dark gap-3">
        <div className="flex items-center space-x-2.5">
          <Landmark className="w-5 h-5 text-forest" />
          <h2 className="text-base font-bold text-charcoal">{t('mandis')}</h2>
          {mandis && (
            <span className="text-xs bg-forest-50 text-forest font-semibold px-2 py-0.5 rounded border border-forest/20">
              {mandis.length}
            </span>
          )}
        </div>

        {/* State Filter */}
        <div className="flex items-center space-x-2">
          <label htmlFor="state-filter" className="text-xs font-medium text-charcoal-muted">
            {t('state')}:
          </label>
          <select
            id="state-filter"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="text-xs bg-ivory border border-ivory-dark rounded px-2.5 py-1 text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
          >
            <option value="">{t('allStates')}</option>
            {states.filter(Boolean).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingSpinner message={t('loading')} />}
      {error && <ErrorMessage message={error.message} onRetry={() => refetch()} />}

      {mandis && mandis.length === 0 && (
        <p className="text-center py-8 text-sm text-charcoal-muted">{t('noData')}</p>
      )}

      {mandis && mandis.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-ivory-dark text-charcoal-muted uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Mandi Name (EN)</th>
                <th className="py-2.5 px-3 font-hindi">मंडी (HI)</th>
                <th className="py-2.5 px-3 font-punjabi">ਮੰਡੀ (PA)</th>
                <th className="py-2.5 px-3">{t('state')} / {t('district')}</th>
                <th className="py-2.5 px-3 text-right">Coordinates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-dark/60">
              {mandis.map((mandi) => (
                <tr key={mandi.id} className="hover:bg-ivory/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-forest-dark">{mandi.code}</td>
                  <td className="py-2.5 px-3 font-medium text-charcoal">{mandi.nameEn}</td>
                  <td className="py-2.5 px-3 font-hindi text-charcoal">{mandi.nameHi}</td>
                  <td className="py-2.5 px-3 font-punjabi text-charcoal">{mandi.namePa || '—'}</td>
                  <td className="py-2.5 px-3 text-charcoal-muted">
                    <span className="font-medium text-charcoal">{mandi.district}</span>, {mandi.state}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-charcoal-muted">
                    {mandi.latitude && mandi.longitude ? (
                      <span className="inline-flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-forest inline" />
                        <span>{mandi.latitude.toFixed(2)}°, {mandi.longitude.toFixed(2)}°</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

