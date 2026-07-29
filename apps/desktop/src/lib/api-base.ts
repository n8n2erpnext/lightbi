export function getApiBaseUrl(): string {
  const envVal = import.meta.env.VITE_API_BASE_URL;
  if (envVal !== undefined) {
    return envVal;
  }
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return 'http://127.0.0.1:5172';
  }
  // Same-origin keeps credentials and API traffic behind the dev/prod reverse proxy.
  return typeof window === 'undefined' ? 'http://localhost:5172' : window.location.origin;
}
