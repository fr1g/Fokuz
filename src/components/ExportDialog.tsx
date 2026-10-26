import { useEffect, useState } from 'react';
import { CloseIcon, DownloadIcon } from 'tdesign-icons-react';
import { EXT, baseName, downloadBlob, formatBytes, renderExport } from '../lib/export';
import type { EditorState, ExportFormat, LoadedImage } from '../types';
import { Seg } from './ui/Seg';
import { Slider } from './ui/Slider';

interface ExportDialogProps {
  open: boolean;
  image: LoadedImage;
  state: EditorState;
  onClose: () => void;
}

export function ExportDialog({ open, image, state, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(90);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Live size estimate (debounced — a full re-render per change is not cheap).
  useEffect(() => {
    if (!open || format === 'png') {
      setEstimate(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const blob = await renderExport(image, state, format, quality);
        setEstimate(blob.size);
      } catch {
        setEstimate(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [open, format, quality, image, state]);

  if (!open) return null;

  const doExport = async () => {
    setBusy(true);
    try {
      const blob = await renderExport(image, state, format, quality);
      downloadBlob(blob, `${baseName(image.name)}-focus.${EXT[format]}`);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">导出图片</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 transition-colors hover:text-white"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs text-neutral-400">格式</div>
            <Seg
              className="w-full"
              value={format}
              onChange={(v) => setFormat(v)}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpeg', label: 'JPG' },
                { value: 'webp', label: 'WebP' },
              ]}
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              PNG 无损 · 分辨率与原图一致（{image.width} × {image.height}）
            </p>
          </div>

          {format !== 'png' && (
            <Slider
              label="质量"
              min={1}
              max={100}
              value={quality}
              format={(v) => `${v}`}
              onInput={setQuality}
            />
          )}

          <div className="rounded-lg bg-neutral-800/60 px-3 py-2 text-xs text-neutral-400">
            {format === 'png'
              ? '无损导出，画质与原图完全一致'
              : estimate !== null
                ? `预计大小：${formatBytes(estimate)}`
                : '正在估算文件大小…'}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={doExport}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:opacity-50"
            >
              <DownloadIcon size={15} /> {busy ? '生成中…' : '导出并下载'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
