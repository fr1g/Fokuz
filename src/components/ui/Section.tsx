import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}

export function Section({ title, right, children }: SectionProps) {
  return (
    <section className="border-b border-neutral-800 p-3">
      <header className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
        {right}
      </header>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
