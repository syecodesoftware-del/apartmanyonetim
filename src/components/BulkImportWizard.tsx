'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Json } from '@/lib/database.types';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Badge } from '@/components/ui';
import {
  buildTemplateBlob, downloadBlob, parseImportWorkbookWithMeta, validateRows, classifyRows,
  toRpcRows, buildErrorReportBlob, unitKey, emptyImportRow, importFieldLabel,
  type ImportRow, type ImportField, type ValidatedRow, type ClassifiedRow,
  type SnapUnit, type CurrentSnapshot, type RowClass,
} from '@/lib/excel';

/** Toplu daire içe aktarma sihirbazı (Rapor Madde 1/6/7 + extra'lar).
 *  Adımlı büyük drawer: Şablon → Yükle → Önizleme/Doğrulama (diff renkleri) → Özet →
 *  Onay → Bitti. Diff senkronizasyonu: yeni/güncel/değişmeyen/dosyada-yok. Silme YOK.
 *  Hiçbir kayıt "İçe Aktar" onayı verilmeden yazılmaz. */

type ImportResult = {
  inserted_units: number;
  inserted_residents: number;
  inserted_blocks: number;
  updated_units?: number;
  updated_residents?: number;
  tenant_changes?: number;
  skipped: { block: string | null; apartment_number: string }[];
  total_rows: number;
};

type DetectedMap = { field: ImportField; header: string }[];

const STEP_LABELS = ['Şablon', 'Yükle', 'Önizleme', 'Özet', 'Onay', 'Bitti'] as const;

const CLS_META: Record<RowClass, { dot: string; label: string; tone: string }> = {
  yeni: { dot: '🟢', label: 'Yeni', tone: 'text-emerald-700' },
  guncel: { dot: '🟡', label: 'Güncellenecek', tone: 'text-amber-700' },
  degismeyen: { dot: '⚪', label: 'Değişmeyen', tone: 'text-slate-500' },
  dosyada_yok: { dot: '🔴', label: 'Dosyada yok', tone: 'text-red-600' },
};

export function BulkImportWizard({
  snapshot,
  siteId,
  variant = 'button',
}: {
  snapshot: SnapUnit[];
  siteId: string;
  /** 'button': tetikleyici buton; 'inline': onboarding'de doğrudan açık başlar. */
  variant?: 'button' | 'inline';
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1_000_000);

  const [open, setOpen] = useState(variant === 'inline');
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [detected, setDetected] = useState<DetectedMap>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  // Değişiklik kategorileri (Özet ekranı toggle'ları)
  const [applyNew, setApplyNew] = useState(true);
  const [applyUpdates, setApplyUpdates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ filename: string | null; updated_at: string } | null>(null);
  const [savedNote, setSavedNote] = useState(false);

  const snapMap: CurrentSnapshot = useMemo(() => {
    const m = new Map<string, SnapUnit>();
    for (const u of snapshot) m.set(unitKey(u.block ?? '', u.apartment_number), u);
    return m;
  }, [snapshot]);
  const existingKeys = useMemo(() => new Set(snapMap.keys()), [snapMap]);

  const validated: ValidatedRow[] | null = useMemo(
    () => (rows ? validateRows(rows, existingKeys) : null),
    [rows, existingKeys],
  );
  const diff = useMemo(
    () => (validated ? classifyRows(validated, snapMap) : null),
    [validated, snapMap],
  );
  const classified: ClassifiedRow[] = diff?.rows ?? [];

  const counts = useMemo(() => {
    const c = { yeni: 0, guncel: 0, degismeyen: 0, hatali: 0, uyari: 0 };
    for (const r of classified) {
      if (r.errors.length) { c.hatali++; continue; }
      if (r.warnings.length) c.uyari++;
      if (r.cls === 'yeni') c.yeni++;
      else if (r.cls === 'guncel') c.guncel++;
      else c.degismeyen++;
    }
    return c;
  }, [classified]);

  const missing = diff?.missing ?? [];
  const errorCount = counts.hatali;
  const willInsert = applyNew ? counts.yeni : 0;
  const willUpdate = applyUpdates ? counts.guncel : 0;
  const importable = willInsert + willUpdate;

  // Site taslağı var mı? (RLS: yalnız kendi sitesi tek satır)
  useEffect(() => {
    if (!open || draft !== null) return;
    let alive = true;
    (async () => {
      const { data } = await supabaseBrowser()
        .from('import_drafts').select('filename, updated_at').maybeSingle();
      if (alive && data) setDraft({ filename: data.filename, updated_at: data.updated_at });
    })();
    return () => { alive = false; };
  }, [open, draft]);

  function reset() {
    setRows(null); setFileName(''); setDetected([]); setUnmatched([]);
    setOnlyFlagged(false); setApplyNew(true); setApplyUpdates(false);
    setResult(null); setError(null); setStep(1);
  }
  function close() {
    setOpen(false);
    if (variant === 'button') reset();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null); setError(null);
    try {
      const buf = await f.arrayBuffer();
      const meta = parseImportWorkbookWithMeta(buf);
      if (meta.rows.length === 0) { setError('Dosyada aktarılacak dolu satır bulunamadı.'); return; }
      setRows(meta.rows);
      setDetected(meta.mapping);
      setUnmatched(meta.unmatched);
      setFileName(f.name);
      setOnlyFlagged(false);
      setStep(3);
    } catch (err) {
      setError('Dosya okunamadı: ' + (err as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function updateCell(key: number, field: ImportField, value: string) {
    setRows((prev) => prev && prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function removeRow(key: number) {
    setRows((prev) => prev && prev.filter((r) => r.key !== key));
  }
  function addRow() {
    setOnlyFlagged(false);
    setRows((prev) => [...(prev ?? []), emptyImportRow(nextKey.current++)]);
  }

  async function saveDraft() {
    if (!rows) return;
    const { error: e } = await supabaseBrowser().from('import_drafts').upsert(
      { site_id: siteId, payload: rows as unknown as Json, filename: fileName || null, updated_at: new Date().toISOString() },
      { onConflict: 'site_id' },
    );
    if (!e) {
      setDraft({ filename: fileName || null, updated_at: new Date().toISOString() });
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2500);
    }
  }
  async function resumeDraft() {
    const { data } = await supabaseBrowser()
      .from('import_drafts').select('payload, filename').maybeSingle();
    if (!data) return;
    const payload = (data.payload as unknown as ImportRow[]) ?? [];
    // key çakışmasını önle
    setRows(payload.map((r, i) => ({ ...emptyImportRow(nextKey.current + i), ...r })));
    nextKey.current += payload.length + 1;
    setFileName(data.filename ?? '');
    setStep(3);
  }

  async function submit() {
    if (!classified.length || errorCount > 0 || importable === 0) return;
    setBusy(true); setError(null);
    const toSend = classified.filter(
      (r) => r.errors.length === 0 && (r.cls === 'yeni' ? applyNew : applyUpdates),
    );
    const payload = toRpcRows(toSend, true);
    const { data, error: rpcErr } = await supabaseBrowser().rpc('bulk_import_units_residents', {
      p_rows: payload as unknown as never,
      p_update_existing: applyUpdates,
      p_filename: fileName || undefined,
    });
    setBusy(false);
    if (rpcErr) { setError('İçe aktarma başarısız (hiçbir kayıt yazılmadı): ' + rpcErr.message); return; }
    setResult(data as unknown as ImportResult);
    // Başarılı → taslağı temizle
    await supabaseBrowser().from('import_drafts').delete().eq('site_id', siteId);
    setDraft(null);
    setStep(6);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >📥 Excel&apos;den Toplu Aktar / Güncelle</button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={close}>
      <div
        className="flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık + adım göstergesi */}
        <header className="border-b border-slate-200 px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Excel Aktarım Sihirbazı</h2>
            <button onClick={close} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Kapat">✕</button>
          </div>
          <Stepper step={step} />
        </header>

        <div className="flex-1 overflow-auto">
          {step === 1 && <StepTemplate onNext={() => setStep(2)} />}
          {step === 2 && (
            <StepUpload
              fileRef={fileRef} onFile={onFile}
              draft={draft} onResume={resumeDraft}
            />
          )}
          {step === 3 && validated && (
            <StepPreview
              rows={validated} classified={classified} counts={counts}
              detected={detected} unmatched={unmatched}
              onlyFlagged={onlyFlagged} setOnlyFlagged={setOnlyFlagged}
              applyUpdates={applyUpdates}
              updateCell={updateCell} removeRow={removeRow} addRow={addRow}
              onErrorReport={() => downloadBlob(buildErrorReportBlob(validated), 'ice-aktarma-hatalari.xlsx')}
            />
          )}
          {step === 4 && (
            <StepSummary
              counts={counts} missing={missing}
              applyNew={applyNew} setApplyNew={setApplyNew}
              applyUpdates={applyUpdates} setApplyUpdates={setApplyUpdates}
            />
          )}
          {step === 5 && (
            <StepConfirm willInsert={willInsert} willUpdate={willUpdate} counts={counts} fileName={fileName} />
          )}
          {step === 6 && result && <StepDone result={result} validated={validated} />}
        </div>

        {/* Alt bar: geri / ileri / kaydet / onay */}
        {error && <div className="border-t border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700 sm:px-6">{error}</div>}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {step > 1 && step < 6 && (
              <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="text-sm font-medium text-slate-500 hover:underline">← Geri</button>
            )}
            {step === 3 && rows && (
              <button onClick={saveDraft} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {savedNote ? '✓ Taslak kaydedildi' : '💾 Taslağı Kaydet'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 1 && <NextBtn onClick={() => setStep(2)} label="İleri →" />}
            {step === 3 && (
              <NextBtn
                onClick={() => setStep(4)}
                disabled={errorCount > 0}
                title={errorCount > 0 ? 'Önce hatalı satırları düzeltin' : undefined}
                label={errorCount > 0 ? `${errorCount} hatayı düzeltin` : 'Değişiklik Özeti →'}
              />
            )}
            {step === 4 && (
              <NextBtn onClick={() => setStep(5)} disabled={importable === 0} label={importable === 0 ? 'Uygulanacak değişiklik yok' : `Onaya Geç → (${importable})`} />
            )}
            {step === 5 && (
              <button
                onClick={submit}
                disabled={busy || importable === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >{busy ? 'İçe aktarılıyor…' : `✓ Onayla ve İçe Aktar (${importable})`}</button>
            )}
            {step === 6 && (
              <button onClick={close} className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900">Kapat</button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function NextBtn({ onClick, label, disabled, title }: { onClick: () => void; label: string; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >{label}</button>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} className="flex flex-1 items-center gap-1.5">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>{done ? '✓' : n}</div>
            <span className={`hidden text-xs sm:inline ${active ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{label}</span>
            {n < STEP_LABELS.length && <div className={`h-0.5 flex-1 rounded ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function StepTemplate({ onNext }: { onNext: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
      <h3 className="text-lg font-bold text-slate-900">1. Örnek Excel dosyasını indirin</h3>
      <p className="mt-2 text-sm text-slate-600">
        Her satır <b>bir dairedir</b>: mülk sahibi ve (varsa) kiracı aynı satıra yazılır.
        Dosyadaki <b>&quot;Nasıl Doldurulur&quot;</b> sayfasında tüm sütunlar açıklanmıştır.
        Zorunlu olan yalnızca <b>Daire No</b> ve <b>Mülk Sahibi Ad Soyad</b>&apos;dır;
        TC, telefon, plaka, iletişim dili ve açıklama sonradan da tamamlanabilir.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => downloadBlob(buildTemplateBlob(), 'daire-aktarim-sablonu.xlsx')}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >📥 Örnek Excel Dosyasını İndir</button>
        <button onClick={onNext} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Dosyam hazır, yükleyeceğim →
        </button>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">🔄 Bu bir &quot;senkronizasyon&quot; aracıdır</p>
        <p className="mt-1">
          Aynı listeyi tekrar yükleyebilirsiniz — sistem <b>neyin yeni, neyin değiştiğini</b> otomatik
          bulur. Var olan kayıtların üzerine körlemesine yazmaz; dosyada olmayan kayıtları <b>silmez</b>,
          yalnızca işaretler.
        </p>
      </div>
    </div>
  );
}

function StepUpload({ fileRef, onFile, draft, onResume }: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  draft: { filename: string | null; updated_at: string } | null;
  onResume: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
      <h3 className="text-lg font-bold text-slate-900">2. Doldurduğunuz dosyayı yükleyin</h3>
      <p className="mt-2 text-sm text-slate-600">
        Yükleme sonrası tüm satırları ekranda görecek; renkli değişiklik önizlemesiyle
        düzeltme/ekleme yapabileceksiniz. Onay vermeden hiçbir kayıt oluşturulmaz.
      </p>
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-blue-400 hover:bg-blue-50/40">
        <span className="text-3xl">📄</span>
        <span className="text-sm font-semibold text-slate-700">Excel/CSV dosyasını seçin</span>
        <span className="text-xs text-slate-400">.xlsx, .xls veya .csv</span>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
      </label>

      {draft && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-sm text-amber-800">
            <p className="font-semibold">💾 Kaydedilmiş taslağınız var</p>
            <p className="text-xs">{draft.filename || 'İsimsiz dosya'} · {new Date(draft.updated_at).toLocaleString('tr-TR')}</p>
          </div>
          <button onClick={onResume} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">Kaldığım yerden devam et</button>
        </div>
      )}
    </div>
  );
}

const LEGEND = [
  { dot: '🟢', text: 'Yeni' }, { dot: '🟡', text: 'Güncellenecek' },
  { dot: '⚪', text: 'Değişmeyen' }, { dot: '🟠', text: 'Eksik bilgi (uyarı)' },
  { dot: '🔴', text: 'Hatalı' },
];

function StepPreview({
  rows, classified, counts, detected, unmatched, onlyFlagged, setOnlyFlagged,
  applyUpdates, updateCell, removeRow, addRow, onErrorReport,
}: {
  rows: ValidatedRow[];
  classified: ClassifiedRow[];
  counts: { yeni: number; guncel: number; degismeyen: number; hatali: number; uyari: number };
  detected: DetectedMap;
  unmatched: string[];
  onlyFlagged: boolean;
  setOnlyFlagged: (v: boolean) => void;
  applyUpdates: boolean;
  updateCell: (key: number, field: ImportField, value: string) => void;
  removeRow: (key: number) => void;
  addRow: () => void;
  onErrorReport: () => void;
}) {
  const byKey = new Map(classified.map((c) => [c.key, c]));
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="blue">{rows.length} satır</Badge>
          <Badge tone="green">{counts.yeni} yeni</Badge>
          <Badge tone="amber">{counts.guncel} güncellenecek</Badge>
          <Badge tone="slate">{counts.degismeyen} değişmeyen</Badge>
          {counts.uyari > 0 && <Badge tone="amber">{counts.uyari} eksik bilgi</Badge>}
          {counts.hatali > 0 ? <Badge tone="red">{counts.hatali} hatalı</Badge> : <Badge tone="green">Doğrulama temiz ✓</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {counts.hatali > 0 && (
            <button onClick={onErrorReport} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">⬇ Hata Raporu</button>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
            Sadece hatalı/uyarılı
          </label>
          <button onClick={addRow} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">＋ Satır</button>
        </div>
      </div>

      {/* Sütun eşleştirme şeffaflığı */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-2 text-xs text-slate-500 sm:px-6">
        <span className="font-semibold text-slate-600">Algılanan sütunlar:</span>
        {detected.map((d) => (
          <span key={d.field} className="rounded bg-slate-100 px-1.5 py-0.5">{d.header} → {importFieldLabel(d.field)}</span>
        ))}
        {unmatched.length > 0 && (
          <span className="text-amber-600" title="Bu başlıklar hiçbir alana eşlenmedi ve yok sayıldı.">⚠ Eşlenmeyen: {unmatched.join(', ')}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-1.5 text-xs sm:px-6">
        {LEGEND.map((l) => <span key={l.text} className="text-slate-500">{l.dot} {l.text}</span>)}
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <table className="mt-3 w-full min-w-[1400px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {['#', 'Blok', 'Daire No', 'Kat', 'Arsa', 'm²', 'Mülk Sahibi *', 'Malik TC', 'Malik Tel', 'Kiracı', 'Kiracı TC', 'Kiracı Tel', 'Plaka', 'Dil', 'Açıklama', 'Durum', ''].map((h, i) => (
                <th key={i} className="border-b border-slate-200 bg-white px-1.5 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cl = byKey.get(r.key);
              const cls = cl?.cls ?? 'yeni';
              const flagged = r.errors.length > 0 || r.warnings.length > 0;
              if (onlyFlagged && !flagged) return null;
              const rowBg = r.errors.length ? 'bg-red-50/50'
                : cls === 'yeni' ? 'bg-emerald-50/30'
                : cls === 'guncel' ? 'bg-amber-50/30'
                : 'bg-white';
              return (
                <tr key={r.key} className={rowBg}>
                  <td className="px-1.5 py-1 text-xs text-slate-400">{i + 1}</td>
                  <Cell row={r} field="block" w="w-16" onChange={updateCell} />
                  <Cell row={r} field="apartment_number" w="w-16" onChange={updateCell} />
                  <Cell row={r} field="floor" w="w-12" onChange={updateCell} />
                  <Cell row={r} field="arsa_payi" w="w-14" onChange={updateCell} />
                  <Cell row={r} field="m2" w="w-14" onChange={updateCell} />
                  <Cell row={r} field="malik_name" w="w-36" onChange={updateCell} />
                  <Cell row={r} field="malik_tc" w="w-28" mono onChange={updateCell} />
                  <Cell row={r} field="malik_phone" w="w-28" mono onChange={updateCell} />
                  <Cell row={r} field="kiraci_name" w="w-36" onChange={updateCell} />
                  <Cell row={r} field="kiraci_tc" w="w-28" mono onChange={updateCell} />
                  <Cell row={r} field="kiraci_phone" w="w-28" mono onChange={updateCell} />
                  <Cell row={r} field="plate" w="w-24" mono onChange={updateCell} />
                  <Cell row={r} field="language" w="w-20" onChange={updateCell} />
                  <Cell row={r} field="notes" w="w-40" onChange={updateCell} />
                  <td className="max-w-[240px] px-1.5 py-1">
                    {r.errors.length > 0 ? (
                      <span className="text-xs leading-tight text-red-600">{r.errors.join('; ')}</span>
                    ) : (
                      <div className="text-xs leading-tight">
                        <span className={CLS_META[cls].tone}>{CLS_META[cls].dot} {CLS_META[cls].label}</span>
                        {cls === 'guncel' && !applyUpdates && <span className="text-slate-400"> (güncelleme kapalı)</span>}
                        {cl && cl.changes.length > 0 && <div className="text-[11px] text-slate-500">{cl.changes.join(', ')}</div>}
                        {r.warnings.length > 0 && <div className="text-[11px] text-amber-600">🟠 {r.warnings.join(', ')}</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-1.5 py-1">
                    <button onClick={() => removeRow(r.key)} title="Satırı sil" className="rounded px-1.5 py-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepSummary({
  counts, missing, applyNew, setApplyNew, applyUpdates, setApplyUpdates,
}: {
  counts: { yeni: number; guncel: number; degismeyen: number; hatali: number; uyari: number };
  missing: { label: string; occupants: string }[];
  applyNew: boolean; setApplyNew: (v: boolean) => void;
  applyUpdates: boolean; setApplyUpdates: (v: boolean) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-7 sm:px-6">
      <h3 className="text-lg font-bold text-slate-900">Değişiklik Özeti</h3>
      <p className="mt-1 text-sm text-slate-600">Hangi değişikliklerin uygulanacağını aşağıdan seçin.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SumCard dot="🟢" n={counts.yeni} label="Yeni daire" />
        <SumCard dot="🟡" n={counts.guncel} label="Güncellenecek" />
        <SumCard dot="⚪" n={counts.degismeyen} label="Değişmeyen" />
        <SumCard dot="🔴" n={missing.length} label="Dosyada yok" />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <input type="checkbox" checked={applyNew} onChange={(e) => setApplyNew(e.target.checked)} className="mt-0.5" />
          <span className="text-sm">
            <b>🟢 Yeni kayıtları ekle</b> ({counts.yeni} daire)
            <span className="block text-xs text-slate-500">Sistemde olmayan daireler ve sakinleri oluşturulur.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <input type="checkbox" checked={applyUpdates} onChange={(e) => setApplyUpdates(e.target.checked)} className="mt-0.5" />
          <span className="text-sm">
            <b>🟡 Güncellemeleri uygula</b> ({counts.guncel} daire)
            <span className="block text-xs text-slate-500">
              Mevcut dairelerde boş telefon/TC tamamlanır, kiracı değişimi işlenir, plaka/dil/açıklama güncellenir.
              Dolu alanların üzerine körlemesine yazılmaz.
            </span>
          </span>
        </label>
      </div>

      {missing.length > 0 && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">🔴 Dosyada olmayan {missing.length} kayıt</p>
          <p className="mt-0.5 text-xs text-red-600">
            Bunlar sistemde var ama yüklediğiniz dosyada yok. <b>Silinmez</b> — yalnızca bilginize sunulur.
            Gerçekten çıkarmak isterseniz Daireler ekranından elle yapabilirsiniz.
          </p>
          <div className="mt-2 max-h-40 overflow-auto text-xs text-red-700">
            {missing.map((m, i) => (
              <div key={i} className="border-t border-red-100 py-1 first:border-0">🏠 <b>{m.label || '—'}</b>{m.occupants && <> · {m.occupants}</>}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SumCard({ dot, n, label }: { dot: string; n: number; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <div className="text-2xl font-bold text-slate-800">{dot} {n}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function StepConfirm({ willInsert, willUpdate, counts, fileName }: {
  willInsert: number; willUpdate: number;
  counts: { uyari: number };
  fileName: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 text-center sm:px-6">
      <div className="text-4xl">📋</div>
      <h3 className="mt-3 text-lg font-bold text-slate-900">Onay</h3>
      <p className="mt-2 text-sm text-slate-600">
        {fileName && <>&quot;{fileName}&quot; dosyasından </>}
        aşağıdaki işlemler <b>tek seferde</b> uygulanacak (ya hep ya hiç):
      </p>
      <div className="mx-auto mt-4 w-fit space-y-1 text-left text-sm">
        <p>🟢 <b>{willInsert}</b> yeni daire eklenecek</p>
        <p>🟡 <b>{willUpdate}</b> daire güncellenecek</p>
        {counts.uyari > 0 && <p className="text-amber-600">🟠 {counts.uyari} kayıtta eksik bilgi var (yine de aktarılacak)</p>}
      </div>
      <p className="mt-4 text-xs text-slate-400">Dosyada olmayan kayıtlar silinmez. Aşağıdaki butonla onaylayın.</p>
    </div>
  );
}

function StepDone({ result, validated }: { result: ImportResult; validated: ValidatedRow[] | null }) {
  const errs = (validated ?? []).filter((r) => r.errors.length > 0);
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 text-center sm:px-6">
      <div className="text-4xl">✅</div>
      <h3 className="mt-3 text-lg font-bold text-slate-900">İçe aktarma tamamlandı</h3>
      <div className="mx-auto mt-4 w-fit space-y-1 text-left text-sm text-slate-700">
        <p><b>{result.inserted_units}</b> daire ve <b>{result.inserted_residents}</b> sakin kaydı
          {result.inserted_blocks > 0 && <> (+<b>{result.inserted_blocks}</b> yeni blok)</>} oluşturuldu.</p>
        {((result.updated_units ?? 0) > 0 || (result.updated_residents ?? 0) > 0) && (
          <p><b>{result.updated_units ?? 0}</b> dairede eksik bilgi, <b>{result.updated_residents ?? 0}</b> kişide telefon/TC tamamlandı.</p>
        )}
        {(result.tenant_changes ?? 0) > 0 && (
          <p><b>{result.tenant_changes}</b> dairede kiracı değişimi işlendi (eski kiracılık bugünle kapatıldı).</p>
        )}
        {result.skipped.length > 0 && (
          <p><b>{result.skipped.length}</b> daire zaten kayıtlı olduğu için atlandı.</p>
        )}
      </div>
      {errs.length > 0 && (
        <p className="mt-3 text-xs text-amber-600">{errs.length} hatalı satır aktarılmadı — düzeltip tekrar yükleyebilirsiniz.</p>
      )}
      <Link href="/units" className="mt-5 inline-block rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">→ Daireleri Gör</Link>
    </div>
  );
}

function Cell({ row, field, w, mono, onChange }: {
  row: ValidatedRow;
  field: ImportField;
  w: string;
  mono?: boolean;
  onChange: (key: number, field: ImportField, value: string) => void;
}) {
  const bad = row.errorFields.includes(field);
  const warn = !bad && row.warnFields.includes(field);
  const tone = bad ? 'border-red-300 bg-red-50 text-red-800'
    : warn ? 'border-amber-300 bg-amber-50 text-amber-800'
    : 'border-slate-200 bg-white text-slate-800';
  const errMsg = row.errors.filter((_, i) => row.errorFields[i] === field);
  const warnMsg = row.warnings.filter((_, i) => row.warnFields[i] === field);
  return (
    <td className="px-1 py-1">
      <input
        value={row[field]}
        title={[...errMsg, ...warnMsg].join(' · ') || undefined}
        onChange={(e) => onChange(row.key, field, e.target.value)}
        className={`${w} rounded border px-1.5 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200 ${mono ? 'font-mono text-xs' : ''} ${tone}`}
      />
    </td>
  );
}
