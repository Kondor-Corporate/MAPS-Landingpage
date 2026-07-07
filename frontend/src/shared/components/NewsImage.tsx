import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { DEFAULT_NEWS_GRADIENT, getNewsGradientByCategory } from '@/shared/lib/mapPublicNews';

type Props = {
  src?: string | null;
  gradient?: string;
  categoryKey?: string;
  categoryIndex?: number;
  className?: string;
  imageClassName?: string;
  iconSize?: number;
  showIcon?: boolean;
};

export function NewsImage({
  src,
  gradient,
  categoryKey,
  categoryIndex = 0,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  iconSize = 18,
  showIcon = true,
}: Props) {
  const [failed, setFailed] = useState(false);
  const resolvedGradient =
    gradient ?? getNewsGradientByCategory(categoryKey ?? '', categoryIndex) ?? DEFAULT_NEWS_GRADIENT;
  const trimmed = src?.trim();
  const canShowImage = Boolean(trimmed) && !failed;

  if (canShowImage) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img
          src={trimmed}
          alt=""
          aria-hidden
          onError={() => setFailed(true)}
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: resolvedGradient }}
      aria-hidden
    >
      {showIcon ? (
        <ImageIcon size={iconSize} strokeWidth={1.5} className="text-white/70" />
      ) : null}
    </div>
  );
}
