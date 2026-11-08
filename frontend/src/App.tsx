import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import { NetworkProvider } from './context/NetworkContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

// Primary & Secondary Destination Pages
import { Home } from './pages/Home';
import { PriceIntelligence } from './pages/PriceIntelligence';
import { MandiComparison } from './pages/MandiComparison';
import { More } from './pages/More';
import { NotFound } from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <LanguageProvider>
          <BrowserRouter>
            <div className="flex min-h-screen bg-ivory font-sans text-charcoal">
              {/* Desktop Compact 4-Destination Sidebar */}
              <Sidebar />

              {/* Main Content Viewport */}
              <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-8">
                  <Routes>
                    {/* Primary 4 Destinations */}
                    <Route path="/" element={<Home />} />
                    <Route path="/prices" element={<PriceIntelligence />} />
                    <Route path="/compare" element={<MandiComparison />} />
                    <Route path="/more" element={<More />} />

                    {/* Preserved Backward-Compatible Deep Links */}
                    <Route path="/assistant" element={<Home />} />
                    <Route path="/voice" element={<Home />} />
                    <Route path="/schemes" element={<More defaultTab="schemes" />} />
                    <Route path="/complaints" element={<More defaultTab="complaints" />} />
                    <Route path="/settings" element={<More defaultTab="settings" />} />

                    {/* Fallback Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>

              {/* Mobile 4-Item Thumb-Zone Navigation */}
              <MobileBottomNav />

              {/* PWA Floating Install Prompt */}
              <PwaInstallPrompt />
            </div>
          </BrowserRouter>
        </LanguageProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
};
