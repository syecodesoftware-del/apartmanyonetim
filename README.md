# Komşu Asistanı — Yönetici Web Paneli

Apartman ve site yöneticilerinin mobil yönetici panelini **bilgisayardan** daha verimli
kullanabilmesi için geliştirilen web uygulaması. Next.js 16 + Supabase.

## En önemli güvenlik kararı: RLS, service_role DEĞİL

`admin-panel` (platform sahibi) **service_role** kullanır ve RLS'i bypass eder — tüm siteleri görür.
**Bu panel bunun TERSİDİR:**

- Yönetici **kendi hesabıyla** (mobildeki aynı Supabase Auth hesabı) giriş yapar.
- Tüm sorgular **anon (publishable) anahtar + kullanıcı oturum çerezi** ile yapılır → **RLS her zaman devrede**.
- Yönetici yalnız **kendi aktif sitesinin** verisini görür/değiştirir.
- **Bu uygulamada service_role anahtarı YOKTUR** → siteler-arası veri sızma yüzeyi = **sıfır**.
- Çoklu-site erişimi: `switch_active_site` RPC + `site_memberships` (aktif-işaretçi modeli, mobil ile birebir).
- **Veritabanı değişikliği yapılmadı** — mevcut şema/RLS üzerine yeni bir okuma/yazma istemcisi.

## Mimari

- **Okuma:** Server Components → `supabaseServer()` (çerez → RLS kapsamlı).
- **Yazma/mutasyon:** Client Components → `supabaseBrowser()` (aynı oturum, RLS); ardından `router.refresh()`.
- **Rol kapısı:** `requireManager()` ([src/lib/session.ts](src/lib/session.ts)) — kullanıcının kendi profilinden
  `role ∈ {manager, admin}` ve aktif `site_id` doğrular; değilse `/login`'e yönlendirir.
- **Oturum tazeleme + auth gate:** [proxy.ts](proxy.ts) → `updateSession`.
- Mutasyonlar mobil hook'larıyla **birebir aynı** Supabase çağrılarını kullanır
  (onay/red `approve-resident` edge function; davet/daire/ada tablo CRUD).

## Sayfalar (Faz 0 + Faz 1 + Faz 2)

**Sakinler (Faz 1)**

| Yol | İçerik |
|-----|--------|
| `/login` | E-posta/şifre girişi (yalnız manager/admin) |
| `/` | Panel: stat kartları (sakin, onay, tahsilat, şikayet) + onay bekleyenler + hızlı işlemler |
| `/residents` | Onaylı sakin listesi (aranabilir) |
| `/approvals` | Onay bekleyen başvurular → Onayla / Reddet (gerekçeli) |
| `/invitations` | Davet oluştur (T.C. ile auto-approve) + liste + kod kopyala / iptal |
| `/units` | Daireler: ekle/düzenle, ada ataması, arsa payı tutarlılık uyarısı |
| `/blocks` | Adalar/bloklar: ekle/düzenle/sil, yönetici atama, daire sayısı |

**Cari & Aidat (Faz 2)**

| Yol | İçerik |
|-----|--------|
| `/balances` | Daire bazlı cari bakiye + tahsilat al (`record_collection`) + gecikme hesapla (`calculate_late_fees`) |
| `/balances/[unitId]` | Daire cari ekstresi (`unit_ledger`, yürüyen bakiye) |
| `/accruals` | Dönemsel tahakkuk üret (`generate_accruals`; arsa payı/m²/eşit/sabit) + inline gider türü |
| `/unpaid` | Bu ay açık/kısmi tahakkuğu olanlar + borç detay modalı |
| `/charge-types` | Gider türleri CRUD (borç hedefi, gecikme, icra, aktif/pasif) |
| `/dues-plans` | Sabit aidat planları (oluştur, aktif/pasif) |
| `/late-fee-policy` | Gecikme oranı (%) + grace gün (upsert) |

**Kasa & Banka (Faz 3)**

| Yol | İçerik |
|-----|--------|
| `/cash` | Kasa/banka hesapları + bakiyeler, hesap aç, gider gir/düzenle/sil, hareket ekstresi |
| `/cash/[accountId]` | Banka mutabakatı: özet (defter/banka/eşleşmeyen), hareket ekle, toplu ekstre içe aktar, tahsilat/gider ile eşleştir · yoksay · sil |

**İletişim & Ayarlar (Faz 4)**

| Yol | İçerik |
|-----|--------|
| `/announcements` | Duyuru yayınla (öncelik, sabitle) + liste + sil (yeni duyuru → otomatik bildirim) |
| `/complaints` | Şikayet listesi + durum güncelleme (açık/işlemde/çözüldü/reddedildi/kapatıldı) + çözüm notu (durum değişince sakine bildirim) |
| `/settings` | Site bilgileri + özellik toggle'ları (settings JSON) + bekleyen üyelik talepleri (`approve_site_membership`) + yöneticilik devri (`transfer-manager` edge fn) |

Mobil yönetici panelinin tüm fazları (Faz 1-4) web'e taşındı.

## Çalıştırma

```bash
cd manager-panel
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SUPABASE_ANON_KEY doldur
npm run dev        # http://localhost:3000
npm run build      # production derleme
```

### Ortam değişkenleri (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase proje URL'i
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable anahtar (RLS'e tabi, public-safe)

**service_role anahtarı bu projede kullanılmaz ve eklenmemelidir.**

## Dağıtım
`admin-panel` gibi ayrı bir Vercel projesi olarak deploy edilir. Yalnız 2 env değişkeni gerekir
(ikisi de public-safe). `.env*` gitignore'dadır.
