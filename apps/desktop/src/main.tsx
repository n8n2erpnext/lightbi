import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { getOrCreateInstallationId, pairLightBIInstallation } from './lib/distribution-pairing';
import { ensureNativeInstallationTrust, isNativeLightBI } from './lib/native-runtime';
import { startAppUsageTelemetry } from './lib/app-usage-telemetry';
import { installNativeExternalLinkGuard } from './lib/native-capabilities';
import './index.css';

document.title = window.location.pathname.startsWith('/app') ? 'LightBI — Live Demo' : 'LightBI Desktop';

if (isNativeLightBI()) {
  const installationId = getOrCreateInstallationId();
  void pairLightBIInstallation();
  if (import.meta.env.VITE_LIGHTBI_CHANNEL === 'internal') {
    void ensureNativeInstallationTrust(installationId);
  }
  startAppUsageTelemetry();
  installNativeExternalLinkGuard();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
