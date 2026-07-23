/** Loads the Google Identity Services script once and resolves when ready. */

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let loadPromise: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}
