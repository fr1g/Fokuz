import { useRef, useState } from 'react';
import { ChevronUpIcon } from 'tdesign-icons-react';
import type { EffectState, EditorState, Shape } from '../types';
import { Section } from './ui/Section';
import { Seg } from './ui/Seg';
import { Slider } from './ui/Slider';
import { Toggle } from './ui/Toggle';

const PRESET_COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1677ff', '#ffffff', '#000000'];

interface EffectPanelProps {
  effects: EffectState;
  shape: Shape;
  onPreview: (next: EffectState) => void;
  onCommit: (next: EffectState) => void;
  /** Full editor-state snapshot (for the history baseline). */
  snapshot: () => EditorState;
  onCommitBaseline: (baseline: EditorState) => void;
}

export function EffectPanel({
  effects,
  shape,
  onPreview,
  onCommit,
  snapshot,
  onCommitBaseline,
}: EffectPanelProps) {
  const [open, setOpen] = useState(false);
  const editingRef = useRef(false);
  const baselineRef = useRef<EditorState | null>(null);

  const patch = (partial: Partial<EffectState>, commit: boolean) => {
    const next = { ...effects, ...partial };
    if (commit) onCommit(next);
    else onPreview(next);
  };

  // Idempotent edit-session guards: repeated starts keep the first baseline.
  const beginEdit = () => {
    if (editingRef.current) return;
    editingRef.current = true;
    baselineRef.current = snapshot();
  };
  const endEdit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    const b = baselineRef.current;
    baselineRef.current = null;
    if (b) onCommitBaseline(b);
  };

  const shared = { effects, shape, patch, beginEdit, endEdit };

  return (
    <>
      {/* Mobile: floating bottom sheet, toggled by the tab bar below. */}
      <div
        className={`absolute inset-x-0 bottom-[calc(2.75rem+env(safe-area-inset-bottom))] z-40 max-h-[68dvh] overflow-y-auto rounded-t-2xl border-t border-neutral-700 bg-neutral-900 shadow-[0_-8px_30px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-y-0' : 'translate-y-[110%]'
        }`}
      >
        <PanelSections {...shared} />
      </div>

      {/* Mobile: bottom tab bar toggling the sheet. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="absolute inset-x-0 bottom-0 z-50 flex h-11 items-center justify-center gap-1.5 border-t border-neutral-800 bg-neutral-900/95 pb-[env(safe-area-inset-bottom)] text-sm text-neutral-300 backdrop-blur-sm md:hidden"
      >
        <ChevronUpIcon className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        效果参数
      </button>

      {/* Desktop: static sidebar. */}
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-neutral-800 bg-neutral-900 md:block">
        <PanelSections {...shared} />
      </aside>
    </>
  );
}

/** Panel content shared by the mobile sheet and the desktop sidebar. */
function PanelSections({
  effects,
  shape,
  patch,
  beginEdit,
  endEdit,
}: {
  effects: EffectState;
  shape: Shape;
  patch: (partial: Partial<EffectState>, commit: boolean) => void;
  beginEdit: () => void;
  endEdit: () => void;
}) {
  return (
    <div>
      <Section
        title="选区外遮挡"
        right={
          <Toggle
            checked={effects.overlay.enabled}
            onChange={(v) => patch({ overlay: { ...effects.overlay, enabled: v } }, true)}
          />
        }
      >
        <Seg
          className="w-full"
          value={effects.overlay.color}
          onChange={(v) => patch({ overlay: { ...effects.overlay, color: v } }, true)}
          options={[
            { value: 'black', label: '黑色' },
            { value: 'white', label: '白色' },
          ]}
        />
        <Slider
          label="不透明度"
          min={0}
          max={1}
          step={0.05}
          value={effects.overlay.opacity}
          format={(v) => `${Math.round(v * 100)}%`}
          disabled={!effects.overlay.enabled}
          onEditStart={beginEdit}
          onEditEnd={endEdit}
          onInput={(v) => patch({ overlay: { ...effects.overlay, opacity: v } }, false)}
        />
      </Section>

      <Section title="模糊 / 马赛克">
        <Seg
          className="w-full"
          value={effects.obscure.mode}
          onChange={(v) => patch({ obscure: { ...effects.obscure, mode: v } }, true)}
          options={[
            { value: 'none', label: '无' },
            { value: 'blur', label: '模糊' },
            { value: 'mosaic', label: '马赛克' },
          ]}
        />
        <Slider
          label="强度"
          min={2}
          max={64}
          value={effects.obscure.strength}
          format={(v) => `${v} px`}
          disabled={effects.obscure.mode === 'none'}
          onEditStart={beginEdit}
          onEditEnd={endEdit}
          onInput={(v) => patch({ obscure: { ...effects.obscure, strength: v } }, false)}
        />
      </Section>

      <Section
        title="选区描边"
        right={
          <Toggle
            checked={effects.stroke.enabled}
            onChange={(v) => patch({ stroke: { ...effects.stroke, enabled: v } }, true)}
          />
        }
      >
        <ColorRow
          value={effects.stroke.color}
          disabled={!effects.stroke.enabled}
          onEditStart={beginEdit}
          onEditEnd={endEdit}
          onChange={(c) => patch({ stroke: { ...effects.stroke, color: c } }, false)}
        />
        <Slider
          label="描边宽度"
          min={0}
          max={40}
          value={effects.stroke.width}
          format={(v) => `${v} px`}
          disabled={!effects.stroke.enabled}
          onEditStart={beginEdit}
          onEditEnd={endEdit}
          onInput={(v) => patch({ stroke: { ...effects.stroke, width: v } }, false)}
        />
      </Section>

      <Section
        title="放大镜"
        right={
          <Toggle
            checked={effects.magnify.enabled}
            onChange={(v) => patch({ magnify: { ...effects.magnify, enabled: v } }, true)}
          />
        }
      >
        <Slider
          label="放大倍数"
          min={1}
          max={4}
          step={0.1}
          value={effects.magnify.factor}
          format={(v) => `${v.toFixed(1)} ×`}
          disabled={!effects.magnify.enabled}
          onEditStart={beginEdit}
          onEditEnd={endEdit}
          onInput={(v) =>
            patch({ magnify: { ...effects.magnify, factor: Math.round(v * 10) / 10 } }, false)
          }
        />
      </Section>

      {shape === 'roundRect' && (
        <Section title="圆角">
          <Slider
            label="圆角比例"
            min={0}
            max={0.5}
            step={0.05}
            value={effects.radius}
            format={(v) => `${Math.round(v * 100)}%`}
            onEditStart={beginEdit}
            onEditEnd={endEdit}
            onInput={(v) => patch({ radius: v }, false)}
          />
        </Section>
      )}

      <p className="p-3 text-xs leading-relaxed text-neutral-500">
        按住 Shift 拖拽可画出正方形 / 正圆，调整大小时按住 Shift 锁定宽高比。
      </p>
    </div>
  );
}

function ColorRow({
  value,
  disabled,
  onChange,
  onEditStart,
  onEditEnd,
}: {
  value: string;
  disabled?: boolean;
  onChange: (c: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => {
            onEditStart();
            onChange(c);
            onEditEnd();
          }}
          className={`h-6 w-6 rounded-full border transition-shadow ${value.toLowerCase() === c
              ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-neutral-900'
              : 'border-neutral-600'
            }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        className="relative ml-auto h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-neutral-600"
        title="自定义颜色"
        style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => {
            onEditStart();
            onChange(e.target.value);
          }}
          onBlur={onEditEnd}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
