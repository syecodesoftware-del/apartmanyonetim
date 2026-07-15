'use client';

import { useEffect, useState } from 'react';

/** Rapor Madde 9: her ekranda erişilebilir Canlı Destek bileşeni.
 *  Layout'ta mount edildiği için sayfa değişince kapanmaz/remount olmaz.
 *  Bu sürüm WhatsApp/e-posta yönlendirmesidir (backend yok); ileride sohbete genişletilebilir. */
export function SupportWidget() {
  const [open, setOpen] = useState(false);

  const wa = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '');
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent('Merhaba, yönetici panelinde yardıma ihtiyacım var.')}`
    : null;
  const mailHref = email
    ? `mailto:${email}?subject=${encodeURIComponent('Yönetici Paneli Destek')}`
    : null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="bg-blue-600 px-4 py-3 text-white">
            <p className="text-sm font-bold">Canlı Destek</p>
            <p className="text-xs text-blue-100">Sorunuz mu var? Size hızlıca yardımcı olalım.</p>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                <span className="text-lg">🟢</span>
                <span>WhatsApp&apos;tan yazın<span className="block text-xs font-normal text-emerald-600">Genellikle dakikalar içinde yanıt</span></span>
              </a>
            )}
            {mailHref && (
              <a href={mailHref}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                <span className="text-lg">✉️</span>
                <span>E-posta gönderin<span className="block text-xs font-normal text-slate-500 break-all">{email}</span></span>
              </a>
            )}
            {!waHref && !mailHref && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Destek iletişim bilgisi henüz tanımlı değil. Yönetici <code>NEXT_PUBLIC_SUPPORT_WHATSAPP</code> / <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> ayarlamalı.
              </p>
            )}
            <div className="mt-1 flex items-center gap-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
              <a href="/kvkk" className="hover:text-slate-600 hover:underline">KVKK</a>
              <a href="/gizlilik" className="hover:text-slate-600 hover:underline">Gizlilik</a>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Canlı Destek"
        className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
      >
        {open ? '✕' : <><span className="text-lg">💬</span><span className="hidden sm:inline">Destek</span></>}
      </button>
    </div>
  );
}
