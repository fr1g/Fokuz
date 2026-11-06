import { ImageIcon } from 'tdesign-icons-react';

interface DropzoneProps {
  onOpenFile: () => void;
  error: string | null;
  decoding?: boolean;
}

export function Dropzone({ onOpenFile, error, decoding }: DropzoneProps) {
  return (
    <div
      onClick={() => !decoding && onOpenFile()}
      className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-8 text-center select-none ${decoding ? '' : 'cursor-pointer'
        }`}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 text-neutral-500">
        <ImageIcon size={44} />
      </div>
      {decoding ? (
        <p className="animate-pulse text-base text-neutral-300">正在解码图片…</p>
      ) : (
        <div>
          <p className="text-base text-neutral-200">点击选择图片，或拖拽到页面 / 按 Ctrl+V 粘贴</p>
          <p className="mt-2 text-sm text-neutral-500">
            支持 PNG / JPG / WebP 等 :: 所有处理均在本地完成，网络基本0依赖
          </p>
        </div>
      )}
      {error && (
        <p className="rounded bg-red-500/10 px-3 py-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
