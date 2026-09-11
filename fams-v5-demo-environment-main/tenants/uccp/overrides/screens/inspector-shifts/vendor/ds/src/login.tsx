import { createRoot } from 'react-dom/client';
import { LoginScreen } from './components/auth';
import './styles.css';

/**
 * Standalone login preview — renders the platform sign-in full-screen so it can
 * be reviewed and screenshotted cleanly. Served at `/login.html`.
 */
const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(
  <LoginScreen onSubmit={(v) => console.log('login', v)} onForgotPassword={() => console.log('forgot')} />,
);
