'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  id_no: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_wage: number | null;
  active: boolean;
  note: string | null;
};

const ROLES: { key: string; label: string }[] = [
  { key: 'kapici', label: 'Kapıcı' },
  { key: 'guvenlik', label: 'Güvenlik' },
  { key: 'temizlik', label: 'Temizlik' },
  { key: 'teknik', label: 'Teknik' },
  { key: 'bahce', label: 'Bahçe' },
  { key: 'yonetici', label: 'Yönetici' },
  { key: 'diger', label: 'Diğer' },
];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.key, r.label]));

type Form = {
  id: string | null; full_name: string; role: string; phone: string; id_no: string;
  start_date: string; end_date: string; monthly_wage: string; active: boolean; note: string;
};
const EMPTY_FORM: Form = {
  id: null, full_name: '', role: 'kapici', phone: '', id_no: '', start_date: '', end_date: '', monthly_wage: '', active: true, note: '',
};

export function StaffPanel({ staff: initial }: { staff: StaffMember[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [staff, setStaff] = useState<StaffMember[]>(initial);
  const [showInactive, setShowInactive] = useState(false);
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [err, setErr] = useState('');

  async function reload(includeInactive: boolean) {
    const { data } = await supabaseBrowser().rpc('get_staff', { p_include_inactive: includeInactive });
    setStaff((data ?? []) as unknown as StaffMember[]);
  }

  async function toggleInactive() {
    const next = !showInactive;
    setShowInactive(next);
    await reload(next);
  }

  function openNew() { setForm(EMPTY_FORM); setErr(''); setOpen(true); }
  function openEdit(s: StaffMember) {
    setForm({
      id: s.id, full_name: s.full_name, role: s.role, phone: s.phone ?? '', id_no: s.id_no ?? '',
      start_date: s.start_date ?? '', end_date: s.end_date ?? '', monthly_wage: s.monthly_wage != null ? String(s.monthly_wage) : '',
      active: s.active, note: s.note ?? '',
    });
    setErr(''); setOpen(true);
  }

  async function submit() {
    if (!form.full_name.trim()) { setErr('İsim girin.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('save_staff', {
      p_id: form.id,
      p_full_name: form.full_name.trim(),
      p_role: form.role,
      p_phone: form.phone.trim() || undefined,
      p_id_no: form.id_no.trim() || undefined,
      p_start_date: form.start_date || undefined,
      p_end_date: form.end_date || undefined,
      p_monthly_wage: form.monthly_wage ? Number(form.monthly_wage.replace(',', '.')) : undefined,
      p_active: form.active,
      p_note: form.note.trim() || undefined,
    });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpen(false);
    await reload(showInactive);
    router.refresh();
  }

  async function remove(s: StaffMember) {
    if (!confirm(`"${s.full_name}" personel kaydı silinsin mi? (Ayrılan personeli silmek yerine "pasif" yapabilirsiniz.)`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_staff', { p_id: s.id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload(showInactive);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={toggleInactive} disabled={busy} />
          Ayrılan personeli de göster
        </label>
        {!ro && (
          <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Personel Ekle
          </button>
        )}
      </div>

      <Card>
        {staff.length === 0 ? (
          <EmptyState>Kayıtlı personel yok. Sağ üstten ekleyin.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Ad Soyad</Th>
                  <Th>Görev</Th>
                  <Th>Telefon</Th>
                  <Th>Başlangıç</Th>
                  <Th className="text-right">Ücret</Th>
                  <Th>Durum</Th>
                  {!ro && <Th></Th>}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <span className="font-medium">{s.full_name}</span>
                      {s.note && <p className="text-xs text-slate-400">{s.note}</p>}
                    </Td>
                    <Td className="text-slate-500">{ROLE_LABEL[s.role] ?? s.role}</Td>
                    <Td className="text-slate-500">{s.phone ?? '—'}</Td>
                    <Td className="text-slate-400">{s.start_date ? date(s.start_date) : '—'}</Td>
                    <Td className="text-right tabular-nums text-slate-500">{s.monthly_wage != null ? money(Number(s.monthly_wage), true) : '—'}</Td>
                    <Td>{s.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Ayrıldı</Badge>}</Td>
                    {!ro && (
                      <Td className="whitespace-nowrap text-right">
                        <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                        <button onClick={() => remove(s)} disabled={busy} className="ml-3 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <ShiftSchedule staff={staff} />

      {open && (
        <Modal title={form.id ? 'Personel Düzenle' : 'Personel Ekle'} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Ad Soyad *">
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Görev">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                  {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Telefon"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TC Kimlik (opsiyonel)"><input value={form.id_no} onChange={(e) => setForm({ ...form, id_no: e.target.value })} className={inputCls} /></Field>
              <Field label="Aylık Ücret (₺)"><input value={form.monthly_wage} onChange={(e) => setForm({ ...form, monthly_wage: e.target.value })} className={inputCls} inputMode="decimal" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Başlangıç"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} /></Field>
              <Field label="Ayrılış (varsa)"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Aktif çalışıyor
            </label>
            <Field label="Not"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

type Shift = {
  id: string; staff_id: string; shift_date: string; start_time: string; end_time: string;
  note: string | null; overnight: boolean; staff_name: string; staff_role: string; staff_active: boolean;
};
type ShiftForm = { id: string | null; staff_id: string; shift_date: string; start: string; end: string; note: string };

const hhmm = (t: string) => t.slice(0, 5);
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Pzt=0
  return x;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function ShiftSchedule({ staff }: { staff: StaffMember[] }) {
  const ro = useReadOnly();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ShiftForm>({ id: null, staff_id: '', shift_date: '', start: '08:00', end: '16:00', note: '' });
  const [err, setErr] = useState('');

  const weekIso = toISO(weekStart);
  useEffect(() => {
    let alive = true;
    const from = weekIso;
    const to = toISO(addDays(new Date(weekIso + 'T00:00:00'), 6));
    supabaseBrowser().rpc('get_staff_shifts', { p_from: from, p_to: to }).then(({ data }) => {
      if (alive) setShifts((data ?? []) as unknown as Shift[]);
    });
    return () => { alive = false; };
  }, [weekIso]);

  async function reload() {
    const to = toISO(addDays(weekStart, 6));
    const { data } = await supabaseBrowser().rpc('get_staff_shifts', { p_from: weekIso, p_to: to });
    setShifts((data ?? []) as unknown as Shift[]);
  }

  const activeStaff = staff.filter((s) => s.active);

  function openNew(dateIso: string) {
    setForm({ id: null, staff_id: activeStaff[0]?.id ?? '', shift_date: dateIso, start: '08:00', end: '16:00', note: '' });
    setErr(''); setOpen(true);
  }
  function openEdit(sh: Shift) {
    setForm({ id: sh.id, staff_id: sh.staff_id, shift_date: sh.shift_date, start: hhmm(sh.start_time), end: hhmm(sh.end_time), note: sh.note ?? '' });
    setErr(''); setOpen(true);
  }
  async function submit() {
    if (!form.staff_id) { setErr('Personel seçin.'); return; }
    if (!form.shift_date || !form.start || !form.end) { setErr('Tarih ve saatleri girin.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('save_staff_shift', {
      p_id: form.id, p_staff_id: form.staff_id, p_date: form.shift_date,
      p_start: form.start, p_end: form.end, p_note: form.note.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      setErr(error.message.includes('staff_shifts_no_exact_dup') || error.message.includes('duplicate key')
        ? 'Bu personelin bu gün ve başlangıç saatinde zaten vardiyası var.'
        : error.message.includes('TIMES_EQUAL') ? 'Başlangıç ve bitiş saati aynı olamaz.'
        : friendlyDbMessage(error.message));
      return;
    }
    setOpen(false);
    await reload();
  }
  async function remove(sh: Shift) {
    if (!confirm(`${sh.staff_name} · ${date(sh.shift_date)} ${hhmm(sh.start_time)}–${hhmm(sh.end_time)} vardiyası silinsin mi?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_staff_shift', { p_id: sh.id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload();
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayIso = toISO(new Date());

  return (
    <Card
      title="Vardiya Çizelgesi"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">‹ Önceki</button>
          <button onClick={() => setWeekStart(mondayOf(new Date()))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Bu hafta</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Sonraki ›</button>
        </div>
      }
    >
      <p className="mb-2 text-xs text-slate-400">
        {date(toISO(weekStart))} – {date(toISO(addDays(weekStart, 6)))} · Bitiş saati başlangıçtan küçükse vardiya ertesi güne sarkar (gece vardiyası).
      </p>
      <div className="flex flex-col divide-y divide-slate-100">
        {days.map((d) => {
          const iso = toISO(d);
          const dayShifts = shifts.filter((s) => s.shift_date === iso);
          return (
            <div key={iso} className={`flex flex-wrap items-center gap-2 py-2 ${iso === todayIso ? 'bg-blue-50/50' : ''}`}>
              <div className="w-32 shrink-0 text-sm">
                <span className="font-medium text-slate-700">{d.toLocaleDateString('tr-TR', { weekday: 'long' })}</span>
                <span className="ml-1 text-xs text-slate-400">{d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {dayShifts.length === 0 && <span className="text-xs text-slate-300">—</span>}
                {dayShifts.map((sh) => (
                  <span key={sh.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700" title={sh.note ?? undefined}>
                    <button onClick={() => !ro && openEdit(sh)} className={ro ? 'cursor-default' : 'hover:underline'} disabled={ro}>
                      <span className="font-medium">{sh.staff_name}</span>{' '}
                      <span className="tabular-nums text-slate-500">{hhmm(sh.start_time)}–{hhmm(sh.end_time)}{sh.overnight ? ' +1g' : ''}</span>
                      {sh.note ? ' 📝' : ''}
                    </button>
                    {!ro && (
                      <button onClick={() => remove(sh)} disabled={busy} className="text-slate-400 hover:text-red-600 disabled:opacity-50">×</button>
                    )}
                  </span>
                ))}
                {!ro && (
                  <button onClick={() => openNew(iso)} className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 hover:border-blue-400 hover:text-blue-600">+</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title={form.id ? 'Vardiya Düzenle' : 'Vardiya Ekle'} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Personel *">
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className={inputCls}>
                {activeStaff.length === 0 && <option value="">Aktif personel yok</option>}
                {activeStaff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({ROLE_LABEL[s.role] ?? s.role})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tarih *"><input type="date" value={form.shift_date} onChange={(e) => setForm({ ...form, shift_date: e.target.value })} className={inputCls} /></Field>
              <Field label="Başlangıç *"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputCls} /></Field>
              <Field label="Bitiş *"><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputCls} /></Field>
            </div>
            {form.start && form.end && form.end <= form.start && (
              <p className="text-xs text-amber-600">Bitiş başlangıçtan önce: vardiya ertesi güne sarkar (gece vardiyası).</p>
            )}
            <Field label="Not"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} placeholder="örn. yıllık izin yerine" /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
