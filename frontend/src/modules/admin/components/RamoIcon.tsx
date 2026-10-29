import type { SVGProps } from 'react';
import type { RamoIcono } from '@/modules/admin/types/library';

type Props = SVGProps<SVGSVGElement> & {
  icon: RamoIcono;
  size?: number;
};

const iconPaths: Record<RamoIcono, JSX.Element> = {
  car: (
    <path
      d="M3 12h14M5 12V8l2-3h6l2 3v4M6.5 15.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM13.5 15.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  heart: (
    <path
      d="M10 16.5s-5.5-3.5-5.5-7A3 3 0 0 1 10 7.5a3 3 0 0 1 5.5 2 3 3 0 0 1-5.5 7Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  fire: (
    <path
      d="M10 3.5c1 2.5 3 3.5 3 6.5a3 3 0 1 1-6 0c0-2 1.5-3.5 3-6.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  store: (
  <>
    <path
      d="M3.5 8.5 5 4.5h10l1.5 4M4 8.5h12v7.5H4V8.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M8 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 13h5M9 8.5l2-2 2.5 2M11 6.5V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  shield: (
    <path
      d="M10 3 4 5.5v4.5c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V5.5L10 3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  key: (
    <>
      <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 9 5.5 14.5M7 12l-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  megaphone: (
    <path
      d="M4 7.5h4l5-3v11l-5-3H4V7.5ZM8 10.5v3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'classic-car': (
    <path
      d="M3 12h14M4.5 12 6 8h8l1.5 4M6 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM14 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  person: (
    <>
      <circle cx="10" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 16.5c0-2.8 2.2-5 5-5s5 2.2 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  people: (
    <>
      <circle cx="7.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 16c0-2 1.5-3.5 3.5-3.5M12.5 16c0-1.5 1-2.5 2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  scales: (
    <>
      <path d="M10 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M5 8h10M6 8l-2 4h4l-2-4ZM14 8l-2 4h4l-2-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  truck: (
    <path
      d="M3 12h11M5 12V8h5l2 2v2h1.5a1 1 0 0 1 1 1v1H3M7 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM15 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  umbrella: (
    <path
      d="M10 4.5a5 5 0 0 1 5 5H5a5 5 0 0 1 5-5ZM10 9.5V16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  boat: (
    <path
      d="M4 12h12l-1.5 3H5.5L4 12ZM7 9l3-4 3 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  home: (
    <>
      <path
        d="M4 10 10 4.5 16 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 9v6.5h8V9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 15.5v-3h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  wrench: (
    <path
      d="M13 4a3 3 0 0 0-3.87 3.87L4 13l2 2 5.13-5.13A3 3 0 0 0 15 6l-2 2-1-1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  factory: (
    <>
      <path
        d="M3.5 16V10l4-2.5V10l4-2.5V10l4-2.5V16H3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 5.5V8M13 4.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  wheat: (
    <>
      <path d="M10 17V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M10 6 7 4M10 6l3-2M10 9l-2.5-1.5M10 9l2.5-1.5M10 12l-2.5-1.5M10 12l2.5-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  plane: (
    <path
      d="M10 3v5.5L16 12v1.5l-6-2V16l1.5 1v1l-2.5-.7-2.5.7v-1l1.5-1v-3.5l-6 2V12l6-3.5V3Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  drone: (
    <>
      <rect x="8.5" y="8.5" width="3" height="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 9 5 6M11.5 9 15 6M8.5 11 5 14M11.5 11 15 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="4.5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4.5" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  building: (
    <>
      <path d="M6 16V4h8v12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M8 7h1M11 7h1M8 10h1M11 10h1M8 13h1M11 13h1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  pulse: (
    <path
      d="M3.5 11h3l1.5-4 2 7 1.5-4.5 1 1.5h3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  paw: (
    <>
      <circle cx="10" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="8.5" r="1.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="6.5" r="1.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.5" cy="6.5" r="1.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="8.5" r="1.3" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
};

export function RamoIcon({ icon, size = 20, className, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      {iconPaths[icon]}
    </svg>
  );
}
