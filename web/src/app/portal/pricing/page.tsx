import Link from 'next/link';
import { PageTitle } from '@/components/portal/primitives';
import { PricingPage } from '@/components/pricing-page';

export const dynamic = 'force-dynamic';

export default async function PricingPageRoute() {
  return (
    <div>
      <PageTitle title="Billing" subtitle="Pick a plan that fits your operation" />
      <PricingPage />
    </div>
  );
}