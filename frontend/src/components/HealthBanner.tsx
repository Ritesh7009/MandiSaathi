import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, Server, Mic } from 'lucide-react';

export const HealthBanner: React.FC = () => {
  const { t } = useLanguage();

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: api.checkHealth,
    refetchInterval: 30000,
  });

  const isOnline = data?.status === 'UP';
  const isDegraded = data?.status === 'DEGRADED';
  const dbOk = data?.services.database.status === 'UP';

  return (
    <div className="bg-white border border-ivory-dark rounded-md p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-ivory-dark gap-3">
        <div className="flex items-center space-x-2.5">
          {isLoading ? (
            <span className="w-3 h-3 rounded-full bg-harvest animate-pulse" />
          ) : isOnline ? (
            <CheckCircle2 className="w-5 h-5 text-forest" />
          ) : isDegraded ? (
            <AlertTriangle className="w-5 h-5 text-harvest-dark" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="font-semibold text-charcoal text-sm">
            {t('systemHealth')}:{' '}
            <span
              className={
                isOnline ? 'text-forest font-bold' : isDegraded ? 'text-harvest-dark font-bold' : 'text-red-600 font-bold'
              }
            >
              {isOnline ? t('connected') : isDegraded ? t('degraded') : t('offline')}
            </span>
          </span>
          {data?.version && (
            <span className="text-xs text-charcoal-muted bg-ivory px-2 py-0.5 rounded font-mono">
              v{data.version}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-forest-dark bg-ivory hover:bg-ivory-dark/70 rounded transition-colors self-start sm:self-auto disabled:opacity-50"
          title="Query backend health endpoint"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Grid of subsystem checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Backend service */}
        <div className="flex items-start space-x-3 text-xs">
          <Server className="w-4 h-4 text-forest mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-charcoal">{t('backendStatus')}</div>
            <div className="text-charcoal-muted">
              {error ? 'Unreachable' : isLoading ? 'Checking...' : `Active (${data?.environment || 'dev'})`}
            </div>
          </div>
        </div>

        {/* Database service */}
        <div className="flex items-start space-x-3 text-xs">
          <Database className="w-4 h-4 text-forest mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-charcoal">{t('databaseStatus')}</div>
            <div className="text-charcoal-muted">
              {error ? 'Unreachable' : isLoading ? 'Checking...' : dbOk ? 'PostgreSQL 16 (Connected)' : 'Disconnected'}
            </div>
          </div>
        </div>

        {/* Gnani Voice */}
        <div className="flex items-start space-x-3 text-xs">
          <Mic className="w-4 h-4 text-forest mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-charcoal">{t('gnaniStatus')}</div>
            <div className="text-charcoal-muted">Prisma STT / Timbre TTS Interface</div>
          </div>
        </div>
      </div>
    </div>
  );
};

