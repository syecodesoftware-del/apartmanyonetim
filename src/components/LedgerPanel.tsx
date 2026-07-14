'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge, StatCard } from '@/components/ui';
import { inputCls } from '@/components/UnitsPanel';
import { money, date } from '@/lib/format';

type Entry = {
  entry_date: string;
  entry_ts: string;
  kind: 'gelir' | 'gider';
  description: string;
  detail: string | null;
  account_name: string | null;
  amount: number;
};

export type Ledger = {
  year: number;
  month: number | null;
  devir: number;
  gelir_toplam: number;
  gider_toplam: number;
  kapanis: number;
  entries: Entry[];
};

const MONTHS = ['Tümü (Yıllık)', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', bank: 'Havale/EFT', online: 'Online', qr: 'QR' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function LedgerPanel({ siteName, siteId, initialYear, initial, lockedUntil = null, canLock = false }: {
  siteName: string; siteId: string; initialYear: number; initial: Ledger | null;
  lockedUntil?: string | null; canLock?: boolean;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(0); // 0 = yıllık
  const [ledger, setLedger] = useState<Ledger | null>(initial);
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState<string | null>(lockedUntil);
  const [lockBusy, setLockBusy] = useState(false);

  // Görüntülenen dönemin son günü (yıllık görünümde 31 Aralık)
  const periodEnd = month === 0
    ? `${year}-12-31`
    : new Date(year, month, 0).toISOString().slice(0, 10);

  async function setLedgerLock(until: string | null) {
    const msg = until
      ? `${date(until)} tarihine kadar (dahil) TÜM para kayıtları kilitlenecek: tahsilat, gider ve virman eklenemez, değiştirilemez, silinemez. Denetim/imza sonrası kullanın. Onaylıyor musunuz?`
      : 'Dönem kilidi kaldırılacak; geçmiş kayıtlar yeniden değiştirilebilir olur (işlem denetim kaydına yazılır). Onaylıyor musunuz?';
    if (!confirm(msg)) return;
    setLockBusy(true);
    // null bilinçli gönderilir (kilidi kaldırma) — undefined parametreyi düşürür ve çağrı eşleşmez
    const { error } = await supabaseBrowser().rpc('set_ledger_lock', { p_site_id: siteId, p_locked_until: until as unknown as string });
    setLockBusy(false);
    if (error) { alert('Kaydedilemedi: ' + error.message); return; }
    setLock(until);
  }

  async function load(y: number, m: number) {
    setBusy(true);
    const { data } = await supabaseBrowser().rpc('get_isletme_defteri', {
      p_year: y, p_month: m === 0 ? undefined : m,
    });
    setBusy(false);
    setLedger((data ?? null) as unknown as Ledger | null);
  }

  function printLedger() {
    if (!ledger) return;
    let running = Number(ledger.devir);
    const rows = ledger.entries.map((e) => {
      running += e.kind === 'gelir' ? Number(e.amount) : -Number(e.amount);
      return `<tr>
        <td>${date(e.entry_date)}</td>
        <td>${esc(e.description)}${e.account_name ? ` <span class="muted">(${esc(e.account_name)})</span>` : ' <span class="muted">(hesapsız/online)</span>'}</td>
        <td class="num">${e.kind === 'gelir' ? money(Number(e.amount), true) : ''}</td>
        <td class="num">${e.kind === 'gider' ? money(Number(e.amount), true) : ''}</td>
        <td class="num">${money(running, true)}</td>
      </tr>`;
    }).join('');
    const period = ledger.month ? `${MONTHS[ledger.month]} ${ledger.year}` : `${ledger.year} Yılı`;
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>İşletme Defteri — ${esc(siteName)}</title>
<style>
body{font-family:Georgia,serif;color:#111;margin:36px;font-size:13px}
h1{font-size:18px;text-align:center;margin:0}h2{font-size:14px;text-align:center;font-weight:normal;margin:4px 0 20px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{border:1px solid #999;padding:5px 8px;text-align:left}
th{background:#f0f0f0;font-size:12px}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.muted{color:#777;font-size:11px}
.totals td{font-weight:bold;background:#fafafa}
.sign{margin-top:48px;display:flex;justify-content:space-between}
.sign div{text-align:center;width:220px;border-top:1px solid #333;padding-top:6px;font-size:12px}
@media print{body{margin:12mm}}
</style></head><body>
<h1>İŞLETME DEFTERİ</h1>
<h2>${esc(siteName)} — ${period}</h2>
<table>
<thead><tr><th>Tarih</th><th>Açıklama</th><th class="num">Gelir</th><th class="num">Gider</th><th class="num">Bakiye</th></tr></thead>
<tbody>
<tr><td>—</td><td><strong>Devir</strong></td><td class="num"></td><td class="num"></td><td class="num"><strong>${money(Number(ledger.devir), true)}</strong></td></tr>
${rows}
<tr class="totals"><td colspan="2">TOPLAM</td><td class="num">${money(Number(ledger.gelir_toplam), true)}</td><td class="num">${money(Number(ledger.gider_toplam), true)}</td><td class="num">${money(Number(ledger.kapanis), true)}</td></tr>
</tbody></table>
<div class="sign"><div>Yönetici</div><div>Denetçi</div></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { alert('Yazdırma penceresi açılamadı (pop-up engelleyiciyi kapatın).'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  /** Rapor #37: denetçiye tek çıktı — dönem defteri + kasa bakiyeleri + banka mutabakat özeti + karar defteri. */
  async function printAuditPackage() {
    if (!ledger) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const [balRes, bankRes, decRes] = await Promise.all([
      sb.from('cash_account_balances').select('ad, tur, balance').eq('site_id', siteId).eq('is_active', true),
      sb.from('bank_transactions').select('match_status').eq('site_id', siteId),
      sb.rpc('get_board_decisions', { p_year: year }),
    ]);
    setBusy(false);

    const balances = (balRes.data ?? []) as { ad: string; tur: string; balance: number }[];
    const bank = (bankRes.data ?? []) as { match_status: string }[];
    const matched = bank.filter((b) => b.match_status === 'matched').length;
    const unmatched = bank.length - matched;
    const decisions = (decRes.data ?? []) as unknown as {
      decision_year: number; decision_no: number; decision_date: string; subject: string;
    }[];

    const period = ledger.month ? `${MONTHS[ledger.month]} ${ledger.year}` : `${ledger.year} Yılı`;
    let running = Number(ledger.devir);
    const ledgerRows = ledger.entries.map((e) => {
      running += e.kind === 'gelir' ? Number(e.amount) : -Number(e.amount);
      return `<tr><td>${date(e.entry_date)}</td><td>${esc(e.description)}${e.account_name ? ` <span class="muted">(${esc(e.account_name)})</span>` : ''}</td><td class="num">${e.kind === 'gelir' ? money(Number(e.amount), true) : ''}</td><td class="num">${e.kind === 'gider' ? money(Number(e.amount), true) : ''}</td><td class="num">${money(running, true)}</td></tr>`;
    }).join('');
    const balRows = balances.map((b) => `<tr><td>${esc(b.ad)}</td><td>${b.tur === 'banka' ? 'Banka' : 'Nakit'}</td><td class="num">${money(Number(b.balance), true)}</td></tr>`).join('');
    const totalBal = balances.reduce((s, b) => s + Number(b.balance ?? 0), 0);
    const decRows = decisions.length
      ? decisions.map((d) => `<tr><td>${d.decision_year}/${d.decision_no}</td><td>${d.decision_date ? esc(date(d.decision_date)) : '—'}</td><td>${esc(d.subject)}</td></tr>`).join('')
      : '<tr><td colspan="3" class="muted">Bu yıl için kayıtlı karar yok.</td></tr>';

    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Denetim Paketi — ${esc(siteName)}</title>
<style>
body{font-family:Georgia,serif;color:#111;margin:36px;font-size:13px}
h1{font-size:20px;text-align:center;margin:0}
h2{font-size:14px;text-align:center;font-weight:normal;margin:4px 0 24px;color:#444}
h3{font-size:14px;margin:26px 0 6px;border-bottom:2px solid #333;padding-bottom:3px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th,td{border:1px solid #999;padding:4px 8px;text-align:left}
th{background:#f0f0f0;font-size:12px}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.muted{color:#777;font-size:11px}
.totals td{font-weight:bold;background:#fafafa}
.sign{margin-top:56px;display:flex;justify-content:space-between}
.sign div{text-align:center;width:220px;border-top:1px solid #333;padding-top:6px;font-size:12px}
@media print{body{margin:12mm} h3{page-break-after:avoid}}
</style></head><body>
<h1>DENETİM PAKETİ</h1>
<h2>${esc(siteName)} — ${period}</h2>

<h3>1. İşletme Defteri</h3>
<table>
<thead><tr><th>Tarih</th><th>Açıklama</th><th class="num">Gelir</th><th class="num">Gider</th><th class="num">Bakiye</th></tr></thead>
<tbody>
<tr><td>—</td><td><strong>Devir</strong></td><td class="num"></td><td class="num"></td><td class="num"><strong>${money(Number(ledger.devir), true)}</strong></td></tr>
${ledgerRows}
<tr class="totals"><td colspan="2">TOPLAM</td><td class="num">${money(Number(ledger.gelir_toplam), true)}</td><td class="num">${money(Number(ledger.gider_toplam), true)}</td><td class="num">${money(Number(ledger.kapanis), true)}</td></tr>
</tbody></table>

<h3>2. Kasa & Banka Bakiyeleri (güncel)</h3>
<table>
<thead><tr><th>Hesap</th><th>Tür</th><th class="num">Bakiye</th></tr></thead>
<tbody>${balRows || '<tr><td colspan="3" class="muted">Kayıtlı hesap yok.</td></tr>'}
<tr class="totals"><td colspan="2">TOPLAM</td><td class="num">${money(totalBal, true)}</td></tr>
</tbody></table>

<h3>3. Banka Mutabakat Özeti</h3>
<table>
<thead><tr><th>Toplam Ekstre Satırı</th><th class="num">Eşleşen</th><th class="num">Eşleşmeyen</th></tr></thead>
<tbody><tr><td>${bank.length}</td><td class="num">${matched}</td><td class="num">${unmatched}</td></tr></tbody>
</table>
${unmatched > 0 ? `<p class="muted">${unmatched} banka hareketi henüz bir tahsilat/gider ile eşleştirilmemiş — mutabakat ekranından tamamlanmalı.</p>` : '<p class="muted">Tüm banka hareketleri eşleşmiş. ✓</p>'}

<h3>4. Karar Defteri (${year})</h3>
<table>
<thead><tr><th>No</th><th>Tarih</th><th>Konu</th></tr></thead>
<tbody>${decRows}</tbody>
</table>

<div class="sign"><div>Yönetici</div><div>Denetçi</div></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { alert('Yazdırma penceresi açılamadı (pop-up engelleyiciyi kapatın).'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  let running = ledger ? Number(ledger.devir) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Yıl</label>
            <select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); load(y, month); }} className={inputCls}>
              {Array.from({ length: 6 }, (_, i) => initialYear - 4 + i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Dönem</label>
            <select value={month} onChange={(e) => { const m = Number(e.target.value); setMonth(m); load(year, m); }} className={inputCls}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canLock && (
            lock ? (
              <button onClick={() => setLedgerLock(null)} disabled={lockBusy} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                🔓 Kilidi Kaldır
              </button>
            ) : (
              <button onClick={() => setLedgerLock(periodEnd)} disabled={lockBusy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Görüntülenen dönemin sonuna kadar tüm para kayıtlarını kilitler">
                🔒 Dönemi Kilitle
              </button>
            )
          )}
          <button onClick={printLedger} disabled={!ledger || busy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
            🖨 Defteri Yazdır
          </button>
          <button onClick={printAuditPackage} disabled={!ledger || busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" title="Dönem defteri + kasa bakiyeleri + banka mutabakat özeti + karar defteri tek çıktıda">
            📦 Denetim Paketi
          </button>
        </div>
      </div>

      {lock && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          🔒 <span className="font-semibold">{date(lock)}</span> tarihine kadar (dahil) defter kilitli — bu döneme tahsilat, gider ve virman eklenemez, değiştirilemez, silinemez.
        </p>
      )}

      {ledger && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Devir" value={money(Number(ledger.devir), true)} />
          <StatCard label="Gelir" value={money(Number(ledger.gelir_toplam), true)} tone="success" />
          <StatCard label="Gider" value={money(Number(ledger.gider_toplam), true)} tone={Number(ledger.gider_toplam) > 0 ? 'danger' : 'default'} />
          <StatCard label="Kapanış" value={money(Number(ledger.kapanis), true)} tone={Number(ledger.kapanis) >= 0 ? 'success' : 'danger'} />
        </div>
      )}

      <Card>
        {busy ? (
          <EmptyState>Yükleniyor…</EmptyState>
        ) : !ledger || ledger.entries.length === 0 ? (
          <EmptyState>Bu dönemde gelir/gider hareketi yok.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Tarih</Th>
                  <Th>Açıklama</Th>
                  <Th>Hesap</Th>
                  <Th className="text-right">Gelir</Th>
                  <Th className="text-right">Gider</Th>
                  <Th className="text-right">Bakiye</Th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50">
                  <Td className="text-slate-400">—</Td>
                  <Td className="font-medium">Devir</Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                  <Td className="text-right tabular-nums font-medium">{money(Number(ledger.devir), true)}</Td>
                </tr>
                {ledger.entries.map((e, idx) => {
                  running += e.kind === 'gelir' ? Number(e.amount) : -Number(e.amount);
                  return (
                    <tr key={idx}>
                      <Td className="whitespace-nowrap text-slate-500">{date(e.entry_date)}</Td>
                      <Td>
                        {e.description}
                        {e.detail && <span className="ml-1 text-xs text-slate-400">({METHOD_LABEL[e.detail] ?? e.detail})</span>}
                      </Td>
                      <Td className="text-xs text-slate-400">{e.account_name ?? <Badge tone="amber">hesapsız</Badge>}</Td>
                      <Td className="text-right tabular-nums text-emerald-600">{e.kind === 'gelir' ? money(Number(e.amount), true) : ''}</Td>
                      <Td className="text-right tabular-nums text-red-600">{e.kind === 'gider' ? money(Number(e.amount), true) : ''}</Td>
                      <Td className="text-right tabular-nums text-slate-600">{money(running, true)}</Td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-medium">
                  <td colSpan={3} className="border-b border-slate-50 px-3 py-2 text-slate-700">TOPLAM</td>
                  <Td className="text-right tabular-nums text-emerald-700">{money(Number(ledger.gelir_toplam), true)}</Td>
                  <Td className="text-right tabular-nums text-red-700">{money(Number(ledger.gider_toplam), true)}</Td>
                  <Td className="text-right tabular-nums">{money(Number(ledger.kapanis), true)}</Td>
                </tr>
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-slate-400">
        "Hesapsız" satırlar online tahsilatlardır; banka mutabakatında hesapla eşleştirildiğinde hesap adı görünür.
      </p>
    </div>
  );
}
