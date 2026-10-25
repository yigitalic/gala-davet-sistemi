import Link from 'next/link';

export default function HomePage() {
  const routes = [
    {
      title: 'Dağıtımcı & Gala Yönetim Paneli',
      path: '/host',
      description: 'Davetli listesi yönetimi, toplu e-posta/LCV gönderimi, canlı önizleme ve PR takibi.',
    },
    {
      title: 'Davetli LCV & QR Bilet Ekranı (Örnek)',
      path: '/rsvp/demo-token',
      description: 'Davetlilerin e-postadaki bağlantı üzerinden katılım teyidi verdiği ve QR bilet aldığı ekran.',
    },
    {
      title: 'Kapı Giriş & QR Kontrol Ekranı',
      path: '/dashboard/check-in',
      description: 'Etkinlik girişinde QR bilet doğrulama ve davetli kontrol ekranı.',
    },
    {
      title: 'Genel Operasyon Paneli',
      path: '/dashboard',
      description: 'Etkinlik, kampanya, gelen kutusu ve raporlama ekranları.',
    },
  ];

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-zinc-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Gala & PR Operasyon Sistemi</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Etkinlik davetli yönetimi, LCV takibi ve QR bilet doğrulama uygulaması
            </p>
          </div>
          <Link
            href="/host"
            className="px-4 py-2 bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
          >
            Host Paneline Git
          </Link>
        </div>

        <div className="border border-zinc-200 divide-y divide-zinc-200">
          {routes.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="block p-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">{item.title}</span>
                <span className="text-xs font-mono text-zinc-500">{item.path}</span>
              </div>
              <p className="text-xs text-zinc-600 mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
