import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EnergyAI - Forecasting Dashboard',
  description: 'AI-powered energy consumption forecasting, anomaly detection, and sustainability insights.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
