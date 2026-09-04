import { Assistant } from './assistant';
import { SiteHeader } from '@/components/site/site-header';
import { budgetStatus } from '@/lib/mechanic/budget';

export const metadata = {
  title: 'Roadside Mechanic — Truck Buddy',
  description:
    'Break down? Decode your J1939 fault codes or symptoms into a triaged, step-by-step diagnosis with safe fixes.',
};

export default function AssistantPage() {
  const status = budgetStatus();
  return (
    <div className="min-h-screen bg-bg-alt">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Assistant
          plan={status.plan}
          allowance={status.allowance}
          remaining={status.remaining}
        />
      </div>
    </div>
  );
}
