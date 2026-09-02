import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { pairLightBIInstallation } from './lib/distribution-pairing';
import { isNativeLightBI } from './lib/native-runtime';
import { startAppUsageTelemetry } from './lib/app-usage-telemetry';
import { installNativeExternalLinkGuard } from './lib/native-capabilities';
import './index.css';

document.title = window.location.pathname.startsWith('/app') ? 'LightBI — Live Demo' : 'LightBI Desktop';

if (isNativeLightBI()) {
  void pairLightBIInstallation();
  startAppUsageTelemetry();
  installNativeExternalLinkGuard();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
