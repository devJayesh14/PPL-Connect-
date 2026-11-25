import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { normalizePlayerPhotoSrc } from '../../utils/imageUtils';

interface PlayerAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  iconFallback?: boolean;
  iconClassName?: string;
}

/**
 * Reliable player avatar with normalization and automatic onError fallback so
 * broken-image icons never appear even if an image URL fails or data URI is malformed.
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  src,
  name,
  className = 'w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0',
  imgClassName = 'w-full h-full object-cover',
  fallbackClassName = 'w-full h-full flex items-center justify-center font-bold text-slate-500 bg-slate-100',
  iconFallback = false,
  iconClassName = 'w-1/2 h-1/2 text-slate-400',
}) => {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = normalizePlayerPhotoSrc(src);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = (name || 'P').trim().charAt(0).toUpperCase() || 'P';

  return (
    <div className={className}>
      {normalizedSrc && !hasError ? (
        <img
          src={normalizedSrc}
          alt={name || 'Player'}
          decoding="async"
          loading={normalizedSrc.startsWith('http') ? 'lazy' : undefined}
          onError={() => setHasError(true)}
          className={imgClassName}
        />
      ) : (
        <div className={fallbackClassName}>
          {iconFallback ? <User className={iconClassName} /> : initial}
        </div>
      )}
    </div>
  );
};
