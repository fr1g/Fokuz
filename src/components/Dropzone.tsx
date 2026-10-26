import { ImageIcon } from 'tdesign-icons-react';

interface DropzoneProps {
  onOpenFile: () => void;
  error: string | null;
}

export function Dropzone({ onOpenFile, error }: DropzoneProps) {
  return (
    <div
      onClick={onOpenFile}
      className="flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-5 p-8 text-center select-none"
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 text-neutral-500">
        <ImageIcon size={44} />
      </div>
      <div>
        <p className="text-base text-neutral-200">点击选择图片，或拖拽到页面 / 按 Ctrl+V 粘贴</p>
        <p className="mt-2 text-sm text-neutral-500">
          支持 PNG / JPG / WebP · 所有处理均在本地完成，不会上传
        </p>
      </div>
      {error && (
        <p className="rounded bg-red-500/10 px-3 py-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
