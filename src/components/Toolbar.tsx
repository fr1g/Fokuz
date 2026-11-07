import { useEffect, useState, type ReactNode } from 'react';
import {
  CircleIcon,
  DeleteIcon,
  DownloadIcon,
  HamburgerIcon,
  ImageIcon,
  RectangleIcon,
  RollbackIcon,
  TranslateIcon,
} from 'tdesign-icons-react';
import { setLocale, t, useLocale } from '../lib/i18n';
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
  className,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white disabled:pointer-events-none disabled:opacity-30 ${
        className ?? ''
      }`}
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

function MenuItem({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white disabled:pointer-events-none disabled:opacity-40"
    >
      {icon} {label}
    </button>
  );
}

export function Toolbar(p: ToolbarProps) {
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on Escape, before the global clear-selection handler.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [menuOpen]);

  const closeAnd = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const toggleLang = () => setLocale(locale === 'zh' ? 'en' : 'zh');
  const langBtnClasses =
    'items-center rounded-md text-sm text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white';

  return (
    <header className="mt-[calc(6px+var(--debug-pad,0px))] flex h-14 shrink-0 items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-3 md:mt-0">
      {p.hasImage && (
        <div className="relative md:hidden">
          <button
            type="button"
            title={t('menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
          >
            <HamburgerIcon />
          </button>
          {menuOpen && (
            <>
              {/* click-away layer below the menu panel */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
                <MenuItem
                  icon={<DeleteIcon size={15} />}
                  label={t('clear')}
                  disabled={!p.hasSelection}
                  onClick={closeAnd(p.onDelete)}
                />
                <MenuItem icon={<DownloadIcon size={15} />} label={t('export')} onClick={closeAnd(p.onExport)} />
                <MenuItem icon={<ImageIcon size={15} />} label={t('changeImage')} onClick={closeAnd(p.onOpenFile)} />
                <div className="my-1 h-px bg-neutral-800" />
                <MenuItem
                  icon={<TranslateIcon size={15} />}
                  label={t('langOther')}
                  onClick={closeAnd(toggleLang)}
                />
              </div>
            </>
          )}
        </div>
      )}
      {p.hasImage && (
        <button
          type="button"
          onClick={p.onOpenFile}
          className="hidden items-center gap-1 rounded-md bg-neutral-600/20 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white md:flex"
        >
          <ImageIcon size={15} /> {t('changeImage')}
        </button>
      )}
      <div className="mx-1 h-6 w-px bg-neutral-800 hidden md:block" />
      <Seg<Shape>
        value={p.tool}
        onChange={p.onTool}
        className='scale-[85.5%] md:scale-100'
        options={[
          { value: 'rect', icon: <RectangleGlyph />, title: t('rect') },
          { value: 'roundRect', icon: <RoundRectIcon />, title: t('roundRect') },
          { value: 'ellipse', icon: <CircleGlyph />, title: t('ellipse') },
        ]}
      />
      <div className="mx-1 h-6 w-px bg-neutral-800 hidden md:block" />
      <IconBtn title={t('undo')} disabled={!p.canUndo} onClick={p.onUndo}>
        <RollbackIcon />
      </IconBtn>
      <IconBtn title={t('redo')} disabled={!p.canRedo} onClick={p.onRedo}>
        <RedoIcon />
      </IconBtn>
      <IconBtn
        title={t('deleteSel')}
        disabled={!p.hasSelection}
        onClick={p.onDelete}
        className="hidden md:flex"
      >
        <DeleteIcon />
      </IconBtn>
      <div className="flex-1" />
      {p.hasImage && (
        <>
          <button
            type="button"
            onClick={toggleLang}
            title={t('langOther')}
            className={`hidden gap-1.5 px-2 py-1.5 md:flex ${langBtnClasses}`}
          >
            <TranslateIcon size={15} /> {t('langOther')}
          </button>
          <button
            type="button"
            onClick={p.onExport}
            className="hidden items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:flex"
          >
            <DownloadIcon size={15} /> {t('export')}
          </button>
        </>
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
