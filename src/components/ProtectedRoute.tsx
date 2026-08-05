import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAccess, type AppRole, ROLE_LABEL } from '@/hooks/useAccess';
import { useIdleLogout } from '@/hooks/useIdleLogout';

interface Props {
  children: ReactNode | ((access: ReturnType<typeof useAccess>) => ReactNode);
  /** บทบาทที่อนุญาต (ค่าเริ่มต้น: เจ้าหน้าที่ทุกบทบาท) */
  allow?: AppRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const access = useAccess();
  const location = useLocation();
  useIdleLogout(!!access.uid);

  if (access.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!access.uid) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const denied =
    access.status === 'suspended' ||
    access.roles.length === 0 ||
    (allow ? !allow.some((r) => access.roles.includes(r)) : false);

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center border border-border rounded-2xl p-8 bg-card">
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-lg font-medium mb-1">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {access.status === 'suspended'
              ? 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
              : access.roles.length === 0
                ? 'บัญชีนี้ยังไม่ได้รับสิทธิ์เจ้าหน้าที่ กรุณาติดต่อผู้ดูแลระบบ'
                : `บทบาทของคุณ (${access.roles.map((r) => ROLE_LABEL[r]).join(', ')}) ไม่สามารถเข้าหน้านี้ได้`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/admin/login'; }}
          >
            ออกจากระบบ
          </Button>
        </div>
      </div>
    );
  }

  return <>{typeof children === 'function' ? children(access) : children}</>;
}
