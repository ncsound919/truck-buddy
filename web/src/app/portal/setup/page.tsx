import { SiteHeader } from '@/components/site/site-header';
import { Setup } from './setup';

export const metadata = {
  title: 'Set up your work profile — Truck Buddy',
};

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-bg-alt">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-5 py-16">
        <Setup />
      </div>
    </div>
  );
}
