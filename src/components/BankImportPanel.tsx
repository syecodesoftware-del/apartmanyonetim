'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { money, date } from '@/lib/format';
import {
  readSheetRows, mapBankRows, guessBankColumns,
  type SheetData, type BankColMap, type BankParseResult,
} from '@/lib/excel';

/** B3-3 — Banka ekstresini (CSV/Excel) sütun eşlemeyle bank_transactions'a aktarır. */
export function BankImportPanel({ siteId, accountId, managerId }: { siteId: string; accountId: string; managerId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [fileName, setFileName] = useState('');
  const [map, setMap] = useState<BankColMap | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState('');

  function reset() {
    setSheet(null); setFileName(''); setMap(null); setResult(null); setFileErr('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null); setFileErr('');
    setFileName(f.name);
    try {
      const buf = await f.arrayBuffer();
      const data = readSheetRows(buf);
      if (data.headers.length === 0 || data.rows.length === 0) {
        setFileErr('Dosya boş veya okunamadı.'); setSheet(null); return;
      }
      setSheet(data);
      const g = guessBankColumns(data.headers);
      setMap({
        date: g.date ?? 0,
        amount: g.amount ?? 1,
        direction: g.direction ?? null,
        description: g.description ?? null,
        counterparty: g.counterparty ?? null,
        ref: g.ref ?? null,
        signMode: g.direction === null || g.direction === undefined,
      });
    } catch (err) {
      setFileErr('Dosya okunamadı: ' + (err as Error).message);
      setSheet(null);
    }
  }

  const parsed: BankParseResult | null = useMemo(() => {
    if (!sheet || !map) return null;
    return mapBankRows(sheet.headers, sheet.rows, map);
  }, [sheet, map]);

  async function runImport() {
    if (!parsed || parsed.txns.length === 0) return;
    setBusy(true); setResult(null);
    const sb = supabaseBrowser();
    let inserted = 0, skipped = 0, failed = 0;
    for (const t of parsed.txns) {
      const { error } = await sb.from('bank_transactions').insert({
        site_id: siteId, cash_account_id: accountId,
        txn_date: t.txn_date, direction: t.direction, amount: t.amount,
        description: t.description, counterparty: t.counterparty, bank_ref: t.bank_ref,
        created_by: managerId,
      });
      if (error) { if (error.code === '23505') skipped++; else failed++; } else inserted++;
    }
    setBusy(false);
    setResult(`${inserted} hareket eklendi · ${skipped} atlandı (mükerrer)${failed ? ` · ${failed} hata` : ''}`);
    reset();
    router.refresh();
  }

  const colOptions = (sheet?.headers ?? []).map((h, i) => ({ i, label: `${i + 1}. ${h || '(boş başlık)'}` }));

  function setCol(field: keyof BankColMap, value: number | null | boolean) {
    setMap((m) => (m ? { ...m, [field]: value } : m));
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); }}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
      >
        📄 Dosyadan İçe Aktar (CSV/Excel)
      </button>

      {open && (
        <Modal title="Banka Ekstresi İçe Aktar" onClose={() => { setOpen(false); reset(); }}>
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
            {/* Adım 1: dosya */}
            <div>
              <p className="mb-2 text-sm text-slate-600">
                Bankanızın CSV veya Excel ekstresini yükleyin. İlk satır başlık olmalı. Sütunları aşağıda eşleyin.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFile}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              />
              {fileName && <p className="mt-1 text-xs text-slate-400">{fileName} · {sheet?.rows.length ?? 0} satır</p>}
              {fileErr && <p className="mt-1 text-sm text-red-600">{fileErr}</p>}
            </div>

            {/* Adım 2: sütun eşleme */}
            {sheet && map && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tarih Sütunu *">
                    <select value={map.date} onChange={(e) => setCol('date', Number(e.target.value))} className={inputCls}>
                      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Tutar Sütunu *">
                    <select value={map.amount} onChange={(e) => setCol('amount', Number(e.target.value))} className={inputCls}>
                      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                    </select>
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={map.signMode} onChange={(e) => setCol('signMode', e.target.checked)} />
                  Tutarın işareti yönü belirler (negatif = çıkış)
                </label>

                {!map.signMode && (
                  <Field label="Yön Sütunu (borç/alacak, giriş/çıkış)">
                    <select value={map.direction ?? ''} onChange={(e) => setCol('direction', e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
                      <option value="">— Yok (işaret kullan) —</option>
                      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                    </select>
                  </Field>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Açıklama">
                    <select value={map.description ?? ''} onChange={(e) => setCol('description', e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
                      <option value="">—</option>
                      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Karşı Taraf">
                    <select value={map.counterparty ?? ''} onChange={(e) => setCol('counterparty', e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
                      <option value="">—</option>
                      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Referans/Dekont">
                    <select value={map.ref ?? ''} onChange={(e) => setCol('ref', e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
                      <option value="">—</option>
                      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Önizleme */}
                {parsed && (
                  <div>
                    <div className="mb-2 flex items-center gap-3 text-sm">
                      <Badge tone="green">{parsed.txns.length} geçerli hareket</Badge>
                      {parsed.errors.length > 0 && <Badge tone="red">{parsed.errors.length} hatalı satır</Badge>}
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                      <Table>
                        <thead>
                          <tr>
                            <Th>Tarih</Th><Th>Yön</Th><Th className="text-right">Tutar</Th><Th>Açıklama</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.txns.slice(0, 8).map((t, i) => (
                            <tr key={i}>
                              <Td>{date(t.txn_date)}</Td>
                              <Td><Badge tone={t.direction === 'giris' ? 'green' : 'amber'}>{t.direction === 'giris' ? 'Giriş' : 'Çıkış'}</Badge></Td>
                              <Td className="text-right tabular-nums">{money(t.amount, true)}</Td>
                              <Td className="text-slate-500">{t.description ?? '—'}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                    {parsed.txns.length > 8 && <p className="mt-1 text-xs text-slate-400">… ve {parsed.txns.length - 8} hareket daha</p>}
                    {parsed.errors.length > 0 && (
                      <p className="mt-2 text-xs text-red-500">
                        Hatalı satırlar atlanacak: {parsed.errors.slice(0, 5).map((e) => `#${e.row} (${e.msg})`).join(' · ')}
                        {parsed.errors.length > 5 ? ' …' : ''}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {result && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{result}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => { setOpen(false); reset(); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Kapat</button>
              <button
                onClick={runImport}
                disabled={busy || !parsed || parsed.txns.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {busy ? 'Aktarılıyor…' : `İçe Aktar${parsed ? ` (${parsed.txns.length})` : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
