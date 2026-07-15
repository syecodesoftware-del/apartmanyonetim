'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { useReadOnly } from '@/components/ReadOnly';
import { date } from '@/lib/format';

export type ConsentPerson = {
  tenancy_id: string;
  full_name: string;
  relationship: string;
  block: string | null;
  apartment_number: string;
  phone: string | null;
  email: string | null;
};
export type ConsentRecord = { tenancy_id: string | null; status: string; generated_at: string };

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const relLabel = (r: string) => (r === 'malik' ? 'Mülk Sahibi' : r === 'kiraci' ? 'Kiracı' : r);

/** Rapor Madde 2: elle eklenen (app kullanmayan) sakinler için kişiye özel KVKK Açık Rıza formu.
 *  PDF = yazdırma penceresi (printIhtarname kalıbı). Üretim consent_forms'a kaydedilir.
 *  İmzalı PDF yükleme mimarisi hazır (consent-forms bucket + signed_file_path) — UI'da "yakında". */
export function ConsentPanel({ people, records, siteId, siteName, managerUserId }: {
  people: ConsentPerson[];
  records: ConsentRecord[];
  siteId: string;
  siteName: string;
  managerUserId: string;
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const genByTenancy = useMemo(() => {
    const m = new Map<string, ConsentRecord>();
    for (const r of records) if (r.tenancy_id) m.set(r.tenancy_id, r);
    return m;
  }, [records]);

  const filtered = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('tr');
    if (!t) return people;
    return people.filter((p) =>
      p.full_name.toLocaleLowerCase('tr').includes(t) ||
      [p.block, p.apartment_number].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(t));
  }, [people, q]);

  function buildFormHtml(p: ConsentPerson): string {
    const unit = [p.block, p.apartment_number].filter(Boolean).join(' / ') || '—';
    const iletisim = [p.phone, p.email].filter(Boolean).join(' · ') || '—';
    return `
      <section class="form">
        <h1>KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AÇIK RIZA BEYANI</h1>
        <p class="vs"><b>Veri Sorumlusu:</b> ${esc(siteName)} Apartman/Site Yönetimi</p>
        <table class="kv">
          <tr><td>Ad Soyad</td><td>${esc(p.full_name)}</td></tr>
          <tr><td>Daire</td><td>${esc(unit)} (${esc(relLabel(p.relationship))})</td></tr>
          <tr><td>İletişim Bilgileri</td><td>${esc(iletisim)}</td></tr>
        </table>
        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) kapsamında, tarafıma yapılan
        aydınlatma sonrasında; ad-soyad, T.C. kimlik numarası, iletişim (telefon/e-posta), daire/blok,
        araç plakası ve site yönetimiyle ilgili diğer kişisel verilerimin aşağıdaki amaçlarla
        <b>işlenmesine açık rıza veriyorum</b>:</p>
        <ul>
          <li>Aidat ve borç tahakkuku, tahsilat ve muhasebe kayıtlarının tutulması,</li>
          <li>Site yönetimi tarafından duyuru, bilgilendirme ve çağrıların iletilmesi (SMS, e-posta, telefon, uygulama bildirimi),</li>
          <li>Güvenlik, ziyaretçi/araç giriş-çıkış ve site hizmetlerinin yürütülmesi,</li>
          <li>Yasal yükümlülüklerin (genel kurul, defter tutma vb.) yerine getirilmesi.</li>
        </ul>
        <p>Kişisel verilerimin, yukarıdaki amaçlarla sınırlı olarak site yönetiminin hizmet aldığı
        tedarikçilere ve yetkili kamu kurumlarına aktarılabileceği konusunda bilgilendirildim.
        KVKK md. 11 kapsamındaki haklarımı (bilgi talep etme, düzeltme, silme vb.) veri sorumlusuna
        başvurarak kullanabileceğimi biliyorum. Bu rızayı dilediğim zaman geri alabilirim.</p>
        <div class="sign">
          <div><span>Tarih:</span> ....... / ....... / 20.......</div>
          <div><span>Ad Soyad:</span> ${esc(p.full_name)}</div>
          <div class="imza"><span>İmza:</span></div>
        </div>
      </section>`;
  }

  function openPrint(html: string) {
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) { alert('Yazdırma penceresi açılamadı (açılır pencere engellenmiş olabilir).'); return; }
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8">
      <title>KVKK Açık Rıza Formu</title>
      <style>
        *{box-sizing:border-box} body{font-family:Georgia,serif;color:#111;margin:0;padding:0;font-size:12.5px;line-height:1.55}
        .form{padding:18mm 16mm;page-break-after:always}
        .form:last-child{page-break-after:auto}
        h1{font-size:15px;text-align:center;margin:0 0 14px;text-transform:uppercase;letter-spacing:.3px}
        .vs{margin:0 0 10px}
        table.kv{width:100%;border-collapse:collapse;margin:8px 0 14px}
        table.kv td{border:1px solid #999;padding:6px 9px;vertical-align:top}
        table.kv td:first-child{width:32%;background:#f4f4f4;font-weight:bold}
        ul{margin:8px 0 12px 18px} li{margin:3px 0}
        .sign{margin-top:34px;display:flex;flex-direction:column;gap:14px}
        .sign span{color:#555;display:inline-block;min-width:78px}
        .imza{margin-top:6px}
        @media print{body{margin:0}}
      </style></head><body>${html}<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
    w.document.close();
    w.focus();
  }

  async function generate(p: ConsentPerson) {
    openPrint(buildFormHtml(p));
    if (ro) return;
    setBusyId(p.tenancy_id);
    await supabaseBrowser().from('consent_forms').insert({
      site_id: siteId,
      tenancy_id: p.tenancy_id,
      kind: 'kvkk_acik_riza',
      status: 'olusturuldu',
      generated_by: managerUserId,
    });
    setBusyId(null);
    router.refresh();
  }

  function printAll() {
    if (filtered.length === 0) return;
    openPrint(filtered.map(buildFormHtml).join(''));
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-slate-600">
          Mobil uygulamayı kullanmayan, bilgileri panele elle eklenen sakinler için
          <b> kişiye özel KVKK Açık Rıza Formu</b> oluşturun. Form yazdırılır, ıslak imza alınır ve
          arşivlenir. İmzalı PDF&apos;i sisteme yükleme özelliği yakında eklenecektir.
        </p>
      </Card>

      <Card
        title={`Sakinler (${people.length})`}
        action={
          <div className="flex items-center gap-2">
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: isim / daire"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            />
            <button onClick={printAll} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100" title="Listedeki tüm sakinler için tek çıktı">🖨 Toplu Yazdır</button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState>Kayıt yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Daire</Th><Th>Ad Soyad</Th><Th>Tip</Th><Th>İletişim</Th><Th>Durum</Th><Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const rec = genByTenancy.get(p.tenancy_id);
                return (
                  <tr key={p.tenancy_id} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap font-medium text-slate-800">{[p.block, p.apartment_number].filter(Boolean).join(' ') || '—'}</Td>
                    <Td>{p.full_name}</Td>
                    <Td><Badge tone={p.relationship === 'malik' ? 'blue' : 'slate'}>{relLabel(p.relationship)}</Badge></Td>
                    <Td className="text-slate-500">{[p.phone, p.email].filter(Boolean).join(' · ') || '—'}</Td>
                    <Td>
                      {rec
                        ? <Badge tone="green">Form üretildi · {date(rec.generated_at)}</Badge>
                        : <span className="text-xs text-slate-400">—</span>}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => generate(p)}
                          disabled={busyId === p.tenancy_id}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                        >📄 Form (PDF)</button>
                        <button
                          disabled
                          title="İmzalı PDF yükleme yakında"
                          className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-300"
                        >⬆ İmzalı Yükle</button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
