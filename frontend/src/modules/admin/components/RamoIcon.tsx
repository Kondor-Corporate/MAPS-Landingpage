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
