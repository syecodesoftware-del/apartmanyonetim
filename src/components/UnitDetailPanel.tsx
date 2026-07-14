'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { CollectModal, type AccountOption } from '@/components/CollectModal';
import { WaiveControls } from '@/components/WaiveControls';
import { PhoneLink } from '@/components/PhoneLink';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type Tenancy = {
  id: string;
  user_id: string | null;
  relationship: string;
  full_name: string;
  phone: string | null;
  tc_kimlik: string | null;
  language?: string | null;
  notes?: string | null;
  start_date: string;
  end_date: string | null;
};
export type Vehicle = { id: string; plate: string; label: string | null; active: boolean };
export type ResidentOption = { id: string; full_name: string; phone: string | null; tc_kimlik: string | null };

const LANG_LABEL: Record<string, string> = { tr: 'Türkçe', en: 'English', ar: 'العربية', ru: 'Русский', de: 'Deutsch' };
const langLabel = (c: string | null | undefined) => (c ? LANG_LABEL[c] ?? c : null);

/** Sakin altında iletişim dili + serbest açıklama rozetleri (Rapor Madde 4/5). */
function PersonMeta({ t }: { t: Tenancy }) {
  const lang = langLabel(t.language);
  const hasLang = lang && t.language !== 'tr';
  if (!hasLang && !t.notes) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {hasLang && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">🌐 {lang}</span>}
      {t.notes && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700" title="Açıklama">📝 {t.notes}</span>}
    </div>
  );
}
export type LedgerRow = {
  id: string | null;
  tarih: string | null;
  tur: string | null; // 'tahakkuk' | 'tahsilat'
  aciklama: string | null;
  borc: number | null;
  odeme: number | null;
  durum: string | null; // 'open' | 'paid' | null
};

type FormState = { full_name: string; user_id: string; phone: string; tc: string; move_debt: boolean };
const emptyForm: FormState = { full_name: '', user_id: '', phone: '', tc: '', move_debt: false };

export function UnitDetailPanel({
  unitId,
  siteId,
  unitLabel,
  tenancies,
  totalDebt,
  kalanAnapara,
  kalanGecikme,
  ledger,
  residents,
  accounts = [],
  vehicles = [],
  siteName = '',
}: {
  unitId: string;
  siteId: string;
  unitLabel: string;
  tenancies: Tenancy[];
  totalDebt: number;
  kalanAnapara: number;
  kalanGecikme: number;
  ledger: LedgerRow[];
  residents: ResidentOption[];
  accounts?: AccountOption[];
  vehicles?: Vehicle[];
  siteName?: string;
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [modal, setModal] = useState<null | 'owner' | 'tenant'>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tahsilat modalı (ortak CollectModal)
  const [collectOpen, setCollectOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Tahsilat iptali (storno)
  const [cancelTarget, setCancelTarget] = useState<LedgerRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const currentOwner = tenancies.find((t) => t.relationship === 'malik' && !t.end_date) ?? null;
  const currentTenant = tenancies.find((t) => t.relationship === 'kiraci' && !t.end_date) ?? null;
  const history = tenancies.filter((t) => t.end_date);

  // Cari hesap ekstresi: kronolojik (eski → yeni) yürüyen bakiye ile
  let running = 0;
  const statement = ledger.map((r) => {
    running += Number(r.borc ?? 0) - Number(r.odeme ?? 0);
    return { ...r, bakiye: running };
  });
  // Güncel borç dökümü: kapatılmamış tahakkuklar
  const openAccruals = ledger.filter((r) => r.tur === 'tahakkuk' && r.durum === 'open');
  // Son ödemeler: tahsilatlar, yeniden eskiye
  const payments = ledger.filter((r) => r.tur === 'tahsilat').reverse();

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function openModal(kind: 'owner' | 'tenant') {
    setForm({ ...emptyForm });
    setError(null);
    setModal(kind);
  }
  function pickResident(id: string) {
    const r = residents.find((x) => x.id === id);
    if (!r) {
      setForm((f) => ({ ...f, user_id: '' }));
      return;
    }
    setForm((f) => ({ ...f, user_id: r.id, full_name: r.full_name, phone: r.phone ?? '', tc: r.tc_kimlik ?? '' }));
  }

  async function saveOccupant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError('Ad Soyad zorunludur.');
      return;
    }
    setBusy(true);
    const sb = supabaseBrowser();
    const common = {
      p_unit_id: unitId,
      p_phone: form.phone.trim() || undefined,
    };
    const { error } =
      modal === 'owner' && currentOwner
        ? await sb.rpc('transfer_unit_ownership', {
            ...common,
            p_new_full_name: form.full_name.trim(),
            p_new_user_id: form.user_id || undefined,
            p_new_phone: form.phone.trim() || undefined,
            p_new_tc: form.tc.trim() || undefined,
            p_move_owner_debt: form.move_debt,
          })
        : await sb.rpc('set_unit_occupant', {
            ...common,
            p_relationship: modal === 'owner' ? 'malik' : 'kiraci',
            p_full_name: form.full_name.trim(),
            p_user_id: form.user_id || undefined,
            p_tc_kimlik: form.tc.trim() || undefined,
          });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setModal(null);
    router.refresh();
  }

  async function transferTenantDebt() {
    if (!currentTenant) return;
    if (!window.confirm('Kiracının açık borcu mülk sahibine aktarılacak. Onaylıyor musunuz?')) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { data, error } = await sb.rpc('transfer_tenant_debt_to_owner', { p_unit_id: unitId });
    setBusy(false);
    if (error) {
      window.alert('Hata: ' + error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    window.alert(`${row?.moved_count ?? 0} kayıt aktarıldı (${money(Number(row?.moved_amount ?? 0), true)}).`);
    router.refresh();
  }

  function openCollect() {
    setInfo(null);
    setCollectOpen(true);
  }

  function openCancel(r: LedgerRow) {
    setCancelTarget(r);
    setCancelReason('');
    setCancelError('');
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Cari hesap ekstresini yazdır — sakine verilecek resmi döküm. */
  function printStatement() {
    const rows = statement.map((r) => {
      const isTahsilat = r.tur === 'tahsilat';
      return `<tr>
        <td>${date(r.tarih)}</td>
        <td>${isTahsilat ? 'Tahsilat' : 'Tahakkuk'}${r.durum === 'waived' ? ' (vazgeçildi)' : ''}</td>
        <td>${esc(r.aciklama ?? '')}</td>
        <td class="num">${Number(r.borc ?? 0) > 0.005 && r.durum !== 'waived' ? money(Number(r.borc), true) : ''}</td>
        <td class="num">${Number(r.odeme ?? 0) > 0.005 ? money(Number(r.odeme), true) : ''}</td>
        <td class="num">${money(r.bakiye, true)}</td>
      </tr>`;
    }).join('');
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Cari Hesap Ekstresi — ${esc(unitLabel)}</title>
<style>
body{font-family:Georgia,serif;color:#111;margin:36px;font-size:12px}
h1{font-size:16px;text-align:center;margin:0}
h2{font-size:13px;text-align:center;font-weight:normal;margin:4px 0 18px;color:#444}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #999;padding:4px 7px;text-align:left}
th{background:#f0f0f0;font-size:11px}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.totals td{font-weight:bold;background:#fafafa}
.foot{margin-top:22px;text-align:center;font-size:10px;color:#777}
@media print{body{margin:12mm}}
</style></head><body>
<h1>CARİ HESAP EKSTRESİ</h1>
<h2>${esc(siteName)} — Daire ${esc(unitLabel)}</h2>
<table>
<thead><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th class="num">Borç</th><th class="num">Ödeme</th><th class="num">Bakiye</th></tr></thead>
<tbody>
${rows}
<tr class="totals"><td colspan="5">GÜNCEL BAKİYE</td><td class="num">${money(totalDebt, true)}</td></tr>
</tbody></table>
<p class="foot">Bu ekstre ${new Date().toLocaleString('tr-TR')} tarihinde Komşu Asistanı üzerinden düzenlenmiştir.</p>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { window.alert('Yazdırma penceresi açılamadı (pop-up engelleyiciyi kapatın).'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  async function cancelCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTarget?.id) return;
    if (!cancelReason.trim()) { setCancelError('İptal gerekçesi zorunludur.'); return; }
    setCancelBusy(true); setCancelError('');
    const { error } = await supabaseBrowser().rpc('cancel_collection', {
      p_collection_id: cancelTarget.id, p_reason: cancelReason.trim(),
    });
    setCancelBusy(false);
    if (error) { setCancelError(friendlyDbMessage(error.message)); return; }
    setCancelTarget(null);
    setInfo('Tahsilat iptal edildi — mahsup edilen borçlar geri açıldı.');
    router.refresh();
  }

  async function removeOccupant(t: Tenancy) {
    const label = t.relationship === 'malik' ? 'mülk sahibini' : 'kiracıyı';
    if (!window.confirm(`Bu ${label} çıkarmak istediğinize emin misiniz?`)) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.rpc('end_tenancy', { p_tenancy_id: t.id });
    setBusy(false);
    if (error) {
      window.alert(
        error.message.includes('sahipsiz')
          ? 'Daire sahipsiz bırakılamaz: önce yeni mülk sahibi atayın.'
          : 'Hata: ' + error.message,
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {info}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* MÜLK SAHİBİ */}
        <Card
          title="Mülk Sahibi"
          action={
            ro ? undefined : (
              <button
                onClick={() => openModal('owner')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {currentOwner ? 'Değiştir' : 'Ata'}
              </button>
            )
          }
        >
          {currentOwner ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">{currentOwner.full_name}</p>
              {currentOwner.phone ? <PhoneLink phone={currentOwner.phone} /> : <p className="text-xs text-slate-500">Telefon yok</p>}
              <p className="text-xs text-slate-400">Başlangıç: {date(currentOwner.start_date)}</p>
              {currentOwner.user_id && <Badge tone="green">Uygulama kullanıcısı</Badge>}
              <PersonMeta t={currentOwner} />
            </div>
          ) : (
            <p className="text-sm text-red-600">⚠ Mülk sahibi atanmamış — daire sahipsiz olamaz.</p>
          )}
        </Card>

        {/* KİRACI */}
        <Card
          title="Kiracı"
          action={
            ro ? undefined : (
              <button
                onClick={() => openModal('tenant')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {currentTenant ? 'Değiştir' : 'Ekle'}
              </button>
            )
          }
        >
          {currentTenant ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{currentTenant.full_name}</p>
                {currentTenant.phone ? <PhoneLink phone={currentTenant.phone} /> : <p className="text-xs text-slate-500">Telefon yok</p>}
                <p className="text-xs text-slate-400">Başlangıç: {date(currentTenant.start_date)}</p>
                {currentTenant.user_id && <Badge tone="green">Uygulama kullanıcısı</Badge>}
                <PersonMeta t={currentTenant} />
              </div>
              {!ro && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {totalDebt > 0.005 && (
                    <button
                      onClick={transferTenantDebt}
                      disabled={busy}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                    >
                      Mülk Sahibine Aktar
                    </button>
                  )}
                  <button
                    onClick={() => removeOccupant(currentTenant)}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Kiracıyı Çıkar
                  </button>
                </div>
              )}
              {totalDebt > 0.005 && (
                <p className="text-xs text-amber-600">Bu dairenin açık borcu var: {money(totalDebt, true)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Kiracı yok (daire mülk sahibi tarafından kullanılıyor).</p>
          )}
        </Card>
      </div>

      {/* Araçlar (plaka) — bariyer/otopark modülü için */}
      {vehicles.length > 0 && (
        <Card title="Araçlar">
          <div className="flex flex-wrap gap-2">
            {vehicles.map((v) => (
              <span key={v.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono text-sm font-semibold text-slate-700">
                🚗 {v.plate}{v.label && <span className="font-sans text-xs font-normal text-slate-400">· {v.label}</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* GÜNCEL BORÇ DÖKÜMÜ */}
      <Card
        title="Güncel Borç Dökümü"
        action={
          ro ? undefined : (
            <button
              onClick={openCollect}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              💰 Tahsilat Al
            </button>
          )
        }
      >
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border-l-4 border-slate-300 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kalan Anapara</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">{money(kalanAnapara, true)}</p>
          </div>
          <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Gecikme Faizi</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-700">{money(kalanGecikme, true)}</p>
          </div>
          <div className={`rounded-lg border-l-4 px-3 py-2 ${totalDebt > 0.005 ? 'border-red-500 bg-red-50' : 'border-emerald-400 bg-emerald-50'}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${totalDebt > 0.005 ? 'text-red-500' : 'text-emerald-600'}`}>Toplam Borç</p>
            <p className={`mt-0.5 text-lg font-bold tabular-nums ${totalDebt > 0.005 ? 'text-red-600' : 'text-emerald-700'}`}>
              {money(totalDebt, true)}
            </p>
          </div>
        </div>
        {openAccruals.length === 0 ? (
          <EmptyState>Açık borç yok — daire güncel.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th>Açıklama</Th>
                <Th className="text-right">Tutar</Th>
              </tr>
            </thead>
            <tbody>
              {openAccruals.map((r, i) => (
                <tr key={r.id ?? i} className="border-l-2 border-red-400 hover:bg-slate-50">
                  <Td className="tabular-nums text-slate-400">{date(r.tarih)}</Td>
                  <Td className="font-medium text-slate-700">{r.aciklama ?? 'Tahakkuk'}</Td>
                  <Td className="text-right font-bold tabular-nums text-red-600">{money(Number(r.borc ?? 0), true)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* SON ÖDEMELER */}
      <Card title="Son Ödemeler">
        {payments.length === 0 ? (
          <EmptyState>Henüz ödeme kaydı yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th>Açıklama</Th>
                <Th className="text-right">Tutar</Th>
                {!ro && <Th className="text-right">İşlem</Th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((r, i) => (
                <tr key={r.id ?? i} className="border-l-2 border-emerald-400 hover:bg-slate-50">
                  <Td className="tabular-nums text-slate-400">{date(r.tarih)}</Td>
                  <Td className="font-medium text-slate-700">{r.aciklama ?? 'Tahsilat'}</Td>
                  <Td className="text-right font-bold tabular-nums text-emerald-600">
                    + {money(Number(r.odeme ?? 0), true)}
                  </Td>
                  {!ro && (
                    <Td className="text-right">
                      {r.id && (
                        <button onClick={() => openCancel(r)} className="text-xs font-semibold text-red-600 hover:underline">
                          İptal Et
                        </button>
                      )}
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* CARİ HESAP EKSTRESİ */}
      <Card
        title="Cari Hesap Ekstresi"
        action={
          statement.length > 0 ? (
            <button onClick={printStatement} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              🖨 Ekstreyi Yazdır
            </button>
          ) : undefined
        }
      >
        {statement.length === 0 ? (
          <EmptyState>Hareket kaydı yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th>Açıklama</Th>
                <Th className="text-right">Borç</Th>
                <Th className="text-right">Ödeme</Th>
                <Th className="text-right">Bakiye</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {statement.map((r, i) => {
                const borc = Number(r.borc ?? 0);
                const odeme = Number(r.odeme ?? 0);
                const isTahsilat = r.tur === 'tahsilat';
                const waived = r.durum === 'waived';
                return (
                  <tr
                    key={r.id ?? i}
                    className={`border-l-2 hover:bg-slate-50 ${isTahsilat ? 'border-emerald-400' : 'border-red-400'}`}
                  >
                    <Td className="tabular-nums text-slate-400">{date(r.tarih)}</Td>
                    <Td>
                      <span className="mr-2 inline-block align-middle">
                        <Badge tone={isTahsilat ? 'green' : 'amber'}>{isTahsilat ? 'Tahsilat' : 'Tahakkuk'}</Badge>
                      </span>
                      <span className="align-middle font-medium text-slate-700">
                        {r.aciklama ?? (isTahsilat ? 'Tahsilat' : 'Tahakkuk')}
                      </span>
                      {waived && <span className="ml-2 align-middle"><Badge tone="slate">Vazgeçildi</Badge></span>}
                    </Td>
                    <Td className={`text-right font-semibold tabular-nums ${waived ? 'text-slate-400 line-through' : 'text-red-600'}`}>
                      {borc > 0.005 ? money(borc, true) : <span className="font-normal text-slate-300">—</span>}
                    </Td>
                    <Td className="text-right font-semibold tabular-nums text-emerald-600">
                      {odeme > 0.005 ? `+ ${money(odeme, true)}` : <span className="font-normal text-slate-300">—</span>}
                    </Td>
                    <Td className={`text-right font-bold tabular-nums ${r.bakiye > 0.005 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {money(r.bakiye, true)}
                    </Td>
                    <Td className="text-right">
                      {r.tur === 'tahakkuk' && r.id ? <WaiveControls accrualId={r.id} durum={r.durum} /> : null}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="mt-3 flex items-center justify-end gap-2 rounded-lg bg-slate-50 px-4 py-2">
          <span className="text-sm font-medium text-slate-500">Güncel Bakiye</span>
          <span className={`text-lg font-bold tabular-nums ${totalDebt > 0.005 ? 'text-red-600' : 'text-emerald-600'}`}>
            {money(totalDebt, true)}
          </span>
        </div>
      </Card>

      {/* GEÇMİŞ */}
      <Card title="Geçmiş Sakinler">
        {history.length === 0 ? (
          <EmptyState>Geçmiş kayıt yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ad Soyad</Th>
                <Th>İlişki</Th>
                <Th>Telefon</Th>
                <Th>Başlangıç</Th>
                <Th>Bitiş</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{t.full_name}</Td>
                  <Td>
                    <Badge tone={t.relationship === 'malik' ? 'blue' : 'slate'}>
                      {t.relationship === 'malik' ? 'Mülk Sahibi' : 'Kiracı'}
                    </Badge>
                  </Td>
                  <Td className="text-slate-600">{t.phone ?? '—'}</Td>
                  <Td>{date(t.start_date)}</Td>
                  <Td>{t.end_date ? date(t.end_date) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {collectOpen && (
        <CollectModal
          siteId={siteId}
          unitId={unitId}
          unitLabel={unitLabel}
          siteName={siteName}
          totalDebt={totalDebt}
          accounts={accounts}
          onClose={() => setCollectOpen(false)}
          onDone={(msg) => { setCollectOpen(false); setInfo(msg); router.refresh(); }}
        />
      )}

      {cancelTarget && (
        <Modal title="Tahsilatı İptal Et" onClose={() => setCancelTarget(null)}>
          <p className="mb-3 text-sm text-slate-600">
            {date(cancelTarget.tarih)} tarihli <span className="font-semibold">{money(Number(cancelTarget.odeme ?? 0), true)}</span> tahsilat iptal edilecek.
            Mahsup edilen borçlar geri açılır; işlem denetim kaydına yazılır.
          </p>
          <form onSubmit={cancelCollection} className="space-y-3">
            <Field label="İptal Gerekçesi *">
              <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} autoFocus placeholder="örn. Tutar yanlış girildi" className={inputCls} />
            </Field>
            {cancelError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{cancelError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={cancelBusy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{cancelBusy ? 'İptal ediliyor…' : 'Tahsilatı İptal Et'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal && (
        <Modal
          title={
            modal === 'owner'
              ? currentOwner
                ? `Mülk Sahibini Değiştir — ${unitLabel}`
                : `Mülk Sahibi Ata — ${unitLabel}`
              : `Kiracı ${currentTenant ? 'Değiştir' : 'Ekle'} — ${unitLabel}`
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveOccupant} className="space-y-3">
            {residents.length > 0 && (
              <Field label="Mevcut sakinden seç (opsiyonel)">
                <select value={form.user_id} onChange={(e) => pickResident(e.target.value)} className={inputCls}>
                  <option value="">Manuel gir</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Ad Soyad *">
              <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Telefon">
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" className={inputCls} />
              </Field>
              <Field label="TC Kimlik">
                <input value={form.tc} onChange={(e) => set('tc', e.target.value)} inputMode="numeric" maxLength={11} className={inputCls} />
              </Field>
            </div>
            {modal === 'owner' && currentOwner && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.move_debt} onChange={(e) => set('move_debt', e.target.checked)} />
                Eski mülk sahibinin açık borçlarını yeni sahibe aktar
              </label>
            )}
            {modal === 'owner' && currentOwner && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Mevcut mülk sahibi ({currentOwner.full_name}) geçmişe taşınır, yeni sahip güncel olur. Daire bir an bile sahipsiz kalmaz.
              </p>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
