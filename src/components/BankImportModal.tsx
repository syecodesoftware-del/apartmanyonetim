'use client';

import { useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Badge } from '@/components/ui';
import { parseGenericWorkbook } from '@/lib/excel';
import { parseTrAmount } from '@/lib/amount';
import { money } from '@/lib/format';

/** Banka ekstresi içe aktarma — dosya (CSV/Excel) veya yapıştırma + kolon eşleştirme.
 *  Eşleştirme siteye göre localStorage'da hatırlanır; mükerrer referanslar atlanır. */

type AmountMode = 'isaretli' | 'cift' | 'yon';
type Mapping = {
  date: number;
  amountMode: AmountMode;
  amount: number;   // isaretli / yon modunda tutar kolonu
  inCol: number;    // cift modda giriş (alacak)
  outCol: number;   // cift modda çıkış (borç)
  dir: number;      // yon modunda yön kolonu
  desc: number;
  party: number;
  ref: number;
  headerRow: boolean;
};
const NONE = -1;
const DEFAULT_MAP: Mapping = { date: 0, amountMode: 'isaretli', amount: 1, inCol: NONE, outCol: NONE, dir: NONE, desc: NONE, party: NONE, ref: NONE, headerRow: true };

function pad(s: string) { return s.padStart(2, '0'); }

/** yyyy-mm-dd / dd.mm.yyyy / dd/mm/yyyy / dd-mm-yy(yy) kabul eder. */
function parseDateAny(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/);
  if (m) return `20${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return null;
}

/** İşaretli tutar: -1.234,50 · (1.234,50) · 1.234,50 TL */
function parseSignedTr(s: string): number | null {
  let t = s.trim();
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.startsWith('-')) { neg = true; t = t.slice(1); }
  if (t.startsWith('+')) t = t.slice(1);
  t = t.replace(/(₺|TL|TRY)/gi, '').trim();
  const v = parseTrAmount(t);
  if (!Number.isFinite(v) || v === 0) return null;
  return neg ? -v : v;
}

function parseDirection(s: string): 'giris' | 'cikis' | null {
  const t = s.trim().toLocaleLowerCase('tr');
  if (/^(g|giris|giriş|a|alacak|\+)$/.test(t) || t.includes('alacak') || t.includes('giri')) return 'giris';
  if (/^(c|ç|cikis|çıkış|cıkıs|b|borc|borç|-)$/.test(t) || t.includes('borç') || t.includes('borc') || t.includes('çık') || t.includes('cik')) return 'cikis';
  return null;
}

type ParsedTxn = { txn_date: string; direction: 'giris' | 'cikis'; amount: number; description: string | null; counterparty: string | null; bank_ref: string | null };

export function BankImportModal({ siteId, accountId, managerId, onClose, onDone }: {
  siteId: string; accountId: string; managerId: string;
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const sb = supabaseBrowser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Mapping>(() => {
    try {
      const saved = localStorage.getItem(`bank-import-map-${siteId}`);
      if (saved) return { ...DEFAULT_MAP, ...(JSON.parse(saved) as Mapping) };
    } catch { /* varsayılan kalır */ }
    return { ...DEFAULT_MAP };
  });
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const colCount = grid ? Math.max(...grid.map((r) => r.length)) : 0;
  const headers: string[] = useMemo(() => {
    if (!grid || grid.length === 0) return [];
    const first = grid[0];
    return Array.from({ length: colCount }, (_, i) =>
      map.headerRow && first[i] ? `${String.fromCharCode(65 + (i % 26))} — ${first[i].slice(0, 24)}` : `Kolon ${String.fromCharCode(65 + (i % 26))}`);
  }, [grid, colCount, map.headerRow]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    try {
      const rows = parseGenericWorkbook(await f.arrayBuffer());
      if (rows.length === 0) { setError('Dosyada satır bulunamadı.'); return; }
      setGrid(rows);
    } catch (err) {
      setError('Dosya okunamadı: ' + (err as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function loadPaste() {
    const rows = pasteText.split('\n').map((l) => l.trim()).filter(Boolean)
      .map((l) => l.split(/[\t;]/).map((c) => c.trim()));
    if (rows.length === 0) { setError('Yapıştırılan metinde satır yok.'); return; }
    setError('');
    setGrid(rows);
    setPasteMode(false);
  }

  // Eşleştirmeye göre satırları çöz
  const parsed = useMemo(() => {
    if (!grid) return null;
    const dataRows = map.headerRow ? grid.slice(1) : grid;
    const ok: ParsedTxn[] = [];
    const bad: number[] = [];
    dataRows.forEach((r, idx) => {
      const rowNo = idx + (map.headerRow ? 2 : 1);
      const d = parseDateAny(r[map.date] ?? '');
      if (!d) { bad.push(rowNo); return; }
      let direction: 'giris' | 'cikis' | null = null;
      let amount: number | null = null;
      if (map.amountMode === 'isaretli') {
        const v = parseSignedTr(r[map.amount] ?? '');
        if (v == null) { bad.push(rowNo); return; }
        direction = v >= 0 ? 'giris' : 'cikis';
        amount = Math.abs(v);
      } else if (map.amountMode === 'cift') {
        const vin = map.inCol >= 0 ? parseSignedTr(r[map.inCol] ?? '') : null;
        const vout = map.outCol >= 0 ? parseSignedTr(r[map.outCol] ?? '') : null;
        if (vin != null && Math.abs(vin) > 0) { direction = 'giris'; amount = Math.abs(vin); }
        else if (vout != null && Math.abs(vout) > 0) { direction = 'cikis'; amount = Math.abs(vout); }
        else { bad.push(rowNo); return; }
      } else {
        direction = map.dir >= 0 ? parseDirection(r[map.dir] ?? '') : null;
        const v = parseSignedTr(r[map.amount] ?? '');
        if (!direction || v == null) { bad.push(rowNo); return; }
        amount = Math.abs(v);
      }
      ok.push({
        txn_date: d, direction: direction!, amount: amount!,
        description: map.desc >= 0 ? (r[map.desc] || null) : null,
        counterparty: map.party >= 0 ? (r[map.party] || null) : null,
        bank_ref: map.ref >= 0 ? (r[map.ref] || null) : null,
      });
    });
    return { ok, bad };
  }, [grid, map]);

  async function runImport() {
    if (!parsed || parsed.ok.length === 0) return;
    setBusy(true); setError('');
    try { localStorage.setItem(`bank-import-map-${siteId}`, JSON.stringify(map)); } catch { /* önemsiz */ }

    // Mükerrer referansları atla (aynı hesapta aynı bank_ref)
    const refs = parsed.ok.map((t) => t.bank_ref).filter((x): x is string => !!x);
    let existing = new Set<string>();
    if (refs.length > 0) {
      const { data } = await sb.from('bank_transactions').select('bank_ref')
        .eq('cash_account_id', accountId).not('bank_ref', 'is', null).limit(10000);
      existing = new Set((data ?? []).map((x) => x.bank_ref as string));
    }
    const seen = new Set<string>();
    const toInsert = parsed.ok.filter((t) => {
      if (!t.bank_ref) return true;
      if (existing.has(t.bank_ref) || seen.has(t.bank_ref)) return false;
      seen.add(t.bank_ref);
      return true;
    });
    const skipped = parsed.ok.length - toInsert.length;

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 200) {
      const chunk = toInsert.slice(i, i + 200).map((t) => ({
        site_id: siteId, cash_account_id: accountId, created_by: managerId, ...t,
      }));
      const { error } = await sb.from('bank_transactions').insert(chunk);
      if (error) { setBusy(false); setError(`Aktarım ${inserted} satırda durdu: ` + error.message); return; }
      inserted += chunk.length;
    }
    setBusy(false);
    onDone(`${inserted} hareket eklendi${skipped ? ` · ${skipped} mükerrer atlandı` : ''}${parsed.bad.length ? ` · ${parsed.bad.length} satır okunamadı (satır: ${parsed.bad.slice(0, 10).join(', ')}${parsed.bad.length > 10 ? '…' : ''})` : ''}.`);
  }

  const sel = (v: number, onChange: (n: number) => void, allowNone = true) => (
    <select value={v} onChange={(e) => onChange(Number(e.target.value))} className={inputCls}>
      {allowNone && <option value={NONE}>— yok —</option>}
      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
    </select>
  );

  const previewRows = parsed?.ok.slice(0, 5) ?? [];

  return (
    <Modal title="Banka Ekstresi İçe Aktar" onClose={onClose}>
      {!grid ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Bankanızın verdiği ekstre dosyasını (CSV / Excel) olduğu gibi yükleyin — bir sonraki adımda
            hangi kolonun ne olduğunu seçeceksiniz. Seçiminiz bu site için hatırlanır.
          </p>
          <input
            ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile}
            className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
          {!pasteMode ? (
            <button onClick={() => setPasteMode(true)} className="text-xs font-semibold text-blue-600 hover:underline">
              veya panodan yapıştır (TAB / ; ayraçlı)
            </button>
          ) : (
            <div className="space-y-2">
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={6} className={`${inputCls} font-mono text-xs`} placeholder={'01.06.2026;1.500,00;AİDAT HAVALE;REF001'} />
              <button onClick={loadPaste} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Devam →</button>
            </div>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">{grid.length} satır okundu — kolonları eşleştirin:</p>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={map.headerRow} onChange={(e) => setMap({ ...map, headerRow: e.target.checked })} />
              İlk satır başlık
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Tarih *">{sel(map.date, (n) => setMap({ ...map, date: n }), false)}</Field>
            <Field label="Tutar biçimi">
              <select value={map.amountMode} onChange={(e) => setMap({ ...map, amountMode: e.target.value as AmountMode })} className={inputCls}>
                <option value="isaretli">Tek kolon, işaretli (− = çıkış)</option>
                <option value="cift">İki kolon (Alacak / Borç)</option>
                <option value="yon">Tutar + ayrı yön kolonu</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {map.amountMode !== 'cift' && <Field label="Tutar *">{sel(map.amount, (n) => setMap({ ...map, amount: n }), false)}</Field>}
            {map.amountMode === 'cift' && (
              <>
                <Field label="Giriş / Alacak *">{sel(map.inCol, (n) => setMap({ ...map, inCol: n }), false)}</Field>
                <Field label="Çıkış / Borç *">{sel(map.outCol, (n) => setMap({ ...map, outCol: n }), false)}</Field>
              </>
            )}
            {map.amountMode === 'yon' && <Field label="Yön *">{sel(map.dir, (n) => setMap({ ...map, dir: n }), false)}</Field>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Açıklama">{sel(map.desc, (n) => setMap({ ...map, desc: n }))}</Field>
            <Field label="Karşı Taraf">{sel(map.party, (n) => setMap({ ...map, party: n }))}</Field>
            <Field label="Referans">{sel(map.ref, (n) => setMap({ ...map, ref: n }))}</Field>
          </div>

          {/* Önizleme */}
          <div className="rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Badge tone="green">{parsed?.ok.length ?? 0} geçerli</Badge>
              {(parsed?.bad.length ?? 0) > 0 && <Badge tone="red">{parsed?.bad.length} okunamadı</Badge>}
              <span className="text-xs text-slate-400">Referans verilen mükerrer satırlar aktarımda atlanır.</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Tarih</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Açıklama</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-500">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((t, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 text-slate-600">{t.txn_date}</td>
                    <td className="max-w-[220px] truncate px-2 py-1 text-slate-600">{t.description ?? t.counterparty ?? '—'}</td>
                    <td className={`px-2 py-1 text-right tabular-nums ${t.direction === 'giris' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.direction === 'giris' ? '+' : '−'} {money(t.amount, true)}
                    </td>
                  </tr>
                ))}
                {previewRows.length === 0 && <tr><td colSpan={3} className="px-2 py-3 text-center text-slate-400">Eşleştirme bu haliyle geçerli satır üretmiyor.</td></tr>}
              </tbody>
            </table>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-between gap-2 pt-1">
            <button onClick={() => { setGrid(null); setError(''); }} className="text-sm font-medium text-slate-500 hover:underline">← Farklı dosya</button>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button onClick={runImport} disabled={busy || !parsed || parsed.ok.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Aktarılıyor…' : `İçe Aktar (${parsed?.ok.length ?? 0})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
