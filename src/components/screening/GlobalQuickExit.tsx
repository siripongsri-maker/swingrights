import { useLocation } from 'react-router-dom';
import { QuickExit } from './QuickExit';

/** Quick Exit on every screen (public + staff). Staff screens do not wipe the local draft vault. */
export function GlobalQuickExit() {
  const { pathname } = useLocation();
  const isStaff = pathname.startsWith('/admin');
  return <QuickExit wipeDraft={!isStaff} />;
}
