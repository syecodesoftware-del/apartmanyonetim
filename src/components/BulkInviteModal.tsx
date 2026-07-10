'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Badge, EmptyState } from '@/components/ui';
import {
  isValidTc, normalizePhoneTR, unitKey,
  parseInviteWorkbook, buildInviteTemplateBlob, downloadBlob, type InviteRow,
} from '@/lib/excel';
import type { InvitationRow } from '@/components/MembershipPanel';

/** Toplu Davet popup'ı — iki kaynak:
 *  1) Kayıtlı sakinler: Excel içe aktarımıyla gelen hesapsız kişiler (tekrar yükleme gerekmez)
 *  2) Excel yükleme: davet edilecek kişiler listesi (ayrı şablon)
 *  Tüm davetler "Sakin" rolüyle oluşturulur; kodlar Davetler listesinde görünür. */

export type InviteCandidate = {
  id: string;
  full_name: string;
  phone: string | null;
  tc_kimlik: string | null;
  relationship: string; // 'malik' | 'kiraci'
  block: string | null;
  apartment_number: string | null;
};

type Tab = 'kayitli' | 'excel';

type ExcelChecked = InviteRow & { errors: string[]; alreadyInvited: boolean };

const personKey = (name: string, block: string | null | undefined, apt: string | null | undefined) =>
  `${name.trim().toLocaleLowerCase('tr-TR')}|||${unitKey(block ?? '', apt ?? '')}`;

export function BulkInviteModal({ candidates, invitations, siteId, managerId, onClose }: {
  candidates: InviteCandidate[];
  invitations: InvitationRow[];
  siteId: string;
  managerId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(candidates.length > 0 ? 'kayitli' : 'excel');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  // Aktif (pending/claimed) davetler — mükerrer daveti engellemek için
  const invitedTcs = useMemo(
    () => new Set(invitations.filter((i) => i.status === 'pending' || i.status === 'claimed').map((i) => i.tc_kimlik).filter(Boolean) as string[]),
    [invitations],
  );
  const invitedPersons = useMemo(
    () => new Set(
      invitations
        .filter((i) => (i.status === 'pending' || i.status === 'claimed') && i.full_name)
        .map((i) => personKey(i.full_name!, i.block, i.apartment_number)),
    ),
    [invitations],
  );
  const isInvited = (name: string, tc: string | null, block: string | null, apt: string | null) =>
    (!!tc && invitedTcs.has(tc)) || invitedPersons.has(personKey(name, block, apt));

  /* ── Sekme 1: kayıtlı sakinler ── */
  const enriched = useMemo(
    () => candidates.map((c) => ({ ...c, alreadyInvited: isInvited(c.full_name, c.tc_kimlik, c.block, c.apartment_number) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates, invitedTcs, invitedPersons],
  );
  const invitable = enriched.filter((c) => !c.alreadyInvited);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(invitable.map((c) => c.id)));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Sekme 2: Excel ── */
  const fileRef = useRef<HTMLInputElement>(null);
  const [excelRows, setExcelRows] = useState<InviteRow[] | null>(null);
  const [excelSelected, setExcelSelected] = useState<Set<number>>(new Set());

  const checkedExcel: ExcelChecked[] = useMemo(() => {
    if (!excelRows) return [];
    const seen = new Set<string>();
    return excelRows.map((r) => {
      const errors: string[] = [];
      if (!r.full_name.trim()) errors.push('Ad Soyad boş');
      if (!r.apartment_number.trim()) errors.push('Daire No boş');
      if (r.tc_kimlik.trim() && !isValidTc(r.tc_kimlik.trim())) errors.push('TC geçersiz');
      if (r.phone.trim() && !normalizePhoneTR(r.phone)) errors.push('Telefon geçersiz');
      const key = personKey(r.full_name, r.block, r.apartment_number);
      if (r.full_name.trim()) {
        if (seen.has(key)) errors.push('Dosyada tekrar ediyor');
        seen.add(key);
      }
      const alreadyInvited = r.full_name.trim()
        ? isInvited(r.full_name, r.tc_kimlik.trim() || null, r.block || null, r.apartment_number || null)
        : false;
      return { ...r, errors, alreadyInvited };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelRows, invitedTcs, invitedPersons]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const rows = parseInviteWorkbook(await file.arrayBuffer());
      if (rows.length === 0) throw new Error('Dosyada kişi satırı bulunamadı.');
      setExcelRows(rows);
      // Hatalı ve zaten davetli olmayanlar ön-seçili gelir
      const seen = new Set<string>();
      const preselect = new Set<number>();
      for (const r of rows) {
        const key = personKey(r.full_name, r.block, r.apartment_number);
        const dup = seen.has(key);
        seen.add(key);
        const okRow = r.full_name.trim() && r.apartment_number.trim()
          && (!r.tc_kimlik.trim() || isValidTc(r.tc_kimlik.trim()))
          && (!r.phone.trim() || normalizePhoneTR(r.phone))
          && !dup
          && !isInvited(r.full_name, r.tc_kimlik.trim() || null, r.block || null, r.apartment_number || null);
        if (okRow) preselect.add(r.key);
      }
      setExcelSelected(preselect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya okunamadı.');
      setExcelRows(null);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function toggleExcel(key: number) {
    setExcelSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /* ── Davet oluşturma ── */
  type InsertRow = {
    site_id: string; created_by: string; role: string;
    full_name: string; tc_kimlik: string | null; block: string | null;
    apartment_number: string | null; phone: string | null; email: string | null;
  };

  async function createInvitations(rows: InsertRow[], skipped: number) {
    if (rows.length === 0) { setError('Davet edilecek kişi seçilmedi.'); return; }
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().from('site_invitations').insert(rows);
    setBusy(false);
    if (error) { setError('Davetler oluşturulamadı: ' + error.message); return; }
    setResult({ created: rows.length, skipped });
    router.refresh();
  }

  function submitKayitli() {
    const chosen = invitable.filter((c) => selected.has(c.id));
    const rows: InsertRow[] = chosen.map((c) => ({
      site_id: siteId, created_by: managerId, role: 'resident',
      full_name: c.full_name,
      tc_kimlik: c.tc_kimlik,
      block: c.block,
      apartment_number: c.apartment_number,
      phone: c.phone,
      email: null,
    }));
    void createInvitations(rows, enriched.length - chosen.length);
  }

  function submitExcel() {
    const chosen = checkedExcel.filter((r) => excelSelected.has(r.key) && r.errors.length === 0 && !r.alreadyInvited);
    const rows: InsertRow[] = chosen.map((r) => ({
      site_id: siteId, created_by: managerId, role: 'resident',
      full_name: r.full_name.trim(),
      tc_kimlik: r.tc_kimlik.trim() || null,
      block: r.block.trim() || null,
      apartment_number: r.apartment_number.trim() || null,
      phone: normalizePhoneTR(r.phone),
      email: r.email.trim() || null,
    }));
    void createInvitations(rows, checkedExcel.length - chosen.length);
  }

  const tabBtn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
      active ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Toplu Davet</h2>
            <p className="text-xs text-slate-400">Davetler &quot;Sakin&quot; rolüyle oluşturulur; kodlar Davetler listesinde görünür ve 7 gün geçerlidir.</p>
          </div>
          <button onClick={onClose} aria-label="Kapat" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">✕</button>
        </div>

        <div className="p-5">
          {result ? (
            <div className="space-y-4 py-4 text-center">
              <p className="text-3xl">✅</p>
              <p className="text-sm font-semibold text-slate-800">{result.created} davet oluşturuldu.</p>
              {result.skipped > 0 && <p className="text-xs text-slate-500">{result.skipped} kişi atlandı (zaten davetli / seçilmedi / hatalı).</p>}
              <p className="text-xs text-slate-500">
                TC&apos;si olanlar kayıt olurken otomatik eşleşir; diğerleri için davet kodunu aşağıdaki Davetler listesinden kopyalayıp iletebilirsiniz.
              </p>
              <button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Kapat</button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-1.5">
                <button className={tabBtn(tab === 'kayitli')} onClick={() => setTab('kayitli')}>
                  Kayıtlı Sakinler ({candidates.length})
                </button>
                <button className={tabBtn(tab === 'excel')} onClick={() => setTab('excel')}>
                  Excel&apos;den Yükle
                </button>
              </div>

              {tab === 'kayitli' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Daire aktarımında yüklediğiniz, henüz uygulama hesabı olmayan kişiler — tekrar Excel yüklemenize gerek yok.
                  </p>
                  {enriched.length === 0 ? (
                    <EmptyState>Hesapsız kayıtlı sakin yok. Excel sekmesinden liste yükleyebilirsiniz.</EmptyState>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={invitable.length > 0 && invitable.every((c) => selected.has(c.id))}
                          onChange={(e) => setSelected(e.target.checked ? new Set(invitable.map((c) => c.id)) : new Set())}
                        />
                        Tümünü seç ({invitable.length} davet edilebilir)
                      </label>
                      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                        {enriched.map((c) => (
                          <li key={c.id}>
                            <label className={`flex items-center gap-3 px-3 py-2 ${c.alreadyInvited ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                              <input
                                type="checkbox"
                                disabled={c.alreadyInvited}
                                checked={!c.alreadyInvited && selected.has(c.id)}
                                onChange={() => toggle(c.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-800">{c.full_name}</span>
                                <span className="block truncate text-xs text-slate-400">
                                  {[c.block, c.apartment_number].filter(Boolean).join(' / ') || 'Daire yok'}
                                  {c.phone ? ` · ${c.phone}` : ''}
                                  {c.tc_kimlik ? ' · TC var' : ' · TC yok'}
                                </span>
                              </span>
                              <Badge tone={c.relationship === 'malik' ? 'blue' : 'slate'}>{c.relationship === 'malik' ? 'Malik' : 'Kiracı'}</Badge>
                              {c.alreadyInvited && <Badge tone="amber">Zaten davetli</Badge>}
                            </label>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end">
                        <button
                          onClick={submitKayitli}
                          disabled={busy || selected.size === 0}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {busy ? 'Oluşturuluyor…' : `Davet Oluştur (${[...selected].filter((id) => invitable.some((c) => c.id === id)).length})`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === 'excel' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => downloadBlob(buildInviteTemplateBlob(), 'davet-listesi-sablonu.xlsx')}
                      className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      📥 Örnek Şablonu İndir
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="text-sm" />
                  </div>
                  {!excelRows ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                      Davet edilecek kişilerin listesini (.xlsx) yükleyin — Ad Soyad ve Daire No zorunlu, TC/telefon/e-posta opsiyonel.
                    </p>
                  ) : (
                    <>
                      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                        {checkedExcel.map((r) => {
                          const blocked = r.errors.length > 0 || r.alreadyInvited;
                          return (
                            <li key={r.key}>
                              <label className={`flex items-center gap-3 px-3 py-2 ${blocked ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}>
                                <input
                                  type="checkbox"
                                  disabled={blocked}
                                  checked={!blocked && excelSelected.has(r.key)}
                                  onChange={() => toggleExcel(r.key)}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-slate-800">{r.full_name || '(adsız)'}</span>
                                  <span className="block truncate text-xs text-slate-400">
                                    {[r.block, r.apartment_number].filter(Boolean).join(' / ') || 'Daire yok'}
                                    {r.phone ? ` · ${r.phone}` : ''}
                                    {r.tc_kimlik ? ' · TC var' : ''}
                                  </span>
                                </span>
                                {r.alreadyInvited && <Badge tone="amber">Zaten davetli</Badge>}
                                {r.errors.length > 0 && <Badge tone="red">{r.errors.join(', ')}</Badge>}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex items-center justify-between">
                        <button onClick={() => { setExcelRows(null); setExcelSelected(new Set()); }} className="text-xs font-semibold text-slate-500 hover:underline">
                          Farklı dosya yükle
                        </button>
                        <button
                          onClick={submitExcel}
                          disabled={busy || [...excelSelected].length === 0}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {busy ? 'Oluşturuluyor…' : `Davet Oluştur (${checkedExcel.filter((r) => excelSelected.has(r.key) && r.errors.length === 0 && !r.alreadyInvited).length})`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
