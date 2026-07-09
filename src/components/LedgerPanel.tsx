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

export function LedgerPanel({ siteName, initialYear, initial }: { siteName: string; initialYear: number; initial: Ledger | null }) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(0); // 0 = yıllık
  const [ledger, setLedger] = useState<Ledger | null>(initial);
  const [busy, setBusy] = useState(false);

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
        <button onClick={printLedger} disabled={!ledger || busy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
          🖨 Defteri Yazdır
        </button>
      </div>

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
