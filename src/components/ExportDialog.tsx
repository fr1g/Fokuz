import { useEffect, useState } from 'react';
import { t, useLocale } from '../lib/i18n';
import { CloseIcon, DownloadIcon } from 'tdesign-icons-react';
import {
  EXT,
  baseName,
  downloadBlob,
  formatBytes,
  renderExport,
  resolveExport,
} from '../lib/export';
import { ORIGINAL_EXPORTABLE, SOURCE_LABEL } from '../lib/image';
import type { EditorState, ExportChoice, LoadedImage } from '../types';
import { Seg } from './ui/Seg';
import { Slider } from './ui/Slider';

interface ExportDialogProps {
  open: boolean;
  image: LoadedImage;
  state: EditorState;
  onClose: () => void;
}

function sourceNotice(sourceFormat: LoadedImage['sourceFormat']): string | null {
  switch (sourceFormat) {
    case 'tiff':
      return t('noticeTiff');
    case 'heic':
      return t('noticeHeic');
    case 'avif':
      return t('noticeAvif');
    case 'gif':
      return t('noticeGif');
    case 'bmp':
      return t('noticeBmp');
    default:
      return null;
  }
}

export function ExportDialog({ open, image, state, onClose }: ExportDialogProps) {
  useLocale();
  const [choice, setChoice] = useState<ExportChoice>('original');
  const [quality, setQuality] = useState(90);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const originalAvailable = ORIGINAL_EXPORTABLE[image.sourceFormat];

  // Defaults per open / per image: original format when possible; the quality
  // slider starts at the source's own quality so "JPEG" means "compress further".
  useEffect(() => {
    if (!open) return;
    setChoice(originalAvailable ? 'original' : 'jpeg');
    setQuality(image.sourceFormat === 'jpeg' ? (image.originalQuality ?? 90) : 90);
  }, [open, image, originalAvailable]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Live size estimate (debounced — a full re-render per change is not cheap).
  const estimating = choice === 'jpeg' || choice === 'webp' || (choice === 'original' && image.sourceFormat === 'webp');
  useEffect(() => {
    if (!open || !estimating) {
      setEstimate(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { format, quality: q } = resolveExport(image, choice, quality);
        const blob = await renderExport(image, state, format, q);
        setEstimate(blob.size);
      } catch {
        setEstimate(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [open, choice, quality, estimating, image, state]);

  if (!open) return null;

  const doExport = async () => {
    setBusy(true);
    try {
      const { format, quality: q } = resolveExport(image, choice, quality);
      const blob = await renderExport(image, state, format, q);
      downloadBlob(blob, `${baseName(image.name)}-focus.${EXT[format]}`);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const notice = sourceNotice(image.sourceFormat);
  const showQuality = choice === 'jpeg' || choice === 'webp';

  const infoLine = (() => {
    if (choice === 'original') {
      switch (image.sourceFormat) {
        case 'png':
          return t('pngInfo');
        case 'jpeg':
          return t('jpegOriginalInfo', image.originalQuality ?? '?');
        case 'webp':
          return t('webpOriginalInfo');
        case 'tiff':
          return t('tiffInfo');
        default:
          return null;
      }
    }
    return estimate !== null ? t('estimatedSize', formatBytes(estimate)) : t('estimatingSize');
  })();

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
          <h2 className="text-base font-semibold">{t('exportImage')}</h2>
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
            <div className="mb-1.5 text-xs text-neutral-400">
              {t('formatHeader', SOURCE_LABEL[image.sourceFormat], image.width, image.height)}
            </div>
            <Seg<ExportChoice>
              className="w-full"
              value={choice}
              onChange={(v) => setChoice(v)}
              options={[
                {
                  value: 'original',
                  label: t('originalFmt', SOURCE_LABEL[image.sourceFormat]),
                  disabled: !originalAvailable,
                  title: originalAvailable
                    ? t('originalTitle', SOURCE_LABEL[image.sourceFormat])
                    : t('originalUnavailable'),
                },
                { value: 'jpeg', label: 'JPEG', title: t('quality') + ' · JPEG' },
                { value: 'webp', label: 'WebP', title: t('quality') + ' · WebP' },
              ]}
            />
            {notice && (
              <p className="mt-1.5 rounded bg-amber-500/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber-400">
                {notice}
              </p>
            )}
          </div>

          {showQuality && (
            <Slider
              label={t('quality')}
              min={1}
              max={100}
              value={quality}
              format={(v) => `${v}`}
              onInput={setQuality}
            />
          )}

          {infoLine && (
            <div className="rounded-lg bg-neutral-800/60 px-3 py-2 text-xs text-neutral-400">
              {infoLine}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={doExport}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:opacity-50"
            >
              <DownloadIcon size={15} /> {busy ? t('rendering') : t('exportDownload')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
