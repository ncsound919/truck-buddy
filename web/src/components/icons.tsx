import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export const TruckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M1 8h11v9H1z" />
    <path d="M12 11h5l3 3v3h-8z" />
    <circle cx="6" cy="19" r="1.6" />
    <circle cx="17" cy="19" r="1.6" />
  </svg>
);

export const RouteIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
    <path d="M6 8.4v3.6a4 4 0 0 0 4 4h3.6" />
  </svg>
);

export const DocIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v4h4" />
    <path d="M9 13h6M9 17h6M9 9h2" />
  </svg>
);

export const ScanIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3" />
    <path d="M8 9h3v6H9M13 9h3v6M13 12h2" />
  </svg>
);

export const HealthIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" />
    <path d="M9.5 12.5l1.8 1.8 3.2-3.6" />
  </svg>
);

export const MoneyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="6" width="20" height="13" rx="2" />
    <path d="M2 10h20" />
    <circle cx="12" cy="14.5" r="2" />
  </svg>
);

export const ClipboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4h6v2H9z" />
    <rect x="4" y="4" width="16" height="17" rx="2" />
    <path d="M8 10h8M8 14h5" />
  </svg>
);

export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3-.4-4.3-1L3 20l1-5.2A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);

export const MapPinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l10 17H2z" />
    <path d="M12 10v4M12 17v.2" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h16M13 5l7 7-7 7" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 4h4l1.5 4-2 1.5a12 12 0 0 0 6 6L16 13l4 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
  </svg>
);

export const ExternalIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3h7v7" />
    <path d="M21 3L10 14" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14.2a5.5 5.5 0 0 1 3 4.8" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" />
    <path d="M12 9.2v2.6M12 15v.2" />
  </svg>
);

export const ContractIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v4h4" />
    <path d="M12 14.2l4.2-4.2 1.6 1.6-4.2 4.2z" />
    <path d="M11 17.5l-2 .5.5-2z" />
  </svg>
);

/** Google "G" mark — multicolor, brand-accurate. Not stroked (fills only). */
export const GoogleIcon = (p: Omit<IconProps, 'stroke' | 'fill' | 'strokeWidth'>) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...p}
  >
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);
