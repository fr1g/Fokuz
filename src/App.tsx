import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { Dropzone } from './components/Dropzone';
import { EffectPanel } from './components/EffectPanel';
import { ExportDialog } from './components/ExportDialog';
import { Toolbar } from './components/Toolbar';
import { useHistory } from './hooks/useHistory';
import { decodeImageFile, detectFormat } from './lib/image';
import { DEFAULT_EFFECTS, type EditorState, type LoadedImage, type Shape } from './types';

export default function App() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [tool, setTool] = useState<Shape>('rect');
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hist = useHistory<EditorState>({ selection: null, effects: { ...DEFAULT_EFFECTS } });
  const histRef = useRef(hist);
  histRef.current = hist;
  const exportOpenRef = useRef(exportOpen);
  exportOpenRef.current = exportOpen;

  const loadFile = useCallback(async (file: File) => {
    setDecoding(true);
    try {
      const format = await detectFormat(file);
      const img = await decodeImageFile(file, format);
      setImage(img);
      setError(null);
      histRef.current.reset({ selection: null, effects: { ...DEFAULT_EFFECTS } });
    } catch {
      setError('无法解码这张图片，可能已损坏或格式不受支持');
    } finally {
      setDecoding(false);
    }
  }, []);

  // Paste anywhere / drop anywhere.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) void loadFile(file);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file) void loadFile(file);
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [loadFile]);

  // Global shortcuts: undo/redo, clear selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      ) {
        return;
      }
      const h = histRef.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) h.redo();
        else h.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        h.redo();
        return;
      }
      if (exportOpenRef.current) return;
      if (e.key === 'Escape') {
        if (h.state.selection) h.commit({ ...h.state, selection: null });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (h.state.selection) {
          e.preventDefault();
          h.commit({ ...h.state, selection: null });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openFile = () => fileInputRef.current?.click();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-neutral-200">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.tif,.tiff"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = '';
        }}
      />
      <Toolbar
        hasImage={!!image}
        tool={tool}
        onTool={setTool}
        canUndo={hist.canUndo}
        canRedo={hist.canRedo}
        onUndo={hist.undo}
        onRedo={hist.redo}
        hasSelection={!!hist.state.selection}
        onDelete={() => hist.commit({ ...hist.state, selection: null })}
        onExport={() => setExportOpen(true)}
        onOpenFile={openFile}
      />
      {error && image && (
        <div className="bg-red-500/10 px-4 py-1.5 text-center text-sm text-red-400">{error}</div>
      )}
      {image ? (
        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          <CanvasStage
            image={image}
            tool={tool}
            state={hist.state}
            onPreview={hist.set}
            onCommitBaseline={hist.commitBaseline}
          />
          <EffectPanel
            effects={hist.state.effects}
            shape={tool}
            onPreview={(effects) => hist.set({ ...hist.state, effects })}
            onCommit={(effects) => hist.commit({ ...hist.state, effects })}
            snapshot={() => hist.state}
            onCommitBaseline={hist.commitBaseline}
          />
        </div>
      ) : (
        <Dropzone onOpenFile={openFile} error={error} decoding={decoding} />
      )}
      {image && (
        <ExportDialog
          open={exportOpen}
          image={image}
          state={hist.state}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
