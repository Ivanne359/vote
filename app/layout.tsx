import './globals.css';
import { Poppins } from 'next/font/google';
import Footer from './components/Footer'; // I-check kung husto ba ang folder name

const poppins = Poppins({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-poppins' 
});

export const metadata = {
  title: 'CETVOTE | Secure Student Election',
  description: 'Official Voting Portal for CET Students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans bg-[#FAFAFA] text-slate-900`}>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}