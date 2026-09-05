import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';

export function SiteFooter() {
  return (
    <footer className="bg-surface text-faint">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-14">
        <div className="flex flex-wrap items-start justify-between gap-10 pb-10">
          <div>
            <BrandLogo light />
            <p className="mt-3 text-sm text-faint">Less paperwork. More road.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm font-semibold text-[#9fb4d8] sm:grid-cols-3">
            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-white">Product</span>
              <Link href="/portal" className="hover:text-white">Driver portal</Link>
              <Link href="/assistant" className="hover:text-white">Breakdown help</Link>
              <Link href="/#how-it-works" className="hover:text-white">How it works</Link>
              <Link href="/#pricing" className="hover:text-white">Pricing</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-white">Company</span>
              <Link href="/#for-carriers" className="hover:text-white">For carriers</Link>
              <a href="mailto:hello@truckbuddy.online" className="hover:text-white">Contact</a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-white">App</span>
              <Link href="/portal" className="hover:text-white">Sign in</Link>
              <span className="text-faint">Android · iOS · Web</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs">
          <span>© {new Date().getFullYear()} Truck Buddy. All rights reserved.</span>
          <span>Demo concept · Unreleased</span>
        </div>
      </div>
    </footer>
  );
}
