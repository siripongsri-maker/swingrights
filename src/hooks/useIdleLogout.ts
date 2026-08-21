import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange'];

/**
 * ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน (ป้องกันการเปิดหน้าจอทิ้งไว้ในสำนักงาน)
 * @param enabled เปิดใช้เมื่อผู้ใช้ล็อกอินแล้ว
 * @param timeoutMs ระยะเวลาไม่มีการใช้งาน (ค่าเริ่มต้น 20 นาที)
 * @param warnMs เตือนก่อนหมดเวลา (ค่าเริ่มต้น 1 นาที)
 */
export function useIdleLogout(enabled: boolean, timeoutMs = 20 * 60_000, warnMs = 60_000) {
  const timer = useRef<number | null>(null);
  const warnTimer = useRef<number | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!enabled) return;

    const clear = () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (warnTimer.current) window.clearTimeout(warnTimer.current);
    };

    const logout = async () => {
      clear();
      await supabase.auth.signOut();
      toast.error(t('access.idle.loggedOut'));
      window.location.href = '/admin/login';
    };

    const reset = () => {
      clear();
      warnTimer.current = window.setTimeout(() => {
        toast.warning(t('access.idle.warning'));
      }, Math.max(0, timeoutMs - warnMs));
      timer.current = window.setTimeout(logout, timeoutMs);
    };

    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clear();
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, timeoutMs, warnMs, t]);
}
