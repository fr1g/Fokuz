import { useSyncExternalStore } from 'react';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'fokuz-locale';
const listeners = new Set<() => void>();

function applyLang(l: Locale) {
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
}

function loadInitial(): Locale {
  let l: Locale = navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') l = saved;
  } catch {
    /* storage unavailable — keep the navigator default */
  }
  applyLang(l);
  return l;
}

let locale: Locale = loadInitial();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(l: Locale) {
  if (l === locale) return;
  locale = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore */
  }
  applyLang(l);
  listeners.forEach((fn) => fn());
}

/** Re-renders the caller whenever the language changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getLocale,
  );
}

const zh = {
  changeImage: '换图',
  menu: '菜单',
  rect: '矩形选区',
  roundRect: '圆角矩形选区',
  ellipse: '椭圆选区',
  undo: '撤销（Ctrl+Z）',
  redo: '重做（Ctrl+Y / Ctrl+Shift+Z）',
  deleteSel: '删除选区（Delete / Esc）',
  clear: '清空',
  export: '导出',
  langOther: 'English',

  dimTitle: '选区外遮挡',
  black: '黑色',
  white: '白色',
  opacity: '不透明度',
  obscureTitle: '模糊 / 马赛克',
  none: '无',
  blur: '模糊',
  mosaic: '马赛克',
  strength: '强度',
  strokeTitle: '选区描边',
  strokeWidth: '描边宽度',
  magnifyTitle: '放大镜',
  magnification: '放大倍数',
  cornerTitle: '圆角',
  radius: '圆角比例',
  shiftHint: '按住 Shift 拖拽可画出正方形 / 正圆，调整大小时按住 Shift 锁定宽高比。',
  panelTab: '效果参数',

  zoomOut: '缩小',
  zoomIn: '放大',
  fit: '适应',
  fitTitle: '适应窗口（双击画布空白处）',

  exportImage: '导出图片',
  format: '格式',
  formatHeader: (label: string, w: number, h: number) =>
    `格式（源图：${label} · 分辨率保持原图 ${w} × ${h}）`,
  originalFmt: (label: string) => `原格式(${label})`,
  originalTitle: (label: string) => `按 ${label} 原有的规格和压缩程度导出`,
  originalUnavailable: '浏览器无法编码该格式',
  quality: '质量',
  pngInfo: 'PNG 无损导出，像素与原图一致',
  jpegOriginalInfo: (q: unknown) => `按原图压缩规格重编码（检测到原图质量 ≈ Q${q}）`,
  webpOriginalInfo: '按原图格式重编码（WebP 固定 Q90）',
  tiffInfo: 'TIFF 无压缩导出（文件较大，适合印刷 / 后期）',
  estimatingSize: '正在估算文件大小…',
  estimatedSize: (s: string) => `预计大小：${s}`,
  cancel: '取消',
  exportDownload: '导出并下载',
  rendering: '生成中…',
  noticeTiff: '源图为 TIFF：导出会展平为单页图像，文件内置的图层 / 多页不会保留。',
  noticeHeic: '源图为 HEIC：浏览器无法编码 HEIC，无法按原格式导出，请选择 JPEG 或 WebP。',
  noticeAvif: '源图为 AVIF：浏览器无法编码 AVIF，无法按原格式导出，请选择 JPEG 或 WebP。',
  noticeGif: '源图为 GIF：动图仅取第一帧，且浏览器无法编码 GIF，请选择 JPEG 或 WebP。',
  noticeBmp: '源图为 BMP：浏览器无法编码 BMP，无法按原格式导出，请选择 JPEG 或 WebP。',

  dropTitle: '点击选择图片，或拖拽到页面 / 按 Ctrl+V 粘贴',
  dropHint: '支持 PNG / JPG / WebP / TIFF / HEIC · 所有处理均在本地完成，不会上传',
  decoding: '正在解码图片…',
  decodeError: '无法解码这张图片，可能已损坏或格式不受支持',
};

const en: Record<keyof typeof zh, string | ((...args: any[]) => string)> = {
  changeImage: 'Change image',
  menu: 'Menu',
  rect: 'Rectangle selection',
  roundRect: 'Rounded-rect selection',
  ellipse: 'Ellipse selection',
  undo: 'Undo (Ctrl+Z)',
  redo: 'Redo (Ctrl+Y / Ctrl+Shift+Z)',
  deleteSel: 'Delete selection (Del / Esc)',
  clear: 'Clear',
  export: 'Export',
  langOther: '中文',

  dimTitle: 'Outside dim',
  black: 'Black',
  white: 'White',
  opacity: 'Opacity',
  obscureTitle: 'Blur / Mosaic',
  none: 'None',
  blur: 'Blur',
  mosaic: 'Mosaic',
  strength: 'Strength',
  strokeTitle: 'Selection stroke',
  strokeWidth: 'Stroke width',
  magnifyTitle: 'Magnifier',
  magnification: 'Magnification',
  cornerTitle: 'Corner radius',
  radius: 'Radius',
  shiftHint:
    'Hold Shift while dragging for a square / perfect circle; hold Shift while resizing to lock the aspect ratio.',
  panelTab: 'Adjustments',

  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fit: 'Fit',
  fitTitle: 'Fit to window (double-click empty canvas)',

  exportImage: 'Export image',
  format: 'Format',
  formatHeader: (label: string, w: number, h: number) =>
    `Format (source: ${label} · resolution kept at ${w} × ${h})`,
  originalFmt: (label: string) => `Original (${label})`,
  originalTitle: (label: string) => `Export as ${label} with the source's own specs`,
  originalUnavailable: 'This browser cannot encode the format',
  quality: 'Quality',
  pngInfo: 'Lossless PNG — pixels identical to the original',
  jpegOriginalInfo: (q: unknown) =>
    `Re-encoded with the source's compression settings (estimated quality ≈ Q${q})`,
  webpOriginalInfo: 'Re-encoded as WebP (fixed Q90)',
  tiffInfo: 'Uncompressed TIFF (large file; for print / post-processing)',
  estimatingSize: 'Estimating file size…',
  estimatedSize: (s: string) => `Estimated size: ${s}`,
  cancel: 'Cancel',
  exportDownload: 'Export & download',
  rendering: 'Rendering…',
  noticeTiff: 'Source is TIFF: exporting flattens it to a single-page image; embedded layers / pages are not preserved.',
  noticeHeic: 'Source is HEIC: this browser cannot encode HEIC, so original-format export is unavailable — choose JPEG or WebP.',
  noticeAvif: 'Source is AVIF: this browser cannot encode AVIF, so original-format export is unavailable — choose JPEG or WebP.',
  noticeGif: 'Source is GIF: only the first frame is used, and this browser cannot encode GIF — choose JPEG or WebP.',
  noticeBmp: 'Source is BMP: this browser cannot encode BMP, so original-format export is unavailable — choose JPEG or WebP.',

  dropTitle: 'Click to choose an image, drag & drop it here, or paste with Ctrl+V',
  dropHint: 'PNG / JPG / WebP / TIFF / HEIC supported · everything runs locally, nothing is uploaded',
  decoding: 'Decoding image…',
  decodeError: 'Could not decode this image — it may be corrupted or unsupported',
};

export type LocaleKey = keyof typeof zh;
const DICT: Record<Locale, Record<LocaleKey, string | ((...args: any[]) => string)>> = {
  zh,
  en,
};

/** Translate `key` under the current locale, passing args to function entries. */
export function t(key: LocaleKey, ...args: unknown[]): string {
  const entry = DICT[locale][key];
  return typeof entry === 'function' ? entry(...args) : entry;
}
