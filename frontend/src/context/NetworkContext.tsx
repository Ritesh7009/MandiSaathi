import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface NetworkContextValue {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  wasOffline: false,
  lastOnlineAt: null,
  checkConnection: async () => true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(() => (isOnline ? new Date() : null));

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    try {
      // Lightweight probe to actuator health or head
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/actuator/health`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const contentType = res.headers.get('content-type') || '';
      let isHealthyBackend = false;
      if (res.ok && contentType.includes('application/json')) {
        try {
          const data = await res.json();
          isHealthyBackend = Boolean(data && (data.status === 'UP' || typeof data === 'object'));
        } catch {
          isHealthyBackend = false;
        }
      }
      setIsOnline(isHealthyBackend);
      if (isHealthyBackend) {
        setLastOnlineAt(new Date());
      }
      return isHealthyBackend;
    } catch {
      // If probe fails while navigator says offline, mark offline
      if (!navigator.onLine) {
        setIsOnline(false);
        return false;
      }
      return isOnline;
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[MandiSaathi Network] Network restored (online)');
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      console.log('[MandiSaathi Network] Network lost (offline)');
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, wasOffline, lastOnlineAt, checkConnection }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
