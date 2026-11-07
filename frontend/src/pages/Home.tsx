import React, { useState } from 'react';
import { HealthBanner } from '../components/HealthBanner';
import { VoiceDiagnostic } from '../components/VoiceDiagnostic';
import { CommoditiesView } from '../components/CommoditiesView';
import { MandisView } from '../components/MandisView';
import { useLanguage } from '../context/LanguageContext';
import { Wheat, Landmark, Layers } from 'lucide-react';

export const Home: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'commodities' | 'mandis'>('all');

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Real-time Health and Connection Banner */}
      <HealthBanner />

      {/* Voice Engine Diagnostics (Mic permission & stream tester) */}
      <VoiceDiagnostic />

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-ivory-dark mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-forest text-forest bg-forest-50/50'
              : 'border-transparent text-charcoal-muted hover:text-charcoal hover:border-ivory-dark'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('commodities')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'commodities'
              ? 'border-forest text-forest bg-forest-50/50'
              : 'border-transparent text-charcoal-muted hover:text-charcoal hover:border-ivory-dark'
          }`}
        >
          <Wheat className="w-4 h-4" />
          <span>{t('commodities')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mandis')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'mandis'
              ? 'border-forest text-forest bg-forest-50/50'
              : 'border-transparent text-charcoal-muted hover:text-charcoal hover:border-ivory-dark'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>{t('mandis')}</span>
        </button>
      </div>

      {/* Views rendering based on active tab */}
      {(activeTab === 'all' || activeTab === 'commodities') && <CommoditiesView />}
      {(activeTab === 'all' || activeTab === 'mandis') && <MandisView />}
    </main>
  );
};

