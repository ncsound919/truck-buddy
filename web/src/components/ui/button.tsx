import Link from 'next/link';

import { cn } from '@/lib/cn';

/** Variant + size button. Works as an anchor or as a button element. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'light' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-600 shadow-[var(--shadow-btn)] hover:shadow-[0_14px_28px_-12px_rgba(15,107,255,0.7)] hover:-translate-y-px',
  secondary: 'bg-accent-soft text-accent-ink hover:bg-[#d6e2ff]',
  ghost: 'text-accent hover:bg-accent-soft',
  outline: 'border border-line bg-white text-ink hover:border-accent/50 hover:text-accent shadow-[var(--shadow-card)]',
  light: 'bg-white text-ink hover:bg-[#e8f0ff] shadow-[var(--shadow-card)]',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-[52px] px-7 text-base gap-2',
};

const COMMON =
  'inline-flex items-center justify-center font-bold whitespace-nowrap rounded-xl border border-transparent transition-[background-color,box-shadow,transform,border-color] duration-150 ease-out active:translate-y-px active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 select-none';

export function buttonClasses(variant: ButtonVariant, size: ButtonSize): string {
  return cn(COMMON, VARIANTS[variant], SIZES[size]);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={cn(buttonClasses(variant, size), className)} {...rest} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonClasses(variant, size), className)}>
      {children}
    </Link>
  );
}
