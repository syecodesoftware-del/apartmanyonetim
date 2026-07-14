'use client';

/** Telefonu tıklanabilir yapar: tel: araması + WhatsApp linki (yöneticinin gerçek iletişim kanalı).
 *  Satır-onClick olan tablolarda kullanılabilsin diye tıklamayı yutar. */
export function PhoneLink({ phone, className = '' }: { phone: string | null | undefined; className?: string }) {
  if (!phone || !phone.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  // wa.me uluslararası biçim ister: 0532… → 90532…, 532… → 90532…
  const wa = digits.startsWith('90') ? digits
    : digits.startsWith('0') ? '9' + digits
    : digits.length === 10 ? '90' + digits
    : digits;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} onClick={(e) => e.stopPropagation()}>
      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="text-xs text-blue-600 hover:underline" title="Ara">
        {phone}
      </a>
      {wa.length >= 11 && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp'tan yaz"
          className="text-xs opacity-60 transition hover:opacity-100"
        >
          💬
        </a>
      )}
    </span>
  );
}
