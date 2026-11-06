import type { ReactNode } from 'react';
import {
  CircleIcon,
  DeleteIcon,
  DownloadIcon,
  ImageIcon,
  RectangleIcon,
  RollbackIcon,
} from 'tdesign-icons-react';
import type { Shape } from '../types';
import { Seg } from './ui/Seg';

interface ToolbarProps {
  hasImage: boolean;
  tool: Shape;
  onTool: (t: Shape) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDelete: () => void;
  onExport: () => void;
  onOpenFile: () => void;
}

function IconBtn({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** tdesign-icons has no rounded-rect glyph; small inline SVG to match. */
function RoundRectIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="3.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function RedoIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-flex" style={{ transform: 'scaleX(-1)' }}>
      <RollbackIcon size={size} />
    </span>
  );
}

export function Toolbar(p: ToolbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-3">
      {p.hasImage && (
        <button
          type="button"
          onClick={p.onOpenFile}
          className="flex items-center gap-1 rounded-md p-1 md:px-3 md:py-1.75 text-xs md:texd-md text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white bg-neutral-600/20"
        >
          <ImageIcon className='hidden! md:inline-block!' size={15} /> 换图
        </button>
      )}
      <div className="mx-1 h-6 w-px bg-neutral-800 hidden md:block" />
      <Seg<Shape>
        value={p.tool}
        onChange={p.onTool}
        className='scale-[85.5%] md:scale-100'
        options={[
          { value: 'rect', icon: <RectangleGlyph />, title: '矩形选区' },
          { value: 'roundRect', icon: <RoundRectIcon />, title: '圆角矩形选区' },
          { value: 'ellipse', icon: <CircleGlyph />, title: '椭圆选区' },
        ]}
      />
      <div className="mx-1 h-6 w-px bg-neutral-800 hidden md:block" />
      <IconBtn title="撤销（Ctrl+Z）" disabled={!p.canUndo} onClick={p.onUndo}>
        <RollbackIcon />
      </IconBtn>
      <IconBtn title="重做（Ctrl+Y / Ctrl+Shift+Z）" disabled={!p.canRedo} onClick={p.onRedo}>
        <RedoIcon />
      </IconBtn>
      <IconBtn title="删除选区（Delete / Esc）" disabled={!p.hasSelection} onClick={p.onDelete}>
        <DeleteIcon />
      </IconBtn>
      <div className="flex-1" />
      {p.hasImage && (
        <button
          type="button"
          onClick={p.onExport}
          className="flex items-center gap-1.5 rounded-md bg-blue-500 p-1 md:px-3 md:py-1.75 text-xs font-medium md:texd-md text-white transition-colors hover:bg-blue-400"
        >
          <DownloadIcon size={15} className='hidden! md:inline-block!' /> 导出
        </button>
      )}
    </header>
  );
}

function RectangleGlyph() {
  return <RectangleIcon size={16} />;
}

function CircleGlyph() {
  return <CircleIcon size={16} />;
}
