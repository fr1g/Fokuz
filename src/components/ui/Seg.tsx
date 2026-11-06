import type { ReactNode } from 'react';

export interface SegOption<T extends string> {
  value: T;
  label?: string;
  icon?: ReactNode;
  title?: string;
  disabled?: boolean;
}

interface SegProps<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function Seg<T extends string>({ options, value, onChange, className }: SegProps<T>) {
  return (
    <div className={`inline-flex rounded-md bg-neutral-800 p-0.5 ${className ?? ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs whitespace-nowrap transition-colors ${
            o.disabled
              ? 'cursor-not-allowed text-neutral-600'
              : o.value === value
                ? 'bg-blue-500 text-white'
                : 'text-neutral-300 hover:text-white'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
