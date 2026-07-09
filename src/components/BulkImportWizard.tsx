'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Badge } from '@/components/ui';
import {
  buildTemplateBlob, downloadBlob, parseImportWorkbook, validateRows, toRpcRows, unitKey, emptyImportRow,
  type ImportRow, type ImportField, type ValidatedRow,
} from '@/lib/excel';

/** Onboarding — toplu daire içe aktarma sihirbazı.
 *  Akış: şablon indir → yükle → TAM EKRAN düzenlenebilir önizleme (mini Excel editörü) → doğrula → tek-transaction RPC.
 *  Hiçbir kayıt "İçe Aktar" onayı verilmeden oluşturulmaz. */

type ImportResult = {
  inserted_units: number;
  inserted_residents: number;
  inserted_blocks: number;
  skipped: { block: string | null; apartment_number: string }[];
  total_rows: number;
};

export type ExistingUnit = { block: string | null; apartment_number: string };

export function BulkImportWizard({ existing }: { existing: ExistingUnit[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1_000_000); // Excel'den gelen key'lerle çakışmasın
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingKeys = useMemo(
    () => new Set(existing.map((e) => unitKey(e.block ?? '', e.apartment_number))),
    [existing],
  );

  const validated: ValidatedRow[] | null = useMemo(
    () => (rows ? validateRows(rows, existingKeys) : null),
    [rows, existingKeys],
  );

  const errorCount = validated?.filter((r) => r.errors.length > 0).length ?? 0;
  const existsCount = validated?.filter((r) => r.errors.length === 0 && r.exists).length ?? 0;
  const importable = validated ? validated.length - errorCount - existsCount : 0;
  const kiraciCount = validated?.filter((r) => r.errors.length === 0 && !r.exists && r.kiraci_name.trim()).length ?? 0;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null); setError(null);
    try {
      const buf = await f.arrayBuffer();
      const parsed = parseImportWorkbook(buf);
      if (parsed.length === 0) { setError('Dosyada aktarılacak dolu satır bulunamadı.'); return; }
      setRows(parsed);
      setOnlyErrors(false);
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
    setOnlyErrors(false);
    setRows((prev) => [...(prev ?? []), emptyImportRow(nextKey.current++)]);
  }

  async function submit() {
    if (!validated || errorCount > 0 || importable === 0) return;
    setBusy(true); setError(null);
    const payload = toRpcRows(validated);
    const { data, error: rpcErr } = await supabaseBrowser().rpc('bulk_import_units_residents', {
      p_rows: payload as unknown as never,
    });
    setBusy(false);
    if (rpcErr) { setError('İçe aktarma başarısız (hiçbir kayıt yazılmadı): ' + rpcErr.message); return; }
    setResult(data as unknown as ImportResult);
    setRows(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Adım 1: şablon */}
      <Card title="1. Örnek Excel dosyasını indir">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600">
            Her satır <b>bir dairedir</b>: mülk sahibi ve (varsa) kiracı aynı satıra yazılır.
            Elinizdeki listeyi bu formata göre düzenleyin — dosyadaki <b>&quot;Nasıl Doldurulur&quot;</b> sayfasında
            tüm sütunlar açıklanmıştır. Zorunlu olan yalnızca <b>Daire No</b> ve <b>Mülk Sahibi Ad Soyad</b>&apos;dır;
            TC ve telefon sonradan da tamamlanabilir.
          </p>
          <button
            onClick={() => downloadBlob(buildTemplateBlob(), 'daire-aktarim-sablonu.xlsx')}
            className="w-fit rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >📥 Örnek Excel Dosyasını İndir</button>
        </div>
      </Card>

      {/* Adım 2: yükle */}
      <Card title="2. Doldurduğun dosyayı yükle">
        <p className="mb-2 text-sm text-slate-600">
          Yükleme sonrası tüm satırları ekranda görecek, düzeltme/ekleme/silme yapabileceksiniz.
          Onay vermeden hiçbir kayıt oluşturulmaz.
        </p>
        <input
          ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile}
          className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </Card>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">✅ İçe aktarma tamamlandı</p>
          <p className="mt-1">
            <b>{result.inserted_units}</b> daire ve <b>{result.inserted_residents}</b> sakin kaydı
            {result.inserted_blocks > 0 && <> (+<b>{result.inserted_blocks}</b> yeni blok)</>} oluşturuldu.
            {result.skipped.length > 0 && (
              <> <b>{result.skipped.length}</b> daire zaten kayıtlı olduğu için atlandı
                ({result.skipped.map((x) => [x.block, x.apartment_number].filter(Boolean).join('/')).join(', ')}).</>
            )}
          </p>
          <Link href="/units" className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline">→ Daireleri Gör</Link>
        </div>
      )}

      {/* Adım 3: tam ekran düzenlenebilir önizleme */}
      {validated && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Önizleme ve Düzenleme</h2>
              <p className="text-xs text-slate-500">
                Hücrelere tıklayıp düzeltebilirsiniz. Hiçbir kayıt &quot;İçe Aktar&quot;a basmadan oluşturulmaz.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="blue">{validated.length} satır</Badge>
              <Badge tone="green">{importable} aktarılacak · {kiraciCount} kiracılı</Badge>
              {existsCount > 0 && <Badge tone="amber">{existsCount} mevcut — atlanacak</Badge>}
              {errorCount > 0 ? <Badge tone="red">{errorCount} hatalı satır</Badge> : <Badge tone="green">Doğrulama temiz ✓</Badge>}
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 sm:px-6">
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
                Sadece hatalı satırları göster
              </label>
              <button onClick={addRow} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">＋ Satır Ekle</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setRows(null)} className="text-sm font-medium text-slate-500 hover:underline">Vazgeç</button>
              <button
                onClick={submit}
                disabled={busy || errorCount > 0 || importable === 0}
                title={errorCount > 0 ? 'Önce hatalı satırları düzeltin' : undefined}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >{busy ? 'İçe aktarılıyor…' : `İçe Aktar (${importable} daire)`}</button>
            </div>
          </div>

          {errorCount > 0 && (
            <p className="border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs text-amber-700 sm:px-6">
              Hatalı satırlar düzeltilmeden içe aktarma yapılamaz (ya hep ya hiç). Hatalı hücreler kırmızı işaretlidir.
            </p>
          )}

          <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
            <table className="mt-3 w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['#', 'Blok', 'Daire No', 'Kat', 'Arsa Payı', 'm²', 'Mülk Sahibi *', 'Malik TC', 'Malik Tel', 'Kiracı', 'Kiracı TC', 'Kiracı Tel', 'Durum', ''].map((h, i) => (
                    <th key={i} className="border-b border-slate-200 bg-white px-1.5 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validated.map((r, i) => {
                  if (onlyErrors && r.errors.length === 0) return null;
                  return (
                    <tr key={r.key} className={r.errors.length ? 'bg-red-50/40' : r.exists ? 'bg-amber-50/40' : ''}>
                      <td className="px-1.5 py-1 text-xs text-slate-400">{i + 1}</td>
                      <Cell row={r} field="block" w="w-16" onChange={updateCell} />
                      <Cell row={r} field="apartment_number" w="w-16" onChange={updateCell} />
                      <Cell row={r} field="floor" w="w-14" onChange={updateCell} />
                      <Cell row={r} field="arsa_payi" w="w-16" onChange={updateCell} />
                      <Cell row={r} field="m2" w="w-16" onChange={updateCell} />
                      <Cell row={r} field="malik_name" w="w-40" onChange={updateCell} />
                      <Cell row={r} field="malik_tc" w="w-32" mono onChange={updateCell} />
                      <Cell row={r} field="malik_phone" w="w-32" mono onChange={updateCell} />
                      <Cell row={r} field="kiraci_name" w="w-40" onChange={updateCell} />
                      <Cell row={r} field="kiraci_tc" w="w-32" mono onChange={updateCell} />
                      <Cell row={r} field="kiraci_phone" w="w-32" mono onChange={updateCell} />
                      <td className="max-w-[220px] px-1.5 py-1">
                        {r.errors.length > 0
                          ? <span className="text-xs leading-tight text-red-600">{r.errors.join('; ')}</span>
                          : r.exists
                            ? <span className="text-xs text-amber-600">Mevcut — atlanacak</span>
                            : <span className="text-xs text-emerald-600">✓</span>}
                      </td>
                      <td className="px-1.5 py-1">
                        <button onClick={() => removeRow(r.key)} title="Satırı sil" className="rounded px-1.5 py-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {onlyErrors && errorCount === 0 && (
              <p className="mt-6 text-center text-sm text-slate-400">Hatalı satır kalmadı 🎉 Filtreyi kapatıp tüm listeyi görebilirsiniz.</p>
            )}
          </div>
        </div>
      )}
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
  return (
    <td className="px-1 py-1">
      <input
        value={row[field]}
        onChange={(e) => onChange(row.key, field, e.target.value)}
        className={`${w} rounded border px-1.5 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200 ${mono ? 'font-mono text-xs' : ''} ${bad ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-800'}`}
      />
    </td>
  );
}
