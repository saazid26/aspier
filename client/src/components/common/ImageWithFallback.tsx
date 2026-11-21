import { useEffect, useState } from 'react';

type ImageWithFallbackProps = {
  src?: string;
  alt?: string;
  className?: string;
  fallbackLabel?: string;
};

export function ImageWithFallback({ src, alt = '', className = '', fallbackLabel }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <div className={`image-with-fallback ${className}`}>
    {src && !failed
      ? <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)}/>
      : <span className="image-with-fallback-label">{fallbackLabel || alt || 'ASPIER'}</span>}
  </div>;
}
