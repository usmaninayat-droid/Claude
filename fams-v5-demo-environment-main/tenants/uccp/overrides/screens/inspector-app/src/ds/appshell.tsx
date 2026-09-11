import { createRoot } from 'react-dom/client';
import { AppShell } from './components/app-shell';
import { smartCitiesApp } from './showcase/apps/smart-cities.config';
import { workshopApp } from './showcase/apps/workshop.config';
import { salesApp } from './showcase/apps/sales.config';
import { eadRmsApp } from './showcase/apps/ead-rms.config';
import { cementApp } from './showcase/apps/cement.config';
import { duconApp } from './showcase/apps/ducon.config';
import { generatorApp } from './showcase/apps/generator.config';
import './styles.css';

/**
 * Standalone, full-screen AppShell entry — renders ONLY the composed app shell
 * (no showcase chrome), so it can be reviewed and screenshotted cleanly.
 * Served at `/appshell.html`. Switch apps via the blue rail:
 * FAMS Smart Cities (every demo we built, from the block library) / Workshop
 * (Truemax) / Sales (Acme) / EAD RMS (navy) / Cement Delivery / Ducon (amber) /
 * Generator Monitoring (violet).
 */
const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(
  <AppShell apps={[smartCitiesApp, workshopApp, salesApp, eadRmsApp, cementApp, duconApp, generatorApp]} />
);
