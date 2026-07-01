'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, Badge } from '@/components/ui';
import { buildTemplateBlob, downloadBlob, parseImportWorkbook, type ParseResult } from '@/lib/excel';

type ImportResult = { inserted_units: number; inserted_residents: number; skipped: { block: string | null; apartment_number: string }[]; total_rows: number };

/** Modül 4 — Toplu daire/sakin içe aktarma sihirbazı (sadece web, manager).
 *  Akış: şablon → yükle → önizleme/doğrulama → onayla → RPC (tek transaction). */
export function ImportPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setParsed(null); setFileName(null); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null); setError(null);
    setFileName(f.name);
    try {
      const buf = await f.arrayBuffer();
      setParsed(parseImportWorkbook(buf));
    } catch (err) {
      setError('Dosya okunamadı: ' + (err as Error).message);
      setParsed(null);
    }
  }

  async function submit() {
    if (!parsed || parsed.errorCount > 0) return;
    setBusy(true); setError(null);
    const { data, error } = await supabaseBrowser().rpc('bulk_import_units_residents', { p_rows: parsed.units });
    setBusy(false);
    if (error) { setError('İçe aktarma başarısız (hiçbir kayıt yazılmadı): ' + error.message); return; }
    setResult(data as unknown as ImportResult);
    setParsed(null); setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
    router.refresh();
  }

  const unitCount = parsed?.units.length ?? 0;
  const residentCount = parsed?.units.reduce((a, u) => a + u.residents.length, 0) ?? 0;
  const canSubmit = parsed && parsed.errorCount === 0 && unitCount > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Adım 1: şablon */}
      <Card title="1. Şablonu indir ve doldur">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600">
            Her satır bir sakindir. Aynı daireye birden çok sakin (1 malik + 1 kiracı) için <b>Blok</b> ve <b>Daire No</b>'yu aynı yazın.
            <b> TC Kimlik zorunludur.</b> Her daire en az bir <b>malik</b> içermelidir.
          </p>
          <button
            onClick={() => downloadBlob(buildTemplateBlob(), 'daire-sakin-sablon.xlsx')}
            className="w-fit rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >📥 Boş Excel şablonunu indir</button>
        </div>
      </Card>

      {/* Adım 2: yükle */}
      <Card title="2. Doldurduğun dosyayı yükle">
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile}
            className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" />
          {fileName && <button onClick={reset} className="text-xs font-medium text-slate-500 hover:underline">Temizle</button>}
        </div>
      </Card>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ İçe aktarma tamamlandı: <b>{result.inserted_units}</b> daire, <b>{result.inserted_residents}</b> sakin eklendi.
          {result.skipped.length > 0 && (
            <> <b>{result.skipped.length}</b> daire zaten var olduğu için atlandı
              ({result.skipped.map((x) => [x.block, x.apartment_number].filter(Boolean).join('/')).join(', ')}).</>
          )}
        </div>
      )}

      {/* Adım 3: önizleme */}
      {parsed && (
        <Card
          title="3. Önizleme ve doğrulama"
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">{unitCount} daire · {residentCount} sakin</span>
              {parsed.errorCount > 0
                ? <Badge tone="red">{parsed.errorCount} hatalı satır</Badge>
                : <Badge tone="green">Doğrulama temiz</Badge>}
            </div>
          }
        >
          {parsed.errorCount > 0 && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Hatalı satırlar var. Tümü düzeltilmeden içe aktarma yapılamaz (ya hep ya hiç).
            </p>
          )}
          <Table>
            <thead>
              <tr>
                <Th>#</Th><Th>Blok</Th><Th>Daire</Th><Th>Tip</Th><Th>Ad Soyad</Th><Th>TC</Th><Th>Durum</Th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((r) => (
                <tr key={r.rowIndex} className={r.errors.length ? 'bg-red-50/50' : ''}>
                  <Td className="text-slate-400">{r.rowIndex}</Td>
                  <Td>{r.block ?? '—'}</Td>
                  <Td>{r.apartment_number || <span className="text-red-500">boş</span>}</Td>
                  <Td>{r.relationship === 'malik' ? <Badge tone="blue">Malik</Badge> : r.relationship === 'kiraci' ? <Badge tone="amber">Kiracı</Badge> : <span className="text-red-500">{r.rawRelationship || '—'}</span>}</Td>
                  <Td>{r.full_name || '—'}</Td>
                  <Td className="font-mono text-xs">{r.tc_kimlik || '—'}</Td>
                  <Td>{r.errors.length ? <span className="text-xs text-red-600">{r.errors.join('; ')}</span> : <span className="text-xs text-emerald-600">✓</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={!canSubmit || busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >{busy ? 'İçe aktarılıyor…' : `İçe aktar (${unitCount} daire)`}</button>
            <button onClick={reset} className="text-sm font-medium text-slate-500 hover:underline">Vazgeç</button>
          </div>
        </Card>
      )}
    </div>
  );
}
