import type { ReactNode } from 'react';

export type BadgeTone = 'green' | 'red' | 'yellow' | 'blue' | 'amber' | 'gray';

export function Badge({
  children,
  tone,
  variant = 'green'
}: {
  children: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeTone | string;
}) {
  const resolved = (tone || variant || 'green') as string;
  const toneClass = resolved === 'amber' ? 'badge-yellow' : resolved === 'blue' ? 'badge-blue' : resolved === 'gray' ? 'badge-gray' : `badge-${resolved}`;
  return <span className={`badge ${toneClass}`}>{children}</span>;
}
