/**
 * PWA Service Worker Registration & Install Prompt Management
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners: Array<(canInstall: boolean) => void> = [];

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[MandiSaathi PWA] Service Worker registered with scope:', registration.scope);

          // Check for waiting service worker
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[MandiSaathi PWA] New content available; background update ready.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[MandiSaathi PWA] Service Worker registration failed:', error);
        });
    });

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      notifyInstallListeners(true);
    });

    // Reset when appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('[MandiSaathi PWA] App was successfully installed');
      deferredPrompt = null;
      notifyInstallListeners(false);
    });
  }
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  installListeners.push(callback);
  callback(deferredPrompt !== null);
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx !== -1) installListeners.splice(idx, 1);
  };
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((listener) => listener(canInstall));
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyInstallListeners(false);
    return outcome === 'accepted';
  } catch (err) {
    console.warn('[MandiSaathi PWA] Prompt failed:', err);
    return false;
  }
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
