import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function Panel({ children }: Props) {
  return (
    <aside className="order-2 lg:order-0 flex flex-col gap-4 p-5 border border-black/10 rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-sm shadow-xl lg:h-[calc(100vh-2rem)] overflow-visible lg:overflow-hidden">
      {children}
    </aside>
  );
}

export function PanelBlock({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 [&+&]:pt-4 [&+&]:border-t [&+&]:border-black/10 ${className}`}
    >
      {children}
    </div>
  );
}
