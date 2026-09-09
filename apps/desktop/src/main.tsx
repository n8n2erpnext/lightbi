import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { getOrCreateInstallationId, pairLightBIInstallation } from './lib/distribution-pairing';
import { isNativeLightBI, startNativeInstallationTrustRecovery } from './lib/native-runtime';
import { startAppUsageTelemetry } from './lib/app-usage-telemetry';
import { startMicroBrainContributionLoop } from './lib/micro-brain-learning-contribution';
import { installNativeExternalLinkGuard } from './lib/native-capabilities';
import { useIntelligencePackStore } from './stores/intelligence-pack-store';
import './index.css';

document.title = window.location.pathname.startsWith('/app') ? 'LightBI — Live Demo' : 'LightBI Desktop';

async function startLightBI() {
  if (isNativeLightBI()) {
    await useIntelligencePackStore.getState().bootstrap();
    const installationId = getOrCreateInstallationId();
    void pairLightBIInstallation();
    startNativeInstallationTrustRecovery(installationId);
    startAppUsageTelemetry();
    startMicroBrainContributionLoop();
    installNativeExternalLinkGuard();
    void useIntelligencePackStore.getState().check();
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

void startLightBI();
