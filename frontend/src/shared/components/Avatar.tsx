import { useState } from 'react';
import { getInitials } from '@/shared/utils/initials';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;
  const dimensions = SIZE_CLASSES[size];

  if (showImage) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErrored(true)}
        className={`${dimensions} shrink-0 rounded-full object-cover ring-1 ring-maps-border ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${dimensions} shrink-0 inline-flex items-center justify-center rounded-full bg-maps-brand-soft font-bold text-maps-brand ring-1 ring-maps-border ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
