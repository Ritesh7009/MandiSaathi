import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { LanguageProvider } from './context/LanguageContext';
import { NetworkProvider } from './context/NetworkContext';
import { ThemeProvider } from './context/ThemeContext';
import { AstryxRootProvider } from './components/AstryxRootProvider';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { LoadingSpinner } from './components/LoadingSpinner';
import { TransitionPanel } from './components/ui/MotionPrimitives';
import { Home } from './pages/Home';
import { PriceIntelligence } from './pages/PriceIntelligence';
import { MandiComparison } from './pages/MandiComparison';
import { CropEncyclopedia } from './pages/CropEncyclopedia';
import { More } from './pages/More';

const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
  },
});

const AppShell: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-canvas font-sans text-ink">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:pb-12">
        <TransitionPanel activeKey={location.pathname}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/prices" element={<PriceIntelligence />} />
              <Route path="/compare" element={<MandiComparison />} />
              <Route path="/crops" element={<CropEncyclopedia />} />
              <Route path="/more" element={<More />} />

              {/* Backward-compatible deep links */}
              <Route path="/assistant" element={<Home />} />
              <Route path="/voice" element={<Home />} />
              <Route path="/schemes" element={<More defaultTab="schemes" />} />
              <Route path="/complaints" element={<More defaultTab="complaints" />} />
              <Route path="/settings" element={<More defaultTab="settings" />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TransitionPanel>
      </main>

      <Footer />
      <MobileBottomNav />
      <PwaInstallPrompt />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NetworkProvider>
            <LanguageProvider>
              <BrowserRouter>
              <AstryxRootProvider>
                <AppShell />
                </AstryxRootProvider>
            </BrowserRouter>
            </LanguageProvider>
          </NetworkProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
};
