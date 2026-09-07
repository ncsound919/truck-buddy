import type { SVGProps } from 'react';

/**
 * Cartoon "Buddy" truck mark — a friendly blue truck silhouette with an orange
 * headlight/smile accent. Mirrors the colors in `assets/truckbuddy-logo.jpg` so
 * the brand stays consistent across raster and vector renderings.
 */
export function TruckBuddyMark({
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id="tb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B8AE8" />
          <stop offset="1" stopColor="#1E5BB8" />
        </linearGradient>
        <linearGradient id="tb-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4FA0F5" />
          <stop offset="1" stopColor="#246BCC" />
        </linearGradient>
        <linearGradient id="tb-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9A653" />
          <stop offset="1" stopColor="#D97225" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="50" r="42" fill="#FFF6EC" />
      {/* shadow */}
      <ellipse cx="48" cy="76" rx="30" ry="3" fill="#000" opacity="0.08" />
      {/* truck bed */}
      <rect x="14" y="42" width="30" height="20" rx="3" fill="url(#tb-orange)" stroke="#A65418" strokeWidth="1.5" />
      {/* cab */}
      <path
        d="M44 36 L60 36 Q66 36 68 42 L72 52 Q72 62 68 62 L44 62 Z"
        fill="url(#tb-cab)"
        stroke="#143F87"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* windshield */}
      <path
        d="M48 40 L60 40 Q63 40 64.5 44 L66 50 L48 50 Z"
        fill="#BDE0FF"
        stroke="#143F87"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* side window */}
      <rect x="48" y="51" width="14" height="6" rx="1.5" fill="#BDE0FF" stroke="#143F87" strokeWidth="1" />
      {/* door smile */}
      <path d="M50 60 Q55 63 60 60" fill="none" stroke="#A65418" strokeWidth="1.4" strokeLinecap="round" />
      {/* headlight + smile */}
      <circle cx="69" cy="55" r="3" fill="#FFE9A8" stroke="#A65418" strokeWidth="1" />
      <path d="M65 56 Q69 60 73 56" fill="none" stroke="#A65418" strokeWidth="1.4" strokeLinecap="round" />
      {/* eyes on windshield */}
      <circle cx="53" cy="45" r="1.4" fill="#143F87" />
      <circle cx="59" cy="45" r="1.4" fill="#143F87" />
      {/* wheels */}
      <circle cx="26" cy="66" r="7" fill="#143F87" />
      <circle cx="26" cy="66" r="3.2" fill="url(#tb-orange)" />
      <circle cx="60" cy="66" r="7" fill="#143F87" />
      <circle cx="60" cy="66" r="3.2" fill="url(#tb-orange)" />
      {/* bumper */}
      <rect x="70" y="58" width="3" height="6" rx="1" fill="#143F87" />
    </svg>
  );
}