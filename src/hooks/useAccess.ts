import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

export type AppRole = 'admin' | 'manager' | 'caseworker' | 'viewer' | 'staff';

export interface Access {
  uid: string | null;
  email: string | null;
  roles: AppRole[];
  status: 'active' | 'suspended';
  loading: boolean;
  /** ผู้ดูแลระบบ */
  isAdmin: boolean;
  /** ผู้ดูแล + หัวหน้างาน (แก้ไขได้ทุกเคส) */
  canManage: boolean;
  /** ดูอย่างเดียว */
  isViewer: boolean;
  /** แก้ไขข้อมูลเคสได้บ้าง (ไม่ใช่ viewer) */
  canEdit: boolean;
  isStaff: boolean;
}

/** @deprecated Use useRoleLabels() inside components for translated labels. */
export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  manager: 'หัวหน้างาน',
  caseworker: 'ผู้ปฏิบัติงานเคส',
  viewer: 'ผู้ดูอย่างเดียว',
  staff: 'เจ้าหน้าที่',
};

/** Translated role labels — call from a component. */
export function useRoleLabels(): Record<AppRole, string> {
  const { t } = useI18n();
  return {
    admin: t('access.role.admin'),
    manager: t('access.role.manager'),
    caseworker: t('access.role.caseworker'),
    viewer: t('access.role.viewer'),
    staff: t('access.role.staff'),
  };
}

export const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'manager', 'caseworker', 'viewer'];

export function useAccess(): Access {
  const [state, setState] = useState<Access>({
    uid: null, email: null, roles: [], status: 'active', loading: true,
    isAdmin: false, canManage: false, isViewer: false, canEdit: false, isStaff: false,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, uid: null, roles: [], isStaff: false }));
        return;
      }
      // ให้แน่ใจว่ามีโปรไฟล์เจ้าหน้าที่
      await supabase.rpc('ensure_staff_profile' as never, { _display_name: null } as never);
      const { data } = await supabase.rpc('my_access' as never);
      const acc = (data ?? {}) as { roles?: AppRole[]; status?: string };
      const roles = (acc.roles ?? []) as AppRole[];
      const status = (acc.status === 'suspended' ? 'suspended' : 'active') as 'active' | 'suspended';
      const active = status === 'active';
      const isAdmin = active && roles.includes('admin');
      const canManage = active && (isAdmin || roles.includes('manager'));
      const isViewer = active && !canManage && roles.includes('viewer');
      if (cancelled) return;
      setState({
        uid: user.id,
        email: user.email ?? null,
        roles,
        status,
        loading: false,
        isAdmin,
        canManage,
        isViewer,
        canEdit: active && !isViewer && roles.length > 0,
        isStaff: active && roles.length > 0,
      });
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
