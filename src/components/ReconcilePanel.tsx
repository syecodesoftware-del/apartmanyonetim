'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Segmented } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { todayLocalISO } from '@/lib/date';

export type Summary = {
  defter_bakiye: number | null; banka_net: number | null;
  eslesmeyen_sayi: number | null; eslesmeyen_tutar: number | null; toplam_hareket: number | null;
};
export type Txn = {
  id: string; txn_date: string; direction: string; amount: number;
  description: string | null; counterparty: string | null; bank_ref: string | null; match_status: string;
};
export type UnitOption = { id: string; block: string | null; apartment_number: string };
// needsAccountLink (P8): hesapsız online tahsilat — eşleşince collections.cash_account_id bu hesaba yazılır
type Candidate = { kind: 'collection' | 'expense'; id: string; amount: number; date: string | null; label: string; needsAccountLink?: boolean };

function unitLabel(u: UnitOption) {
  return [u.block, u.apartment_number].filter(Boolean).join(' / ');
}

// Havale açıklamasında daire referansı geçiyorsa öner (Gereksinim 7.10)
function suggestUnit(txn: Txn, units: UnitOption[]): string {
  const hay = `${txn.description ?? ''} ${txn.counterparty ?? ''}`.toLocaleLowerCase('tr');
  if (!hay.trim()) return '';
  const hit = units.find((u) => {
    const apt = u.apartment_number?.toLocaleLowerCase('tr');
    if (!apt) return false;
    const re = new RegExp(`(^|[^0-9a-zçğıöşü])${apt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^0-9a-zçğıöşü]|$)`);
    return re.test(hay);
  });
  return hit?.id ?? '';
}

const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'slate' }> = {
  matched: { label: 'Eşleşti', tone: 'green' },
  unmatched: { label: 'Eşleşmedi', tone: 'amber' },
  ignored: { label: 'Yoksayıldı', tone: 'slate' },
};


export function ReconcilePanel({ transactions, accountId, siteId, managerId, units = [] }: { transactions: Txn[]; accountId: string; siteId: string; managerId: string; units?: UnitOption[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const sb = supabaseBrowser();

  // Onayla → Daireye Tahsilat
  const [approveTxn, setApproveTxn] = useState<Txn | null>(null);
  const [approveUnitId, setApproveUnitId] = useState('');
  const [approveSearch, setApproveSearch] = useState('');
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveInfo, setApproveInfo] = useState<string | null>(null);

  function openApprove(t: Txn) {
    setApproveTxn(t);
    setApproveSearch('');
    setApproveError(null);
    setApproveUnitId(suggestUnit(t, units));
  }
  async function confirmApprove() {
    if (!approveTxn || !approveUnitId) { setApproveError('Lütfen bir daire seçin.'); return; }
    setApproveBusy(true); setApproveError(null);
    const { data, error } = await sb.rpc('approve_bank_txn_as_collection', { p_txn_id: approveTxn.id, p_unit_id: approveUnitId });
    setApproveBusy(false);
    if (error) { setApproveError(error.message); return; }
    const leftover = Number((data as { leftover?: number } | null)?.leftover ?? 0);
    setApproveTxn(null);
    setApproveInfo(leftover > 0.005 ? `Tahsilat onaylandı. ${money(leftover, true)} avans/artan olarak kaydedildi.` : 'Tahsilat onaylandı ve borca mahsup edildi.');
    router.refresh();
  }

  // Hareket ekle
  const [addOpen, setAddOpen] = useState(false);
  const [tDate, setTDate] = useState(todayLocalISO());
  const [tDir, setTDir] = useState<'giris' | 'cikis'>('giris');
  const [tAmount, setTAmount] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tParty, setTParty] = useState('');
  const [tRef, setTRef] = useState('');

  // Toplu içe aktar
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  // Eşleştirme
  const [matchTxn, setMatchTxn] = useState<Txn | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setTDate(todayLocalISO()); setTDir('giris'); setTAmount(''); setTDesc(''); setTParty(''); setTRef(''); setError(null); setAddOpen(true); }

  async function addTxn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseTrAmount(tAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return; }
    setBusy(true);
    const { error } = await sb.from('bank_transactions').insert({
      site_id: siteId, cash_account_id: accountId, txn_date: tDate, direction: tDir, amount: amt,
      description: tDesc.trim() || null, counterparty: tParty.trim() || null, bank_ref: tRef.trim() || null, created_by: managerId,
    });
    setBusy(false);
    if (error) { setError(error.code === '23505' ? 'Bu banka referansı zaten girilmiş.' : error.message); return; }
    setAddOpen(false);
    router.refresh();
  }

  async function runImport() {
    setBusy(true); setImportResult(null);
    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
    let inserted = 0, skipped = 0; const bad: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[\t;]/).map((s) => s.trim());
      if (parts.length < 3) { bad.push(i + 1); continue; }
      const [d, y, a, desc, ref] = parts;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { bad.push(i + 1); continue; }
      const dir = /^(g|giris|giriş|\+)$/i.test(y) ? 'giris' : /^(c|cikis|çıkış|cıkıs|-)$/i.test(y) ? 'cikis' : null;
      if (!dir) { bad.push(i + 1); continue; }
      const amount = parseTrAmount(a);
      if (!Number.isFinite(amount) || amount <= 0) { bad.push(i + 1); continue; }
      const { error } = await sb.from('bank_transactions').insert({
        site_id: siteId, cash_account_id: accountId, txn_date: d, direction: dir, amount,
        description: desc?.trim() || null, bank_ref: ref?.trim() || null, created_by: managerId,
      });
      if (error) { if (error.code === '23505') skipped++; else bad.push(i + 1); } else inserted++;
    }
    setBusy(false);
    setImportResult(`${inserted} eklendi · ${skipped} atlandı (mükerrer)${bad.length ? ` · hatalı satır: ${bad.join(', ')}` : ''}`);
    router.refresh();
  }

  async function openMatch(t: Txn) {
    setMatchTxn(t); setCandLoading(true); setCandidates([]);
    const dir = t.direction;
    if (dir === 'giris') {
      // P8: bu hesaptakiler + sitenin hesapsız online tahsilatları (PayTR vb. bankaya düşer ama defterde hesapsız durur)
      const { data } = await sb.from('collections').select('id, amount, paid_at, method, cash_account_id')
        .eq('site_id', siteId)
        .or(`cash_account_id.eq.${accountId},and(cash_account_id.is.null,method.eq.online)`)
        .order('paid_at', { ascending: false }).limit(100);
      setCandidates((data ?? []).map((c) => ({
        kind: 'collection', id: c.id, amount: c.amount, date: c.paid_at,
        label: c.cash_account_id ? `Tahsilat · ${c.method}` : 'Online tahsilat · eşleşince bu hesaba bağlanır',
        needsAccountLink: !c.cash_account_id,
      })));
    } else {
      const { data } = await sb.from('cash_expenses').select('id, amount, spent_at, category, description').eq('cash_account_id', accountId).order('spent_at', { ascending: false }).limit(100);
      setCandidates((data ?? []).map((e) => ({ kind: 'expense', id: e.id, amount: e.amount, date: e.spent_at, label: e.description || e.category || 'Gider' })));
    }
    setCandLoading(false);
  }

  async function applyMatch(c: Candidate) {
    if (!matchTxn) return;
    // P8: hesapsız online tahsilat bu banka hesabına bağlanır (kasa bakiyesine artık dahil olur)
    if (c.kind === 'collection' && c.needsAccountLink) {
      const { error: cErr } = await sb.from('collections').update({ cash_account_id: accountId }).eq('id', c.id).eq('method', 'online');
      if (cErr) { alert('Eşleştirilemedi: ' + cErr.message); return; }
    }
    const patch = c.kind === 'collection'
      ? { match_status: 'matched', matched_collection_id: c.id, matched_expense_id: null }
      : { match_status: 'matched', matched_expense_id: c.id, matched_collection_id: null };
    const { error } = await sb.from('bank_transactions').update(patch).eq('id', matchTxn.id);
    if (error) {
      if (c.kind === 'collection' && c.needsAccountLink) {
        await sb.from('collections').update({ cash_account_id: null }).eq('id', c.id).eq('method', 'online');
      }
      alert('Eşleştirilemedi: ' + error.message); return;
    }
    setMatchTxn(null);
    router.refresh();
  }

  // Eşleşmiş online tahsilatın hesabını geri al (record_collection ile hesap alan banka/nakit tahsilatlarına dokunmaz)
  async function unlinkOnlineCollection(collectionId: string | null) {
    if (!collectionId) return;
    await sb.from('collections').update({ cash_account_id: null }).eq('id', collectionId).eq('method', 'online');
  }

  async function setStatus(t: Txn, status: 'unmatched' | 'ignored') {
    const { data: prev } = await sb.from('bank_transactions').select('matched_collection_id').eq('id', t.id).maybeSingle();
    const { error } = await sb.from('bank_transactions').update({ match_status: status, matched_collection_id: null, matched_expense_id: null }).eq('id', t.id);
    if (error) { alert('Güncellenemedi: ' + error.message); return; }
    await unlinkOnlineCollection(prev?.matched_collection_id ?? null); // P8 geri alma
    router.refresh();
  }

  async function deleteTxn(t: Txn) {
    if (!confirm('Bu ekstre satırı silinsin mi? (Tahsilat/gider kaydı silinmez; eşleşmiş online tahsilatın hesap bağı geri alınır.)')) return;
    const { data: prev } = await sb.from('bank_transactions').select('matched_collection_id').eq('id', t.id).maybeSingle();
    const { error } = await sb.from('bank_transactions').delete().eq('id', t.id);
    if (error) { alert('Silinemedi: ' + error.message); return; }
    await unlinkOnlineCollection(prev?.matched_collection_id ?? null); // P8 geri alma
    router.refresh();
  }

  return (
    <>
      {approveInfo && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{approveInfo}</p>}
      {importResult && <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{importResult}</p>}
      <Card
        title="Banka Ekstresi"
        action={
          ro ? undefined : (
            <div className="flex gap-2">
              <button onClick={() => { setImportText(''); setImportResult(null); setImportOpen(true); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Toplu İçe Aktar</button>
              <button onClick={openAdd} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ Hareket</button>
            </div>
          )
        }
      >
        {transactions.length === 0 ? (
          <EmptyState>Henüz banka hareketi yok. “Toplu İçe Aktar” ile ekstre yapıştırabilirsiniz.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Tarih</Th><Th>Açıklama</Th><Th>Ref</Th><Th className="text-right">Tutar</Th><Th>Durum</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const giris = t.direction === 'giris';
                const st = STATUS[t.match_status] ?? STATUS.unmatched;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <Td>{date(t.txn_date)}</Td>
                    <Td className="text-slate-700">{t.description || t.counterparty || '—'}</Td>
                    <Td className="text-slate-400">{t.bank_ref || '—'}</Td>
                    <Td className={`text-right font-semibold ${giris ? 'text-emerald-600' : 'text-red-600'}`}>{giris ? '+ ' : '− '}{money(t.amount, true)}</Td>
                    <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                    <Td className="text-right">
                      {ro ? <span className="text-xs text-slate-300">—</span> : (
                        <div className="flex justify-end gap-2.5">
                          {t.match_status !== 'matched' && giris && <button onClick={() => openApprove(t)} className="text-xs font-semibold text-emerald-600 hover:underline">Onayla → Tahsilat</button>}
                          {t.match_status !== 'matched' && <button onClick={() => openMatch(t)} className="text-xs font-semibold text-blue-600 hover:underline">Eşleştir</button>}
                          {t.match_status === 'matched' && <button onClick={() => setStatus(t, 'unmatched')} className="text-xs font-semibold text-amber-600 hover:underline">Kaldır</button>}
                          {t.match_status !== 'ignored' && <button onClick={() => setStatus(t, 'ignored')} className="text-xs font-semibold text-slate-500 hover:underline">Yoksay</button>}
                          <button onClick={() => deleteTxn(t)} className="text-xs font-semibold text-red-600 hover:underline">Sil</button>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Hareket ekle */}
      {addOpen && (
        <Modal title="Banka Hareketi Ekle" onClose={() => setAddOpen(false)}>
          <form onSubmit={addTxn} className="space-y-3">
            <Field label="Tarih"><input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Yön"><Segmented value={tDir} onChange={setTDir} options={[{ value: 'giris', label: 'Giriş (+)' }, { value: 'cikis', label: 'Çıkış (−)' }]} /></Field>
            <Field label="Tutar (₺) *"><input value={tAmount} onChange={(e) => setTAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" placeholder="örn. 750 veya 1.234,50" className={inputCls} /></Field>
            <Field label="Açıklama"><input value={tDesc} onChange={(e) => setTDesc(e.target.value)} className={inputCls} /></Field>
            <Field label="Karşı Taraf"><input value={tParty} onChange={(e) => setTParty(e.target.value)} className={inputCls} /></Field>
            <Field label="Banka Referansı"><input value={tRef} onChange={(e) => setTRef(e.target.value)} placeholder="Mükerrer eklemeyi önler" className={inputCls} /></Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? '…' : 'Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toplu içe aktar */}
      {importOpen && (
        <Modal title="Toplu Ekstre İçe Aktar" onClose={() => setImportOpen(false)}>
          <p className="mb-2 text-xs text-slate-500">
            Her satır (ayırıcı <code>;</code> veya TAB): <br />
            <code>tarih(YYYY-AA-GG) ; yön(g/+/giris | c/-/cikis) ; tutar ; açıklama ; ref</code><br />
            Mükerrer referanslar atlanır.
          </p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} placeholder={'2026-06-01;g;1500;Aidat tahsilatı;REF001\n2026-06-02;c;300,50;Temizlik;REF002'} className={`${inputCls} font-mono text-xs`} />
          {importResult && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{importResult}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setImportOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Kapat</button>
            <button onClick={runImport} disabled={busy || !importText.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Aktarılıyor…' : 'İçe Aktar'}</button>
          </div>
        </Modal>
      )}

      {/* Onayla → Daireye Tahsilat */}
      {approveTxn && (
        <Modal title="Onayla → Daireye Tahsilat" onClose={() => setApproveTxn(null)}>
          <p className="mb-3 text-sm text-slate-500">
            {date(approveTxn.txn_date)} · <span className="font-semibold text-emerald-600">+ {money(approveTxn.amount, true)}</span>
            {approveTxn.description ? ` · ${approveTxn.description}` : ''}
          </p>
          <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Bu havale onaylanınca seçilen daireye <strong>{money(approveTxn.amount, true)}</strong> tutarında tahsilat kaydı oluşturulur; en eski borçtan başlanarak mahsup edilir, artan tutar avans olarak kalır. Ekstre satırı “Eşleşti” olur.
          </p>
          <Field label="Daire *">
            <input
              value={approveSearch}
              onChange={(e) => setApproveSearch(e.target.value)}
              placeholder="Daire ara (blok / no)…"
              className={`${inputCls} mb-2`}
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {units
                .filter((u) => {
                  const term = approveSearch.trim().toLocaleLowerCase('tr');
                  return !term || unitLabel(u).toLocaleLowerCase('tr').includes(term);
                })
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setApproveUnitId(u.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${approveUnitId === u.id ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-700'}`}
                  >
                    <span>{unitLabel(u)}</span>
                    {approveUnitId === u.id && <span>✓</span>}
                  </button>
                ))}
              {units.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">Daire bulunamadı.</p>}
            </div>
          </Field>
          {approveError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{approveError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setApproveTxn(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
            <button onClick={confirmApprove} disabled={approveBusy || !approveUnitId} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{approveBusy ? 'Onaylanıyor…' : 'Onayla ve Tahsil Et'}</button>
          </div>
        </Modal>
      )}

      {/* Eşleştirme adayları */}
      {matchTxn && (
        <Modal title="Eşleştir" onClose={() => setMatchTxn(null)}>
          <p className="mb-3 text-sm text-slate-500">
            {date(matchTxn.txn_date)} · <span className={matchTxn.direction === 'giris' ? 'text-emerald-600' : 'text-red-600'}>{matchTxn.direction === 'giris' ? '+ ' : '− '}{money(matchTxn.amount, true)}</span>
            {' · '}{matchTxn.direction === 'giris' ? 'Tahsilat adayları' : 'Gider adayları'}
          </p>
          {candLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Yükleniyor…</p>
          ) : candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Uygun aday bulunamadı.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {candidates.map((c) => {
                const close = Math.abs(c.amount - matchTxn.amount) < 0.01;
                return (
                  <li key={c.id}>
                    <button onClick={() => applyMatch(c)} className="flex w-full items-center justify-between py-2.5 text-left hover:bg-slate-50">
                      <span className="text-sm text-slate-700">{c.label}<span className="block text-xs text-slate-400">{date(c.date)}</span></span>
                      <span className={`text-sm font-semibold ${close ? 'text-emerald-600' : 'text-slate-600'}`}>{money(c.amount, true)}{close ? ' ✓' : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}
