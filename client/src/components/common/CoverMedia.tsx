import { useEffect, useState } from 'react';
import { Orbit } from 'lucide-react';

type CoverMediaProps = {
  src?: string;
  alt: string;
  fallbackLabel: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function CoverMedia({
  src,
  alt,
  fallbackLabel,
  className = '',
  imageClassName = '',
  fallbackClassName = ''
}: CoverMediaProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return <div className={`cover-media ${className}`.trim()}>
    {src && !failed
      ? <img
        className={`cover-media-image ${imageClassName}`.trim()}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      : <div className={`cover-media-fallback ${fallbackClassName}`.trim()} aria-hidden="true">
        <span>ASPIER RESEARCH</span>
        <Orbit className="cover-media-icon" size={48} aria-hidden="true"/>
        <strong>{fallbackLabel}</strong>
      </div>}
  </div>;
}
