import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — Komşu Asistanı",
  description: "Komşu Asistanı KVKK aydınlatma metni",
};

/** Kaynak metin: repo kökü KVKK_AYDINLATMA.md — içerik değişirse ikisi birlikte güncellenir. */
export default function KvkkPage() {
  return (
    <>
      <h1>Komşu Asistanı — KVKK Aydınlatma Metni</h1>
      <p>
        <strong>Son güncelleme:</strong> 18 Haziran 2026
      </p>
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel
        verilerinizin veri sorumlusu sıfatıyla işlenmesine ilişkin olarak sizi bilgilendirmek
        isteriz.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        Oblivetech Development Lab (&quot;Şirket&quot;).
        <br />
        İletişim: <strong>destek@komsuasistani.com</strong>
        <br />
        <em>(Ticari unvan, adres ve sicil bilgileri yayın öncesi eklenecektir.)</em>
      </p>

      <h2>2. İşlenen Kişisel Veriler</h2>
      <ul>
        <li>
          <strong>Kimlik:</strong> ad-soyad, T.C. kimlik numarası.
        </li>
        <li>
          <strong>İletişim:</strong> e-posta, telefon.
        </li>
        <li>
          <strong>Konut/üyelik:</strong> site, blok, daire, kat, rol (sakin/yönetici), onay durumu.
        </li>
        <li>
          <strong>Finansal:</strong> aidat tahakkuk, tahsilat ve cari hesap kayıtları.
        </li>
        <li>
          <strong>İşlem güvenliği ve kullanım:</strong> bildirim tercihleri, cihaz bildirim
          anahtarı, talep/şikayet kayıtları.
        </li>
      </ul>

      <h2>3. İşleme Amaçları</h2>
      <p>
        Üyelik kaydı ve kimlik doğrulama; site yönetim hizmetlerinin (aidat, duyuru, şikayet,
        rezervasyon, oylama) sunulması; ödeme ve tahsilat süreçlerinin yürütülmesi; bildirim ve
        hatırlatmaların iletilmesi; hizmet güvenliğinin ve yasal yükümlülüklerin sağlanması.
      </p>

      <h2>4. Hukuki Sebepler</h2>
      <p>
        Kişisel verileriniz; sözleşmenin kurulması ve ifası için gerekli olması, hukuki
        yükümlülüğün yerine getirilmesi, bir hakkın tesisi/kullanılması ve meşru menfaat hukuki
        sebeplerine; gerekli hallerde ise açık rızanıza dayanılarak işlenir (KVKK m.5).
      </p>

      <h2>5. Verilerin Aktarımı</h2>
      <p>
        Verileriniz; hizmetin sunulması amacıyla yurt içi/yurt dışı hizmet sağlayıcılara (veri
        tabanı barındırma, ödeme, SMS ve e-posta altyapıları) KVKK m.8 ve m.9&apos;a uygun olarak
        ve gerekli güvenlik tedbirleri alınarak aktarılır. Verileriniz pazarlama amacıyla üçüncü
        kişilere satılmaz.
      </p>

      <h2>6. KVKK Madde 11 Haklarınız</h2>
      <p>
        Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep
        etme, işleme amacını öğrenme, eksik/yanlış işlenmişse düzeltilmesini, KVKK&apos;da
        öngörülen şartlarda silinmesini/yok edilmesini isteme, işlemenin münhasıran otomatik
        sistemlerle analizi sonucu aleyhinize bir sonuç doğmasına itiraz etme ve zararın
        giderilmesini talep etme haklarına sahipsiniz.
      </p>

      <h2>7. Başvuru</h2>
      <p>
        Haklarınıza ilişkin taleplerinizi <strong>destek@komsuasistani.com</strong> adresine
        iletebilirsiniz. Başvurularınız, KVKK&apos;da öngörülen süreler içinde sonuçlandırılır.
      </p>
    </>
  );
}
