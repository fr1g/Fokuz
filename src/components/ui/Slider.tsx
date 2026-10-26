interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  disabled?: boolean;
  onInput: (v: number) => void;
  /** Start of a drag / keyboard edit session (for history baseline). */
  onEditStart?: () => void;
  /** End of the session — commit the baseline to history. */
  onEditEnd?: () => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  disabled,
  onInput,
  onEditStart,
  onEditEnd,
}: SliderProps) {
  return (
    <label className={`block ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <span className="mb-1 flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="tabular-nums text-neutral-300">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        className="w-full accent-blue-500"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          onEditStart?.();
          onInput(parseFloat(e.target.value));
        }}
        onPointerDown={onEditStart}
        onPointerUp={onEditEnd}
        onFocus={onEditStart}
        onBlur={onEditEnd}
        onKeyUp={onEditEnd}
      />
    </label>
  );
}
