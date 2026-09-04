import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Truck Buddy — Less paperwork. More road.',
  description:
    'Truck Buddy is the hands-free companion for truck drivers and the logistics hub for everything off the road — loads, documents, dispatch, and money in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
