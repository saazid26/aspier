import { useEffect, useState } from 'react';

type ProfileAvatarProps = {
  name: string;
  photo?: string;
  className?: string;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function ProfileAvatar({ name, photo, className = 'profile-photo' }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  return <div className={className}>
    {photo && !failed
      ? <img src={photo} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)}/>
      : <div className="profile-photo-fallback" aria-label={`${name} avatar`}>{initials(name)}</div>}
  </div>;
}
