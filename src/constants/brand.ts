import { useColorScheme } from '@/hooks/use-color-scheme';

/** Truck Buddy brand + semantic palette (independent of system color scheme). */
export const Brand = {
  accent: '#D97225',
  accentSoft: '#FBE9D7',
  accentInk: '#274D71',
  success: '#118A44',
  successSoft: '#DDF4E4',
  warning: '#B46A00',
  warningSoft: '#FBEED8',
  danger: '#C92222',
  dangerSoft: '#FDE4E4',
  surface: '#0B1626',
  surfaceRaised: '#152441',
} as const;

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
