'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card } from '@/components/ui';
import { Field, inputCls } from '@/components/UnitsPanel';
import { money } from '@/lib/format';

export type SiteInfo = { name: string; address: string | null; city: string | null; district: string | null; site_code: string };
export type Occupant = {
  unit_id: string;
  block: string | null;
  apartment_number: string | null;
  user_id: string | null;
  full_name: string | null;
  relationship: string | null;
  phone: string | null;
  tc_kimlik: string | null;
  toplam_borc: number | null;
  kalan_anapara: number | null;
  kalan_gecikme: number | null;
};

type DocType = 'borcsuzluk' | 'ihtar' | 'avukat';
type OpenAccrual = { period_month: number; period_year: number; amount: number; principal_remaining: number; due_date: string };

const DOC_LABELS: Record<DocType, string> = {
  borcsuzluk: 'Borçsuzluk Belgesi',
  ihtar: 'İhtar Yazısı',
  avukat: 'Avukat Devir Formu',
};

const MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function tl(n: number | null | undefined) {
  return money(Number(n ?? 0), true);
}
function todayTr() {
  return new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function unitLabel(o: Occupant) {
  return `${o.block ? o.block + ' ' : ''}${o.apartment_number ?? '—'}`;
}
function esc(s: string | null | undefined) {
  return (s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

export function DocumentsPanel({ site, occupants, managerName }: { site: SiteInfo | null; occupants: Occupant[]; managerName: string | null }) {
  const [type, setType] = useState<DocType>('borcsuzluk');
  const [occKey, setOccKey] = useState('');
  const [accruals, setAccruals] = useState<OpenAccrual[]>([]);
  const [loading, setLoading] = useState(false);

  // occKey = unit_id + '|' + (user_id ?? '')
  const selected = occupants.find((o) => `${o.unit_id}|${o.user_id ?? ''}` === occKey) ?? null;

  async function onSelect(key: string) {
    setOccKey(key);
    setAccruals([]);
    const occ = occupants.find((o) => `${o.unit_id}|${o.user_id ?? ''}` === key);
    if (!occ) return;
    setLoading(true);
    const { data } = await supabaseBrowser()
      .from('accruals')
      .select('period_month, period_year, amount, principal_remaining, due_date')
      .eq('unit_id', occ.unit_id)
      .eq('status', 'open')
      .order('period_year')
      .order('period_month');
    setLoading(false);
    setAccruals((data ?? []) as OpenAccrual[]);
  }

  const html = useMemo(() => {
    if (!selected || !site) return '';
    return buildDocHtml(type, site, selected, accruals, managerName);
  }, [type, site, selected, accruals, managerName]);

  function printDoc() {
    if (!html) return;
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) { alert('Yazdırma penceresi açılamadı (pop-up engelleyiciyi kapatın).'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  const debtWarn = type === 'borcsuzluk' && selected && Number(selected.toplam_borc ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Belge Türü">
            <select value={type} onChange={(e) => setType(e.target.value as DocType)} className={inputCls}>
              <option value="borcsuzluk">Borçsuzluk Belgesi</option>
              <option value="ihtar">İhtar Yazısı (borç bildirimi)</option>
              <option value="avukat">Avukat Devir Formu</option>
            </select>
          </Field>
          <Field label="Kişi / Daire">
            <select value={occKey} onChange={(e) => onSelect(e.target.value)} className={inputCls}>
              <option value="">— Seçin —</option>
              {occupants.map((o) => (
                <option key={`${o.unit_id}|${o.user_id ?? ''}`} value={`${o.unit_id}|${o.user_id ?? ''}`}>
                  {unitLabel(o)} · {o.full_name ?? 'Sakin yok'} ({o.relationship === 'malik' ? 'Malik' : 'Kiracı'}) · borç {tl(o.toplam_borc)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {debtWarn && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            ⚠️ Bu kişinin {tl(selected!.toplam_borc)} borcu var — borçsuzluk belgesi borç bulunmayanlar için düzenlenir.
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={printDoc}
            disabled={!selected || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            🖨️ Yazdır / PDF
          </button>
        </div>
      </Card>

      {selected && site && (
        <Card title={`Önizleme — ${DOC_LABELS[type]}`}>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Borç detayı yükleniyor…</p>
          ) : (
            <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <iframe title="Belge önizleme" srcDoc={html} className="h-[640px] w-full rounded" />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function buildDocHtml(type: DocType, site: SiteInfo, o: Occupant, accruals: OpenAccrual[], managerName: string | null): string {
  const siteAddr = [site.address, site.district, site.city].filter(Boolean).join(', ');
  const debt = Number(o.toplam_borc ?? 0);
  const anapara = Number(o.kalan_anapara ?? 0);
  const gecikme = Number(o.kalan_gecikme ?? 0);
  const roleLabel = o.relationship === 'malik' ? 'Malik' : 'Kiracı';

  const accrualRows = accruals
    .map(
      (a) => `<tr>
        <td>${MONTHS[a.period_month] ?? a.period_month} ${a.period_year}</td>
        <td>${esc(a.due_date)}</td>
        <td class="r">${tl(a.amount)}</td>
        <td class="r">${tl(a.principal_remaining)}</td>
      </tr>`,
    )
    .join('');

  let title = '';
  let body = '';

  if (type === 'borcsuzluk') {
    title = 'BORÇSUZLUK BELGESİ';
    body = `
      <p>Aşağıda kimlik ve konut bilgileri yer alan kişinin, yönetimimiz kayıtlarına göre
      işbu belgenin düzenlendiği tarih itibarıyla <b>birikmiş aidat / işletme gideri borcu bulunmamaktadır.</b></p>
      <table class="kv">
        <tr><th>Ad Soyad</th><td>${esc(o.full_name)}</td></tr>
        <tr><th>T.C. Kimlik No</th><td>${esc(o.tc_kimlik) || '—'}</td></tr>
        <tr><th>Konut</th><td>${esc(unitLabel(o))} (${roleLabel})</td></tr>
        <tr><th>Güncel Borç</th><td><b>${tl(debt)}</b></td></tr>
      </table>
      <p>İşbu belge ilgilinin talebi üzerine düzenlenmiştir.</p>`;
  } else if (type === 'ihtar') {
    title = 'İHTAR / BORÇ BİLDİRİM YAZISI';
    body = `
      <p>Sayın <b>${esc(o.full_name)}</b>,</p>
      <p>${esc(site.name)} yönetimi kayıtlarına göre, <b>${esc(unitLabel(o))}</b> numaralı konuta ait
      ödenmemiş aidat / işletme gideri borcunuz aşağıda dökümü verildiği şekilde
      <b>${tl(debt)}</b> (anapara ${tl(anapara)} + gecikme ${tl(gecikme)}) tutarındadır.</p>
      ${accruals.length ? `<table class="grid">
        <thead><tr><th>Dönem</th><th>Vade</th><th class="r">Tahakkuk</th><th class="r">Kalan</th></tr></thead>
        <tbody>${accrualRows}</tbody>
      </table>` : '<p><i>Açık tahakkuk kaydı bulunmamaktadır.</i></p>'}
      <p>Kat Mülkiyeti Kanunu'nun ilgili hükümleri uyarınca, işbu bildirimin tarafınıza ulaşmasından
      itibaren <b>yedi (7) gün</b> içinde ödeme yapmanızı; aksi hâlde yasal takip başlatılacağını ve
      gecikme tazminatının işlemeye devam edeceğini önemle ihtar ederiz.</p>`;
  } else {
    title = 'AVUKATA DEVİR / İCRA TAKİP FORMU';
    body = `
      <p>Aşağıdaki borçlu hakkında yasal takip başlatılması için dosya avukata devredilmiştir.</p>
      <table class="kv">
        <tr><th>Borçlu</th><td>${esc(o.full_name)} (${roleLabel})</td></tr>
        <tr><th>T.C. Kimlik No</th><td>${esc(o.tc_kimlik) || '—'}</td></tr>
        <tr><th>Telefon</th><td>${esc(o.phone) || '—'}</td></tr>
        <tr><th>Konut</th><td>${esc(unitLabel(o))}</td></tr>
        <tr><th>Toplam Borç</th><td><b>${tl(debt)}</b></td></tr>
        <tr><th>— Anapara</th><td>${tl(anapara)}</td></tr>
        <tr><th>— Gecikme</th><td>${tl(gecikme)}</td></tr>
      </table>
      ${accruals.length ? `<h3>Açık Tahakkuk Dökümü</h3><table class="grid">
        <thead><tr><th>Dönem</th><th>Vade</th><th class="r">Tahakkuk</th><th class="r">Kalan</th></tr></thead>
        <tbody>${accrualRows}</tbody>
      </table>` : ''}`;
  }

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; font-size: 13px; line-height: 1.6; }
    .head { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 24px; }
    .head h1 { font-size: 16px; margin: 0 0 4px; letter-spacing: .5px; }
    .head .sub { font-size: 12px; color: #64748b; }
    h2 { font-size: 15px; text-align: center; margin: 24px 0; letter-spacing: 1px; }
    h3 { font-size: 13px; margin: 18px 0 8px; }
    p { margin: 10px 0; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    table.kv th { text-align: left; width: 180px; padding: 5px 8px; color: #475569; font-weight: 600; vertical-align: top; }
    table.kv td { padding: 5px 8px; }
    table.grid th, table.grid td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 12px; }
    table.grid th { background: #f1f5f9; text-align: left; }
    .r { text-align: right; }
    .foot { margin-top: 48px; display: flex; justify-content: space-between; }
    .sign { text-align: center; width: 220px; }
    .sign .line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 4px; font-size: 12px; color: #475569; }
    .date { text-align: right; color: #475569; margin-top: 8px; }
    @media print { body { padding: 24px; } }
  </style></head><body>
    <div class="head">
      <h1>${esc(site.name)}</h1>
      <div class="sub">${esc(siteAddr) || ''}${site.site_code ? ' · Site Kodu: ' + esc(site.site_code) : ''}</div>
    </div>
    <div class="date">Tarih: ${todayTr()}</div>
    <h2>${title}</h2>
    ${body}
    <div class="foot">
      <div></div>
      <div class="sign"><div class="line">${esc(site.name)} Yönetimi${managerName ? '<br>' + esc(managerName) : ''}</div></div>
    </div>
  </body></html>`;
}
