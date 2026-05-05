import './globals.css';
import { Poppins } from 'next/font/google';
import Footer from './components/Footer';
import { AuthProvider } from './context/AuthContext';

const poppins = Poppins({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-poppins' 
});

export const metadata = {
  title: 'CETVOTE | Student Election Portal',
  description: 'Official secure voting and election information portal for CET students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${poppins.variable} font-sans antialiased text-slate-900 bg-[#fbf8f5]`}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(240,90,40,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.1),_transparent_28%),linear-gradient(180deg,_#fffdfa_0%,_#fbf8f5_52%,_#f8f4ef_100%)]" />
            <main className="relative flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}