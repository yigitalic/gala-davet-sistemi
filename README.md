# Gala & Etkinlik Davet / LCV Yönetim Sistemi

Sinema galaları, basın gösterimleri ve özel etkinlikler için geliştirilmiş davetli listesi yönetimi, toplu davetiye gönderimi, LCV (katılım teyidi) takibi ve QR bilet doğrulama sistemi.

> **Not:** Bu projede arayüz (UI) tasarımına özellikle özenilmemiştir. Projenin odak noktası arka plan iş mantığı, toplu davetiye/mail gönderimi, LCV onay akışı, dinamik QR bilet üretimi ve liste yönetim süreçlerinin çalışması olduğu için arayüz tamamen düz, sade ve işlevsel tutulmuştur.

## Özellikler

- **Davetli Listesi Yönetimi (`/host`):**
  - Davetli ekleme, düzenleme, silme ve Excel/CSV formatında toplu liste içe/dışa aktarma.
  - Basın ve PR/davetli kategorilerine göre filtreleme, geçmiş etkinlik katılım ve paylaşım takibi.
  - Etkinlik bilgilerini (mekan, tarih, saat, kontenjan) oluşturma ve düzenleme.
- **Toplu Davet ve Canlı Mail Önizleme:**
  - Tek pencereden davetli seçimi ve gönderilecek davetiyenin canlı e-posta önizlemesi.
  - Resend API üzerinden gerçek e-posta adreslerine kişiye özel LCV bağlantılı davetiye gönderimi.
- **Kişiye Özel LCV ve QR Bilet Ekranı (`/rsvp/[token]`):**
  - Davetlinin e-postadaki bağlantı üzerinden katılım durumunu (`Katılıyorum` / `Katılamıyorum`), `+1` refakatçi bilgisini ve özel notunu iletmesi.
  - Onay sonrasında otomatik üretilen dinamik QR giriş bileti, PDF/yazdırma çıktısı ve onay e-postası gönderimi.
  - Verilen LCV yanıtlarının ana yönetim tablosuna ve bildirim listesine otomatik yansıması.

## Kurulum ve Çalıştırma

### 1. Bağımlılıkların Yüklenmesi

```bash
pnpm install
```

### 2. Ortam Değişkenleri

Gerçek e-posta gönderimi için `apps/web/.env.local` dosyası oluşturup Resend API anahtarınızı tanımlayın:

```env
RESEND_API_KEY="re_..."
WEB_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 3. Uygulamayı Başlatma

Web arayüzünü başlatmak için:

```bash
cd apps/web
npx next dev -p 3000
```

Tarayıcıda `http://localhost:3000/host` adresinden yönetim ekranına ulaşabilirsiniz.
