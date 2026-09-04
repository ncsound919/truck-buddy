const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function money(n: number): string {
  return usd.format(n);
}

export function mi(n: number): string {
  return `${n.toLocaleString('en-US')} mi`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
