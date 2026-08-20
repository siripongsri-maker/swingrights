import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, RefreshCw, Trash2, UploadCloud, ArchiveRestore } from 'lucide-react';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  listLocalCases, deleteLocalCase, downloadLocalCasesJson, importLegacyDraft,
  type LocalCaseMeta,
} from '@/lib/localCases';
import { resubmitLocalCase } from '@/lib/resubmit';

export default function Recover() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LocalCaseMeta[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => setItems(listLocalCases());

  useEffect(() => {
    (async () => {
      const n = await importLegacyDraft();
      if (n) toast.success(`พบข้อมูลค้างในเครื่องเพิ่ม ${n} รายการ`);
      refresh();
      setLoading(false);
    })();
  }, []);

  const sendOne = async (id: string) => {
    setBusy(id);
    try {
      const code = await resubmitLocalCase(id);
      toast.success(`ส่งเคสสำเร็จ — รหัส ${code}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'ส่งไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  };

  const sendAll = async () => {
    const list = listLocalCases();
    let ok = 0;
    for (const it of list) {
      setBusy(it.id);
      try { await resubmitLocalCase(it.id); ok++; } catch (e) { console.warn(e); }
    }
    setBusy(null);
    refresh();
    toast[ok ? 'success' : 'error'](`ส่งสำเร็จ ${ok}/${list.length} เคส`);
  };

  const remove = async (id: string) => {
    await deleteLocalCase(id);
    refresh();
    toast.success('ลบข้อมูลในเครื่องแล้ว');
  };

  return (
    <PhoneShell title="กู้เคสจากเครื่องนี้" onClose={() => navigate('/')} contained={false}>
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-medium">เคสที่ค้างอยู่ในเครื่อง</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ระบบเก็บเคสที่กรอกค้างไว้และเคสที่ส่งไม่สำเร็จไว้ในเบราว์เซอร์นี้ ส่งเข้าระบบซ้ำได้ทุกเมื่อ
        </p>
      </div>

      <div className="px-4 flex gap-2 pb-4">
        <Button onClick={sendAll} disabled={!items.length || !!busy} className="flex-1 h-10 rounded-xl bg-gradient-primary text-xs">
          <UploadCloud className="w-4 h-4" /> ส่งทั้งหมด
        </Button>
        <Button onClick={downloadLocalCasesJson} variant="outline" disabled={!items.length} className="h-10 rounded-xl text-xs">
          <Download className="w-4 h-4" /> สำรอง JSON
        </Button>
        <Button onClick={refresh} variant="outline" className="h-10 rounded-xl px-3">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-4 pb-10 space-y-3">
        {loading && <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>}

        {!loading && !items.length && (
          <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
            <ArchiveRestore className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">ไม่พบเคสค้างในเบราว์เซอร์นี้</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              ลองเปิดหน้านี้จากเครื่อง/เบราว์เซอร์เดิมที่ใช้กรอกเคส (ต้องไม่เคยล้างข้อมูลเว็บไซต์)
            </p>
          </div>
        )}

        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{it.label}</p>
                <p className="text-[11px] text-muted-foreground">{it.area}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full ${it.kind === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-primary-soft text-primary'}`}>
                {it.kind === 'failed' ? 'ส่งไม่สำเร็จ' : 'ฉบับร่าง'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              ตอบแล้ว {it.answers} คำถาม · แก้ไขล่าสุด {new Date(it.updatedAt).toLocaleString('th-TH')}
            </p>
            {it.error && <p className="text-[11px] text-destructive mt-1 break-words">ผิดพลาด: {it.error}</p>}
            <div className="flex gap-2 mt-3">
              <Button onClick={() => sendOne(it.id)} disabled={!!busy} className="flex-1 h-9 rounded-lg bg-gradient-primary text-xs">
                {busy === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UploadCloud className="w-3.5 h-3.5" /> ส่งเข้าระบบ</>}
              </Button>
              <Button onClick={() => remove(it.id)} variant="outline" disabled={!!busy} className="h-9 rounded-lg text-xs">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
