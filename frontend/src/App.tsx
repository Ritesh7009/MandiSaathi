import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';

// Screen Pages
import { Home } from './pages/Home';
import { VoiceAssistant } from './pages/VoiceAssistant';
import { PriceIntelligence } from './pages/PriceIntelligence';
import { MandiComparison } from './pages/MandiComparison';
import { GovernmentSchemes } from './pages/GovernmentSchemes';
import { ComplaintRegistration } from './pages/ComplaintRegistration';
import { Settings } from './pages/Settings';
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
      <LanguageProvider>
        <BrowserRouter>
          <div className="flex min-h-screen bg-ivory font-sans text-charcoal">
            {/* Desktop Left Sidebar */}
            <Sidebar />

            {/* Main Content Viewport */}
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/assistant" element={<VoiceAssistant />} />
                  <Route path="/prices" element={<PriceIntelligence />} />
                  <Route path="/compare" element={<MandiComparison />} />
                  <Route path="/schemes" element={<GovernmentSchemes />} />
                  <Route path="/complaints" element={<ComplaintRegistration />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>

            {/* Mobile Thumb-Zone Bottom Navigation */}
            <MobileBottomNav />
          </div>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
};
