import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, RefreshCw, Trash2, UploadCloud, ArchiveRestore } from 'lucide-react';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import {
  listLocalCases, deleteLocalCase, downloadLocalCasesJson, importLegacyDraft,
  type LocalCaseMeta,
} from '@/lib/localCases';
import { resubmitLocalCase } from '@/lib/resubmit';

export default function Recover() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [items, setItems] = useState<LocalCaseMeta[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => setItems(listLocalCases());

  useEffect(() => {
    (async () => {
      const n = await importLegacyDraft();
      if (n) toast.success(t('recover.importedToast', { n }));
      refresh();
      setLoading(false);
    })();
  }, []);

  const sendOne = async (id: string) => {
    setBusy(id);
    try {
      const code = await resubmitLocalCase(id);
      toast.success(t('recover.sentSuccess', { code }));
      refresh();
    } catch (e: any) {
      toast.error((e?.message && t(e.message)) || t('recover.sendOneFailed'));
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
    toast[ok ? 'success' : 'error'](t('recover.sentSummary', { ok, total: list.length }));
  };

  const remove = async (id: string) => {
    await deleteLocalCase(id);
    refresh();
    toast.success(t('recover.deleted'));
  };

  return (
    <PhoneShell title={t('recover.pageTitle')} onClose={() => navigate('/')} contained={false}>
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-medium">{t('recover.heading')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('recover.subtitle')}
        </p>
      </div>

      {/* Phones: "Send all" gets its own row so longer labels (my/km/lo) never push the row off screen */}
      <div className="px-4 flex flex-wrap gap-2 pb-4">
        <Button variant="action" onClick={sendAll} disabled={!items.length || !!busy} className="w-full sm:w-auto sm:flex-1 h-11 text-sm">
          <UploadCloud className="w-4 h-4" aria-hidden /> {t('recover.sendAll')}
        </Button>
        <Button onClick={downloadLocalCasesJson} variant="outline" disabled={!items.length} className="flex-1 sm:flex-none h-11 rounded-xl text-sm">
          <Download className="w-4 h-4" aria-hidden /> {t('recover.backupJson')}
        </Button>
        <Button onClick={refresh} variant="outline" size="icon" aria-label={t('recover.refresh')} className="shrink-0 rounded-xl">
          <RefreshCw className="w-4 h-4" aria-hidden />
        </Button>
      </div>

      <div className="px-4 pb-10 space-y-3">
        {loading && <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>}

        {!loading && !items.length && (
          <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
            <ArchiveRestore className="w-6 h-6 mx-auto text-muted-foreground mb-2" aria-hidden />
            <p className="text-sm text-muted-foreground">{t('recover.emptyTitle')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('recover.emptyHint')}
            </p>
          </div>
        )}

        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{it.label === 'vault.unnamed' ? t('vault.unnamed') : it.label}</p>
                <p className="text-xs text-muted-foreground">{it.area === 'vault.unknownArea' ? t('vault.unknownArea') : it.area}</p>
              </div>
              <span className={`inline-flex min-h-6 shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${it.kind === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-primary-soft text-primary'}`}>
                {it.kind === 'failed' ? t('recover.failed') : t('recover.draft')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('recover.answeredCount', { n: it.answers, date: new Date(it.updatedAt).toLocaleString(lang) })}
            </p>
            {it.error && <p className="text-xs text-destructive mt-1 break-words">{t('recover.errorPrefix', { msg: t(it.error) })}</p>}
            <div className="flex gap-2 mt-3">
              {/* Charcoal: "Send all" at the top is the one magenta action on this screen */}
              <Button variant="default" onClick={() => sendOne(it.id)} disabled={!!busy} aria-busy={busy === it.id} className="flex-1 h-11 text-sm">
                {busy === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <UploadCloud className="w-3.5 h-3.5" aria-hidden />}
                {t('recover.sendToSystem')}
              </Button>
              {/* Deleting cannot be undone, so ask first */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={!!busy} aria-label={t('recover.delete')} className="h-11 w-11 shrink-0 rounded-lg px-0">
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('recover.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('recover.deleteConfirmBody')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('recover.cancel')}</AlertDialogCancel>
                    <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => void remove(it.id)}>
                      <Trash2 aria-hidden /> {t('recover.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
