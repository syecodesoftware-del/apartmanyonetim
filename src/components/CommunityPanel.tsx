'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type CommunityPost = {
  id: string; kind: string; title: string; body: string | null; price: number | null;
  contact_info: string | null; status: string; created_at: string; removed_reason: string | null;
  author_name: string | null; author_unit: string | null; is_mine: boolean;
  photos: string[] | null; category: string | null;
};
export type Campaign = {
  id: string; title: string; vendor_name: string | null; description: string | null;
  discount_text: string | null; valid_until: string | null; active: boolean; created_at: string;
};

const POST_STATUS: Record<string, { label: string; tone: 'green' | 'blue' | 'slate' | 'red' }> = {
  aktif: { label: 'Aktif', tone: 'green' },
  satildi: { label: 'Satıldı', tone: 'blue' },
  kaldirildi: { label: 'Kaldırıldı', tone: 'slate' },
  moderasyon: { label: 'Moderasyonla Kaldırıldı', tone: 'red' },
};
const KIND_LABEL: Record<string, string> = { pazar: 'Pazar', paylasim: 'Paylaşım' };
const CAT_LABEL: Record<string, string> = {
  esya: 'Eşya & Mobilya', elektronik: 'Elektronik', giyim: 'Giyim',
  kitap: 'Kitap & Hobi', bebek: 'Bebek & Çocuk', spor: 'Spor', diger: 'Diğer',
};

type CampForm = { id: string | null; title: string; vendor_name: string; description: string; discount_text: string; valid_until: string; active: boolean };
const EMPTY_CAMP: CampForm = { id: null, title: '', vendor_name: '', description: '', discount_text: '', valid_until: '', active: true };

export function CommunityPanel({ canModerate, posts: initP, campaigns: initC }: {
  canModerate: boolean; posts: CommunityPost[]; campaigns: Campaign[];
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [tab, setTab] = useState<'posts' | 'campaigns'>('posts');
  const [posts, setPosts] = useState<CommunityPost[]>(initP);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initC);
  const [busy, setBusy] = useState(false);

  const [campOpen, setCampOpen] = useState(false);
  const [campForm, setCampForm] = useState<CampForm>(EMPTY_CAMP);
  const [campErr, setCampErr] = useState('');

  async function reload() {
    const sb = supabaseBrowser();
    const [{ data: p }, { data: c }] = await Promise.all([
      sb.rpc('get_community_posts', { p_kind: undefined }),
      sb.rpc('get_campaigns'),
    ]);
    setPosts((p ?? []) as unknown as CommunityPost[]);
    setCampaigns((c ?? []) as unknown as Campaign[]);
    router.refresh();
  }

  async function moderate(p: CommunityPost) {
    const reason = prompt(`"${p.title}" ilanı kaldırılsın mı? Sebep (yazara görünür):`);
    if (reason === null) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.rpc('remove_community_post', { p_id: p.id, p_reason: reason || undefined });
    if (!error && p.photos?.length) {
      // Moderasyonla kaldırılan ilanın fotoğrafları depoda kalmasın (yönetici silme yetkisi RLS'te)
      await sb.storage.from('community-photos').remove(p.photos);
    }
    setBusy(false);
    if (error) { alert('Kaldırılamadı: ' + friendlyDbMessage(error.message)); return; }
    await reload();
  }

  function openNewCamp() { setCampForm(EMPTY_CAMP); setCampErr(''); setCampOpen(true); }
  function openEditCamp(c: Campaign) {
    setCampForm({ id: c.id, title: c.title, vendor_name: c.vendor_name ?? '', description: c.description ?? '', discount_text: c.discount_text ?? '', valid_until: c.valid_until ?? '', active: c.active });
    setCampErr(''); setCampOpen(true);
  }
  async function submitCamp() {
    if (!campForm.title.trim()) { setCampErr('Başlık girin.'); return; }
    setBusy(true); setCampErr('');
    const { error } = await supabaseBrowser().rpc('save_campaign', {
      p_id: campForm.id, p_title: campForm.title.trim(),
      p_vendor_name: campForm.vendor_name.trim() || undefined,
      p_description: campForm.description.trim() || undefined,
      p_discount_text: campForm.discount_text.trim() || undefined,
      p_valid_until: campForm.valid_until || undefined,
      p_active: campForm.active,
    });
    setBusy(false);
    if (error) { setCampErr(friendlyDbMessage(error.message)); return; }
    setCampOpen(false);
    await reload();
  }
  async function removeCamp(c: Campaign) {
    if (!confirm(`"${c.title}" kampanyası silinsin mi?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_campaign', { p_id: c.id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <TabBtn active={tab === 'posts'} onClick={() => setTab('posts')}>🏪 İlan Panosu ({posts.length})</TabBtn>
          <TabBtn active={tab === 'campaigns'} onClick={() => setTab('campaigns')}>🎁 Kampanyalar ({campaigns.length})</TabBtn>
        </div>
        {tab === 'campaigns' && canModerate && !ro && (
          <button onClick={openNewCamp} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Kampanya Ekle
          </button>
        )}
      </div>

      {tab === 'posts' ? (
        <Card>
          {posts.length === 0 ? (
            <EmptyState>İlan yok. Sakinler mobil uygulamadan ilan verebilir.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr><Th>İlan</Th><Th>Tür</Th><Th>Sahibi</Th><Th className="text-right">Fiyat</Th><Th>Tarih</Th><Th>Durum</Th>{canModerate && !ro && <Th></Th>}</tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <span className="font-medium">{p.title}</span>
                        {p.body && <p className="max-w-md truncate text-xs text-slate-400">{p.body}</p>}
                        {p.photos && p.photos.length > 0 && <PostPhotos paths={p.photos} />}
                        {p.removed_reason && <p className="text-xs text-red-400">Sebep: {p.removed_reason}</p>}
                      </Td>
                      <Td className="text-slate-500">
                        {KIND_LABEL[p.kind] ?? p.kind}
                        {p.category && <p className="text-xs text-slate-400">{CAT_LABEL[p.category] ?? p.category}</p>}
                      </Td>
                      <Td className="text-slate-500">{p.author_name ?? '—'}{p.author_unit ? ` · ${p.author_unit}` : ''}</Td>
                      <Td className="text-right tabular-nums">{p.price != null ? money(Number(p.price), true) : '—'}</Td>
                      <Td className="text-slate-400">{date(p.created_at)}</Td>
                      <Td><Badge tone={POST_STATUS[p.status]?.tone ?? 'slate'}>{POST_STATUS[p.status]?.label ?? p.status}</Badge></Td>
                      {canModerate && !ro && (
                        <Td className="text-right">
                          {(p.status === 'aktif' || p.status === 'satildi') && (
                            <button onClick={() => moderate(p)} disabled={busy} className="text-xs text-red-500 hover:underline disabled:opacity-50">Kaldır</button>
                          )}
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {campaigns.length === 0 ? (
            <EmptyState>Kampanya yok. Anlaşmalı işletme indirimlerini buradan duyurun.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr><Th>Kampanya</Th><Th>İşletme</Th><Th>İndirim</Th><Th>Geçerlilik</Th><Th>Durum</Th>{canModerate && !ro && <Th></Th>}</tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const expired = c.valid_until != null && c.valid_until < new Date().toISOString().slice(0, 10);
                    return (
                      <tr key={c.id}>
                        <Td>
                          <span className="font-medium">{c.title}</span>
                          {c.description && <p className="max-w-md truncate text-xs text-slate-400">{c.description}</p>}
                        </Td>
                        <Td className="text-slate-500">{c.vendor_name ?? '—'}</Td>
                        <Td className="text-slate-600">{c.discount_text ?? '—'}</Td>
                        <Td className={expired ? 'text-red-500' : 'text-slate-400'}>{c.valid_until ? date(c.valid_until) + (expired ? ' (geçti)' : '') : 'Süresiz'}</Td>
                        <Td>{c.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>}</Td>
                        {canModerate && !ro && (
                          <Td className="whitespace-nowrap text-right">
                            <button onClick={() => openEditCamp(c)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                            <button onClick={() => removeCamp(c)} disabled={busy} className="ml-3 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {campOpen && (
        <Modal title={campForm.id ? 'Kampanya Düzenle' : 'Kampanya Ekle'} onClose={() => setCampOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Başlık *">
              <input value={campForm.title} onChange={(e) => setCampForm({ ...campForm, title: e.target.value })} className={inputCls} placeholder="örn. Yıldız Market %10 indirim" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="İşletme"><input value={campForm.vendor_name} onChange={(e) => setCampForm({ ...campForm, vendor_name: e.target.value })} className={inputCls} /></Field>
              <Field label="İndirim"><input value={campForm.discount_text} onChange={(e) => setCampForm({ ...campForm, discount_text: e.target.value })} className={inputCls} placeholder="%10, 50 TL…" /></Field>
            </div>
            <Field label="Açıklama">
              <textarea value={campForm.description} onChange={(e) => setCampForm({ ...campForm, description: e.target.value })} className={inputCls} rows={3} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Geçerlilik Sonu"><input type="date" value={campForm.valid_until} onChange={(e) => setCampForm({ ...campForm, valid_until: e.target.value })} className={inputCls} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
                <input type="checkbox" checked={campForm.active} onChange={(e) => setCampForm({ ...campForm, active: e.target.checked })} /> Aktif
              </label>
            </div>
            {campErr && <p className="text-sm text-red-600">{campErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCampOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitCamp} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PostPhotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    supabaseBrowser().storage.from('community-photos').createSignedUrls(paths, 3600).then(({ data }) => {
      if (alive && data) setUrls(data.map((d) => d.signedUrl).filter((u): u is string => !!u));
    });
    return () => { alive = false; };
  }, [paths]);
  if (urls.length === 0) return null;
  return (
    <div className="mt-1 flex gap-1.5">
      {urls.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="İlan fotoğrafı" className="h-12 w-12 rounded-md border border-slate-200 object-cover" />
        </a>
      ))}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{children}</button>;
}
