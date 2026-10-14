import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Database PPDB & Keuangan — Pon-Pes Al-Qur’aniyyah',
  description:
    'Aplikasi terpadu Database PPDB, Pembelian Formulir, Rekomendasi, Pembuatan Rekening, Daftar Ulang, dan Laporan Keuangan Pondok Pesantren Al-Qur’aniyyah.',
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/logo/logo-emblem.png',
    shortcut: '/assets/logo/logo-emblem.png',
    apple: '/assets/logo/logo-emblem.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PPDB Al-Qur’aniyyah',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/assets/logo/logo-emblem.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/logo/logo-emblem.png" />
      </head>
      <body className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <AppProvider>
          <Navbar />
          <div className="flex flex-1 max-w-7xl w-full mx-auto">
            <Sidebar />
            <main className="flex-1 p-3.5 sm:p-6 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
              {children}
            </main>
          </div>
          <MobileNav />
        </AppProvider>
      </body>
    </html>
  );
}
