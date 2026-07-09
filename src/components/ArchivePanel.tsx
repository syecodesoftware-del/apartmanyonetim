'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type SiteDocument = {
  id: string;
  category: string;
  title: string;
  storage_path: string;
  mime: string | null;
  size_bytes: number | null;
  entity_type: string | null;
  entity_id: string | null;
  note: string | null;
  created_at: string;
  uploaded_by_name: string | null;
};

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'sozlesme', label: 'Sözleşme' },
  { key: 'tutanak', label: 'Tutanak' },
  { key: 'fatura', label: 'Fatura' },
  { key: 'ruhsat', label: 'Ruhsat' },
  { key: 'sigorta', label: 'Sigorta' },
  { key: 'rapor', label: 'Rapor' },
  { key: 'dilekce', label: 'Dilekçe' },
  { key: 'diger', label: 'Diğer' },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
const CAT_TONE: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = {
  sozlesme: 'blue', tutanak: 'slate', fatura: 'amber', ruhsat: 'green', sigorta: 'red', rapor: 'blue', dilekce: 'slate', diger: 'slate',
};
const ENTITY_LABEL: Record<string, string> = { work_order: 'İş Talebi', complaint: 'Şikayet', unit: 'Daire', announcement: 'Duyuru' };

function fmtSize(b: number | null): string {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function ArchivePanel({ siteId, documents: initial }: { siteId: string; documents: SiteDocument[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [docs, setDocs] = useState<SiteDocument[]>(initial);
  const [busy, setBusy] = useState(false);
  const [catFilter, setCatFilter] = useState('');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uTitle, setUTitle] = useState('');
  const [uCat, setUCat] = useState('sozlesme');
  const [uNote, setUNote] = useState('');
  const [uErr, setUErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const { data } = await supabaseBrowser().rpc('get_site_documents', {
      p_category: undefined, p_entity_type: undefined, p_entity_id: undefined,
    });
    setDocs((data ?? []) as unknown as SiteDocument[]);
  }

  async function submitUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setUErr('Dosya seçin.'); return; }
    if (!uTitle.trim()) { setUErr('Başlık girin.'); return; }
    if (file.size > 25 * 1024 * 1024) { setUErr('Dosya 25 MB sınırını aşıyor.'); return; }
    setBusy(true); setUErr('');
    const sb = supabaseBrowser();
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${siteId}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from('site-archive').upload(path, file, { contentType: file.type || undefined });
    if (up.error) { setBusy(false); setUErr('Yükleme hatası: ' + up.error.message); return; }
    const { error } = await sb.rpc('add_site_document', {
      p_category: uCat,
      p_title: uTitle.trim(),
      p_storage_path: path,
      p_mime: file.type || undefined,
      p_size_bytes: file.size,
      p_note: uNote.trim() || undefined,
    });
    if (error) {
      // metadata yazılamadıysa yüklenen dosyayı geri al (sızıntı bırakma)
      await sb.storage.from('site-archive').remove([path]);
      setBusy(false); setUErr(friendlyDbMessage(error.message)); return;
    }
    setBusy(false);
    setUploadOpen(false); setUTitle(''); setUCat('sozlesme'); setUNote('');
    if (fileRef.current) fileRef.current.value = '';
    await reload();
    router.refresh();
  }

  async function openDoc(d: SiteDocument) {
    const { data, error } = await supabaseBrowser().storage.from('site-archive').createSignedUrl(d.storage_path, 3600);
    if (error || !data?.signedUrl) { alert('Belge açılamadı: ' + (error?.message ?? '')); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function deleteDoc(d: SiteDocument) {
    if (!confirm(`"${d.title}" arşivden silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.rpc('delete_site_document', { p_id: d.id });
    if (error) { setBusy(false); alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await sb.storage.from('site-archive').remove([d.storage_path]);
    setBusy(false);
    await reload();
    router.refresh();
  }

  const filtered = catFilter ? docs.filter((d) => d.category === catFilter) : docs;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={catFilter === ''} onClick={() => setCatFilter('')}>Tümü</FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.key} active={catFilter === c.key} onClick={() => setCatFilter(c.key)}>{c.label}</FilterChip>
          ))}
        </div>
        {!ro && (
          <button
            onClick={() => { setUErr(''); setUploadOpen(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Belge Yükle
          </button>
        )}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState>Bu kategoride belge yok. Sağ üstten belge yükleyin.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Başlık</Th>
                  <Th>Kategori</Th>
                  <Th>Bağlı</Th>
                  <Th>Yükleyen</Th>
                  <Th>Tarih</Th>
                  <Th className="text-right">Boyut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <Td>
                      <button onClick={() => openDoc(d)} className="text-left font-medium text-blue-600 hover:underline">{d.title}</button>
                      {d.note && <p className="text-xs text-slate-400">{d.note}</p>}
                    </Td>
                    <Td><Badge tone={CAT_TONE[d.category] ?? 'slate'}>{CAT_LABEL[d.category] ?? d.category}</Badge></Td>
                    <Td className="text-slate-500">{d.entity_type ? ENTITY_LABEL[d.entity_type] ?? d.entity_type : '—'}</Td>
                    <Td className="text-slate-500">{d.uploaded_by_name ?? '—'}</Td>
                    <Td className="text-slate-400">{date(d.created_at)}</Td>
                    <Td className="text-right tabular-nums text-slate-400">{fmtSize(d.size_bytes)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <button onClick={() => openDoc(d)} className="text-xs text-blue-600 hover:underline">Aç</button>
                      {!ro && (
                        <button onClick={() => deleteDoc(d)} disabled={busy} className="ml-3 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {uploadOpen && (
        <Modal title="Belge Yükle" onClose={() => setUploadOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Dosya *">
              <input ref={fileRef} type="file" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
              <p className="mt-1 text-xs text-slate-400">En fazla 25 MB. PDF, görsel, ofis belgeleri.</p>
            </Field>
            <Field label="Başlık *">
              <input value={uTitle} onChange={(e) => setUTitle(e.target.value)} className={inputCls} placeholder="örn. 2026 Asansör Bakım Sözleşmesi" />
            </Field>
            <Field label="Kategori">
              <select value={uCat} onChange={(e) => setUCat(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Not (opsiyonel)">
              <input value={uNote} onChange={(e) => setUNote(e.target.value)} className={inputCls} />
            </Field>
            {uErr && <p className="text-sm text-red-600">{uErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setUploadOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitUpload} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Yükleniyor…' : 'Yükle'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
