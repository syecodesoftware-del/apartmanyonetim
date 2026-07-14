'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Entry = {
  unitId: string;
  label: string;      // "A 12"
  names: string;      // "Ayşe Yılmaz (kiracı), Ali Kaya (malik)"
  phones: string;     // aranabilir telefon dizisi
};

/** Rapor #28: her ekrandan erişilir tek arama — "Ayşe Hanım hangi dairedeydi?"
 *  Daire / sakin adı / telefon arar, sonuç daire kartına götürür. ⌘K veya / ile açılır. */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K kısayolu
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // İlk açılışta rehberi tek sefer yükle (RLS: yalnız kendi sitesi)
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    if (entries !== null) return;
    (async () => {
      const sb = supabaseBrowser();
      const [{ data: units }, { data: occ }] = await Promise.all([
        sb.from('units').select('id, block, apartment_number').order('block').order('apartment_number'),
        sb.from('current_occupants').select('unit_id, full_name, phone, relationship'),
      ]);
      const byUnit = new Map<string, { names: string[]; phones: string[] }>();
      for (const o of occ ?? []) {
        if (!o.unit_id) continue;
        const e = byUnit.get(o.unit_id) ?? { names: [], phones: [] };
        e.names.push(`${o.full_name}${o.relationship === 'kiraci' ? ' (kiracı)' : o.relationship === 'malik' ? ' (malik)' : ''}`);
        if (o.phone) e.phones.push(o.phone);
        byUnit.set(o.unit_id, e);
      }
      setEntries((units ?? []).map((u) => {
        const e = byUnit.get(u.id);
        return {
          unitId: u.id,
          label: [u.block, u.apartment_number].filter(Boolean).join(' '),
          names: e?.names.join(', ') ?? '',
          phones: e?.phones.join(' ') ?? '',
        };
      }));
    })();
  }, [open, entries]);

  const term = q.trim().toLocaleLowerCase('tr');
  const termDigits = q.replace(/\D/g, '');
  const hits = term.length >= 2 && entries
    ? entries.filter((e) =>
        e.label.toLocaleLowerCase('tr').includes(term) ||
        e.names.toLocaleLowerCase('tr').includes(term) ||
        (termDigits.length >= 4 && e.phones.replace(/\D/g, '').includes(termDigits)),
      ).slice(0, 10)
    : [];

  function go(unitId: string) {
    setOpen(false); setQ('');
    router.push(`/units/${unitId}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-400 transition hover:border-blue-400 hover:text-slate-600 sm:inline-flex"
        title="Daire / sakin / telefon ara (⌘K)"
      >
        🔍 <span>Ara…</span>
        <kbd className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-400">⌘K</kbd>
      </button>
      <button onClick={() => setOpen(true)} className="text-lg sm:hidden" title="Ara">🔍</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 pt-24" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter' && hits[active]) go(hits[active].unitId);
              }}
              placeholder="Daire, sakin adı veya telefon…"
              className="w-full rounded-t-xl border-b border-slate-100 px-4 py-3 text-sm outline-none"
            />
            <div className="max-h-80 overflow-y-auto p-2">
              {entries === null && <p className="px-3 py-4 text-center text-xs text-slate-400">Yükleniyor…</p>}
              {entries !== null && term.length < 2 && (
                <p className="px-3 py-4 text-center text-xs text-slate-400">En az 2 karakter yazın — daire, isim veya telefon.</p>
              )}
              {entries !== null && term.length >= 2 && hits.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-400">Eşleşme yok.</p>
              )}
              {hits.map((h, i) => (
                <button
                  key={h.unitId}
                  onClick={() => go(h.unitId)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${i === active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span>
                    <span className="font-semibold text-slate-800">🏠 {h.label || '—'}</span>
                    {h.names && <span className="ml-2 text-slate-500">{h.names}</span>}
                  </span>
                  <span className="text-xs text-blue-600">Aç →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
