import { ReactNode, createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FolderOpen, Users, BarChart3, Search, FileText, UserCog, Building2, History, ShieldCheck,
  Settings, LogOut, Menu, HeartHandshake, AlertTriangle, RotateCw, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccess, useRoleLabels } from '@/hooks/useAccess';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Item { to: string; label: string; icon: LucideIcon; count?: number; end?: boolean }

function useNavGroups() {
  const { t } = useI18n();
  const access = useAccess();
  // Same RPC the overview uses; only read for the open-case count badge.
  const openQ = useQuery({
    queryKey: ['overview', null, 30],
    enabled: access.isStaff,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_overview' as never, { _branch: null, _days: 30 } as never);
      if (error) throw error;
      return data as unknown as { open: number };
    },
  });
  const groups: { title: string; items: Item[] }[] = [
    {
      title: t('staff.group.cases'),
      items: [
        { to: '/admin', label: t('staff.nav.queue'), icon: Inbox, count: openQ.data?.open, end: true },
        { to: '/admin/cases', label: t('staff.nav.cases'), icon: FolderOpen },
        { to: '/admin/caseload', label: t('staff.nav.caseload'), icon: Users },
        { to: '/admin/overview', label: t('staff.nav.overview'), icon: BarChart3 },
      ],
    },
    {
      title: t('staff.group.tools'),
      items: [
        { to: '/admin/partner-search', label: t('staff.nav.partnerSearch'), icon: Search },
        ...(access.canManage ? [{ to: '/admin/report', label: t('staff.nav.report'), icon: FileText }] : []),
      ],
    },
  ];
  if (access.isAdmin) {
    groups.push({
      title: t('staff.group.admin'),
      items: [
        { to: '/admin/users', label: t('staff.nav.users'), icon: UserCog },
        { to: '/admin/partners', label: t('staff.nav.partners'), icon: Building2 },
        { to: '/admin/system', label: t('staff.nav.system'), icon: History },
        { to: '/admin/access-review', label: t('staff.nav.accessReview'), icon: ShieldCheck },
      ],
    });
  } else if (access.canManage) {
    groups[1].items.push({ to: '/admin/access-review', label: t('staff.nav.accessReview'), icon: ShieldCheck });
  }
  return groups;
}

function NavBody({ onPick }: { onPick?: () => void }) {
  const { t } = useI18n();
  const access = useAccess();
  const roleLabels = useRoleLabels();
  const navigate = useNavigate();
  const groups = useNavGroups();
  const logout = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };
  const linkCls = ({ isActive }: { isActive: boolean }) => cn(
    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground',
  );
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2.5 px-2">
        <BrandMark className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-tight text-sidebar-foreground">SWING RIGHTS</p>
          <p className="truncate text-xs text-sidebar-foreground/75">
            {access.roles.map((r) => roleLabels[r]).join(', ') || t('dash.staffFallback')}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto" aria-label={t('staff.nav.menu')}>
        {groups.map((g) => (
          <div key={g.title} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">{g.title}</p>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={linkCls} onClick={onPick}>
                <it.icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{it.label}</span>
                {typeof it.count === 'number' && (
                  <span className="rounded-full bg-sidebar-accent px-2 py-0.5 font-mono text-xs tabular-nums text-sidebar-foreground">{it.count}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border pt-3">
        <NavLink to="/admin/settings" className={linkCls} onClick={onPick}>
          <Settings className="h-4 w-4 shrink-0" aria-hidden /> <span>{t('staff.nav.settings')}</span>
        </NavLink>
        <div className="flex min-h-11 items-center justify-between gap-2 px-3 text-sm text-sidebar-foreground/85">
          <span>{t('staff.nav.language')}</span>
          <LanguageToggle className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground" />
        </div>
        <button type="button" onClick={logout} className={linkCls({ isActive: false }) + ' w-full'}>
          <LogOut className="h-4 w-4 shrink-0" aria-hidden /> <span>{t('staff.nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}

type ShellProps = {
  children: ReactNode; title?: string; context?: ReactNode; actions?: ReactNode; bare?: boolean;
};

/**
 * Set by the outer shell so a page can render its own <StaffShell title=...> while App.tsx
 * already wraps the route in <StaffShell>: the inner one only fills the outer top bar.
 */
interface ShellHost { claim: (on: boolean) => void; headEl: HTMLElement | null; actionsEl: HTMLElement | null }
const ShellHostContext = createContext<ShellHost | null>(null);

function ShellTitle({ title, context }: { title?: string; context?: ReactNode }) {
  return (
    <>
      {title && <h1 className="font-subhead text-xl font-semibold leading-snug sm:text-2xl text-balance">{title}</h1>}
      {context && <p className="text-sm text-muted-foreground">{context}</p>}
    </>
  );
}

/**
 * Staff area frame: sidebar on >=1024px, bottom nav + sheet menu below.
 * The top bar holds the page title, one line of context, page actions and Quick Exit (every width).
 * Nesting is safe: an inner <StaffShell title=...> renders into the outer one's top bar.
 */
export function StaffShell(props: ShellProps) {
  const host = useContext(ShellHostContext);
  return host ? <NestedShell host={host} {...props} /> : <RootShell {...props} />;
}

function NestedShell({ host, children, title, context, actions }: ShellProps & { host: ShellHost }) {
  const hasHead = !!(title || context || actions);
  const { claim } = host;
  useLayoutEffect(() => {
    if (!hasHead) return;
    claim(true);
    return () => claim(false);
  }, [hasHead, claim]);
  return (
    <>
      {hasHead && host.headEl && createPortal(<ShellTitle title={title} context={context} />, host.headEl)}
      {actions && host.actionsEl && createPortal(actions, host.actionsEl)}
      {children}
    </>
  );
}

function RootShell({ children, title, context, actions, bare }: ShellProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [claimed, setClaimed] = useState(false);
  const [headEl, setHeadEl] = useState<HTMLDivElement | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);
  const host = useMemo<ShellHost>(() => ({ claim: setClaimed, headEl, actionsEl }), [headEl, actionsEl]);
  const titled = !!(title || context || actions) || claimed;
  const bottom = [
    { to: '/admin', label: t('staff.nav.queue'), icon: Inbox, end: true },
    { to: '/admin/cases', label: t('staff.nav.cases'), icon: FolderOpen },
    { to: '/admin/partner-search', label: t('staff.nav.referral'), icon: HeartHandshake },
  ];
  return (
    <ShellHostContext.Provider value={host}>
    <div className="min-h-dvh bg-background lg:flex">
      <aside className="hidden lg:flex lg:w-[248px] lg:shrink-0 lg:flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-dvh p-4">
        <NavBody />
      </aside>

      <div className="min-w-0 flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-24">
        {titled ? (
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            {/* One row: brand (below lg), title, actions, Quick Exit. On phones the actions wrap to a
                second row and Quick Exit stays top-right. Actions render once (no duplicate dialogs). */}
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
              <BrandMark className="h-9 w-9 shrink-0 lg:hidden" />
              <div ref={setHeadEl} className="min-w-0 flex-1">
                {(title || context) && <ShellTitle title={title} context={context} />}
              </div>
              <div ref={setActionsEl} className="order-last flex basis-full flex-wrap items-center gap-2 empty:hidden sm:order-none sm:basis-auto">
                {actions}
              </div>
              <QuickExitSlot always />
            </div>
          </header>
        ) : bare ? null : (
          // Untitled pages: a small phone row for Quick Exit (it floats from 640px).
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 sm:hidden">
            <BrandMark className="h-9 w-9 shrink-0" />
            <QuickExitSlot />
          </div>
        )}
        {bare ? <div>{children}</div> : <main className={cn(titled && 'mx-auto max-w-6xl px-4 py-5 sm:px-6')}>{children}</main>}
      </div>

      <nav
        aria-label={t('staff.nav.menu')}
        className="sw-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {bottom.map((b) => (
          <NavLink key={b.to} to={b.to} end={b.end}
            className={({ isActive }) => cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring',
              isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/75',
            )}>
            {({ isActive }) => (<>
              <b.icon className={cn('h-5 w-5', isActive && 'text-sidebar-primary-foreground')} aria-hidden />
              <span className={cn('truncate', isActive && 'underline underline-offset-4 decoration-2 decoration-sidebar-primary')}>{b.label}</span>
            </>)}
          </NavLink>
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-sidebar-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring">
              <Menu className="h-5 w-5" aria-hidden /> <span>{t('staff.nav.menu')}</span>
            </button>
          </SheetTrigger>
          {/* Built-in top row: Quick Exit at the start (tappable above the overlay), 44px close at the end */}
          <SheetContent
            side="left"
            closeLabel={t('staff.nav.close')}
            aria-describedby={undefined}
            className="flex w-[300px] max-w-[85vw] flex-col border-sidebar-border bg-sidebar p-4 text-sidebar-foreground"
            key={pathname}
          >
            <SheetHeader className="sr-only"><SheetTitle>{t('staff.nav.menu')}</SheetTitle></SheetHeader>
            <div className="min-h-0 flex-1"><NavBody onPick={() => setOpen(false)} /></div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
    </ShellHostContext.Provider>
  );
}

/** Load failure in a staff list or panel: says so plainly (not "nothing found") and offers a retry. */
export function StaffLoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="alert" className={cn('flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-sevRed-bg p-4 text-sevRed-fg sm:flex-row sm:items-center', className)}>
      <p className="flex flex-1 items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        {t('staff.loadError')}
      </p>
      <Button type="button" variant="outline" className="h-11 bg-card" onClick={onRetry}>
        <RotateCw aria-hidden /> {t('staff.retry')}
      </Button>
    </div>
  );
}
