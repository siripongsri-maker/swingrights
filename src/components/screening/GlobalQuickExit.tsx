import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QuickExit } from './QuickExit';

/** Quick Exit on every screen (public + staff). Staff screens do not wipe the local draft vault. */
export function GlobalQuickExit() {
  const { pathname } = useLocation();
  const isStaff = pathname.startsWith('/admin');
  // Lets public-only type styles skip staff screens
  useEffect(() => { document.body.dataset.area = isStaff ? 'admin' : 'public'; }, [isStaff]);
  return <QuickExit wipeDraft={!isStaff} />;
}
