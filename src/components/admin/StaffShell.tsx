import { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FolderOpen, Users, BarChart3, Search, FileText, UserCog, Building2, History, ShieldCheck,
  Settings, LogOut, Menu, HeartHandshake, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccess, useRoleLabels } from '@/hooks/useAccess';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
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

/** Staff area frame: sidebar on >=1024px, bottom nav + sheet menu below. */
export function StaffShell({ children, title, context, actions }: {
  children: ReactNode; title?: string; context?: string; actions?: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const bottom = [
    { to: '/admin', label: t('staff.nav.queue'), icon: Inbox, end: true },
    { to: '/admin/cases', label: t('staff.nav.cases'), icon: FolderOpen },
    { to: '/admin/partner-search', label: t('staff.nav.referral'), icon: HeartHandshake },
  ];
  return (
    <div className="min-h-dvh bg-background lg:flex">
      <aside className="hidden lg:flex lg:w-[248px] lg:shrink-0 lg:flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-dvh p-4">
        <NavBody />
      </aside>

      <div className="min-w-0 flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
        {title || actions ? (
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
              <BrandMark className="h-9 w-9 shrink-0 lg:hidden" />
              <div className="min-w-0 flex-1">
                {title && <h1 className="font-subhead text-xl font-semibold leading-snug sm:text-2xl text-balance">{title}</h1>}
                {context && <p className="text-sm text-muted-foreground">{context}</p>}
              </div>
              {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}
              <QuickExitSlot />
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:hidden">{actions}</div>}
          </header>
        ) : (
          // Pages with their own header: only a small phone row for Quick Exit.
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 sm:hidden">
            <BrandMark className="h-9 w-9 shrink-0" />
            <QuickExitSlot />
          </div>
        )}
        {title || actions ? <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">{children}</main> : <div>{children}</div>}
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
          <SheetContent side="left" className="w-[300px] max-w-[85vw] border-sidebar-border bg-sidebar p-4 text-sidebar-foreground" key={pathname}>
            <SheetHeader className="sr-only"><SheetTitle>{t('staff.nav.menu')}</SheetTitle></SheetHeader>
            <NavBody onPick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
