export type CnInput = string | false | null | undefined;

/** Tiny clsx substitute — joins truthy class names. */
export function cn(...parts: CnInput[]): string {
  return parts.filter(Boolean).join(' ');
}
