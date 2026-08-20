export function getApiBaseUrl(): string {
  const envVal = import.meta.env.VITE_API_BASE_URL;
  if (typeof envVal === 'string' && envVal.trim() !== '') {
    return envVal.trim();
  }
  if (typeof window !== 'undefined' && isNativeWebview(window)) {
    // Tauri maps custom protocols to http://<scheme>.localhost on Windows
    // (and Android). Calling lightbi:// directly from WebView2 causes fetch()
    // to fail before the request reaches the embedded Axum router.
    if (window.location.protocol === 'http:' && window.location.hostname === 'tauri.localhost') {
      return 'http://lightbi.localhost';
    }
    return 'lightbi://localhost';
  }
  // Same-origin keeps credentials and API traffic behind the dev/prod reverse proxy.
  return typeof window === 'undefined' ? 'http://localhost:5172' : window.location.origin;
}

function isNativeWebview(browserWindow: Window): boolean {
  // Tauri's bridge may be injected after the first React render. The packaged
  // Windows WebView origin is stable and lets early API calls reach the embedded
  // core instead of accidentally fetching the bundled index.html.
  return '__TAURI_INTERNALS__' in browserWindow
    || browserWindow.location.protocol === 'tauri:'
    || browserWindow.location.hostname === 'tauri.localhost';
}
