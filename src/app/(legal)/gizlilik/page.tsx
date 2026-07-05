import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — Komşu Asistanı",
  description: "Komşu Asistanı gizlilik politikası",
};

/** Kaynak metin: repo kökü PRIVACY_POLICY.md — içerik değişirse ikisi birlikte güncellenir. */
export default function GizlilikPage() {
  return (
    <>
      <h1>Komşu Asistanı — Gizlilik Politikası</h1>
      <p>
        <strong>Son güncelleme:</strong> 18 Haziran 2026
      </p>
      <p>
        Komşu Asistanı (&quot;Uygulama&quot;), Oblivetech Development Lab tarafından sunulan bir
        apartman/site yönetim platformudur. Bu Gizlilik Politikası, Uygulama&apos;yı kullandığınızda
        kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
      </p>

      <h2>1. Topladığımız Veriler</h2>
      <ul>
        <li>
          <strong>Kimlik ve iletişim:</strong> ad-soyad, e-posta, telefon numarası, T.C. kimlik
          numarası.
        </li>
        <li>
          <strong>Konut bilgisi:</strong> site/apartman, blok, daire numarası, kat.
        </li>
        <li>
          <strong>Finansal:</strong> aidat tahakkuk ve ödeme kayıtları. Kart bilgileriniz
          Uygulama&apos;da <strong>saklanmaz</strong>; ödeme altyapısı (PayTR) üzerinden güvenle
          işlenir.
        </li>
        <li>
          <strong>Kullanım:</strong> bildirim tercihleri, cihaz bildirim anahtarı (push token),
          şikayet/talep içerikleri ve eklediğiniz fotoğraflar.
        </li>
      </ul>

      <h2>2. Verileri Kullanma Amaçlarımız</h2>
      <p>
        Kişisel verilerinizi; üyelik ve onay süreçlerini yürütmek, aidat tahakkuk/tahsilat ve cari
        hesap takibini sağlamak, duyuru, şikayet ve rezervasyon hizmetlerini sunmak, bildirim ve
        hatırlatma göndermek ve yasal yükümlülükleri yerine getirmek amacıyla işleriz.
      </p>

      <h2>3. Verilerin Paylaşımı</h2>
      <p>Verileriniz yalnızca hizmetin sunulması için gerekli hizmet sağlayıcılarla paylaşılır:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — veri tabanı ve kimlik doğrulama altyapısı (barındırma).
        </li>
        <li>
          <strong>PayTR</strong> — ödeme işleme.
        </li>
        <li>
          <strong>Twilio</strong> — SMS bildirimleri.
        </li>
        <li>
          <strong>Resend</strong> — e-posta bildirimleri.
        </li>
      </ul>
      <p>
        Bunun dışında verileriniz, açık rızanız veya yasal zorunluluk olmadıkça üçüncü kişilerle
        paylaşılmaz, satılmaz.
      </p>

      <h2>4. Veri Güvenliği</h2>
      <p>
        Verileriniz; satır düzeyinde erişim kontrolü (RLS), rol bazlı yetkilendirme ve şifreli
        bağlantılar ile korunur. Makbuz ve belgeler yalnızca yetkili kişilerce erişilebilen, süreli
        imzalı bağlantılarla sunulur.
      </p>

      <h2>5. Veri Saklama</h2>
      <p>
        Kişisel verileriniz, hesabınız aktif olduğu sürece ve ilgili mevzuatın öngördüğü saklama
        süreleri boyunca tutulur. Hesabınızın silinmesi talebinde, yasal saklama yükümlülükleri
        saklı kalmak kaydıyla verileriniz silinir veya anonim hale getirilir.
      </p>

      <h2>6. Haklarınız</h2>
      <p>
        6698 sayılı KVKK kapsamında; verilerinize erişme, düzeltme, silme ve işlemeye itiraz etme
        haklarına sahipsiniz. Detaylar için <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;ne
        bakabilirsiniz.
      </p>

      <h2>7. İletişim</h2>
      <p>
        Gizlilik ile ilgili talepleriniz için: <strong>destek@komsuasistani.com</strong>
      </p>
    </>
  );
}
