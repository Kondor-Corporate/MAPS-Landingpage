type Props = {
  className?: string;
};

export function MapPinIcon({ className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1.667c-3.682 0-6.667 2.985-6.667 6.667 0 4.583 6.667 10 6.667 10s6.667-5.417 6.667-10c0-3.682-2.985-6.667-6.667-6.667Zm0 9.166a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
      />
    </svg>
  );
}
