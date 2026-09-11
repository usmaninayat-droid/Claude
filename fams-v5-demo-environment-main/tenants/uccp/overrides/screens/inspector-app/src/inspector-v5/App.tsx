import { useIsMobile } from './hooks/useIsMobile';
import { TabletShell } from './shell/TabletShell';
import { MobileShell } from './mobile/MobileShell';

export default function App() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileShell /> : <TabletShell />;
}
