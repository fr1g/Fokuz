# HEIC 原格式导出 —— 调研与搁置决策记录

> 记录时间：2026-10-27。起因：用户期望导出选项为【原格式(HEIC)】【JPEG】【WebP】，选"原格式"按原图规格导出。当前实现中 HEIC 源的"原格式"选项为置灰状态（见 `src/components/ExportDialog.tsx` 的 `sourceNotice('heic')`），本文档记录原因、难点与将来若要实现的完整方案。届时请先复核文中引用的包版本与生态现状。

## 一、现状

- **HEIC 导入已支持**：`src/lib/image.ts` → `decodeHeic()`，动态加载 `heic2any`（内含 libheif + libde265 的 wasm 解码器，仅解码），iPhone 实拍图与标准样例均验证通过。
- **HEIC 导出不可用**：`src/lib/image.ts` 的 `ORIGINAL_EXPORTABLE.heic = false`，导出对话框中【原格式(HEIC)】置灰，提示改用 JPEG / WebP。
- 涉及代码位置：
  - `src/lib/image.ts` — 格式嗅探、`decodeHeic`
  - `src/lib/export.ts` — `resolveExport`、`renderExport`
  - `src/components/ExportDialog.tsx` — 三选项模型与置灰提示
  - `vite.config.ts` — `optimizeDeps.include: ['heic2any']`

## 二、为什么浏览器里"HEIC 原格式导出"难

1. **浏览器原生只有解码没有编码**：`canvas.toBlob` 仅支持 png/jpeg/webp。任何 HEIC 输出都必须自带编码器（wasm）。
2. **解码 ≠ 编码**：解码用 libde265（现成、体积小）；编码需要 **x265（HEVC 编码器）**，libheif 需以 `ENABLE_ENCODER` 构建才能用。现成的便利包（heic2any、heic-convert、@saschazar/wasm-heif 等）全是**只解码**。
3. **性能**：x265 在 wasm 里跑是单线程 CPU 密集任务，一张 12MP 的 iPhone 照片估计需要 30 秒~2 分钟（原生二进制也要数秒）。可用 WASM SIMD + Web Worker 缓解，但无法根治。
4. **包体**：x265 + libheif 编码器的 wasm 预计 3~6MB（gzip 后仍有 1.5~3MB），是当前解码 chunk（1.35MB）的数倍，PWA 预缓存与首屏内存都会明显上涨。
5. **内存**：12MP 图 RGBA 源即 48MB，编码器内部还有压缩前缓冲，低内存移动设备有 OOM 风险。
6. **许可证**：x265 为 **GPL-2.0 双许可**（闭源/商用需向 MulticoreWare 购买，或证明仅 GPL 分发）；libheif（LGPL-2.1，版本间有变动历史）、libde265（LGPL-3.0）以独立 wasm 动态链接方式打包通常可规避传染，但**若本项目要公开发布需先做许可复核**。
7. **"按原压缩规格"的语义问题**：JPEG 可以从 DQT 反推质量值，但 HEIC/HEVC 容器里的编码参数（量化、rate-control）**无法可靠反推成一个 x265 的 quality 值**。即便做了编码，也只能给"固定高质量档（如 qp≈18~22）"，本质是"接近原图观感"而非用户要求的"按原先的规格"。这是与需求的第二重偏差，立项前需与用户确认可接受。

## 三、可行路径

### 路径 A（推荐优先评估）：采用现成包 `icodec`

- npm 包名 `icodec`（[GitHub: Kaciras/icodec](https://github.com/Kaciras/icodec)），MIT 许可（其依赖的许可另计）。
- HEIC 模块 = libheif + x265 **编码** + libde265 解码，浏览器可用，输入/输出 RGBA。
- 已核实的硬性限制：
  - **必须在 Web Worker 中编码**（libheif 无法为 x265 指定线程数，主线程不可用）；
  - 需要 **WebAssembly SIMD**（2026 年所有常青浏览器均已支持，PWA 目标环境无碍）；
  - 仅静态图、仅 RGBA。
- 维护状况堪忧：最新版 0.6.0 发布于 2024-11-10，约两年未更新，star 很少。**立项前须实际跑通并做编码产物兼容性测试**（产出文件用 iPhone / Windows 照片查看器 / ImageMagick 验证可读）。
- 包体：整包 unpacked 23.9MB（含全部格式模块），仅引 HEIC 模块时预计 3~6MB，需实测。

### 路径 B：自编译 libheif + x265 到 wasm

- 用 Emscripten 编译 libde265 + libheif（`ENABLE_ENCODER=ON`）+ x265，产物 `libheif-enc.wasm` + JS 胶水。
- 优点：可控体积（只含 HEIC 编码）、可裁剪线程模型；缺点：工具链与维护成本高，且依然绕不开 x265 的 GPL 问题（除非改用其它 HEVC 编码器，生态更差）。
- 仅当路径 A 跑不通（产物兼容性差、包体超预期）时再考虑。

### 路径 C：继续搁置（当前选择）

- 维持现状：HEIC 源提供 JPEG / WebP 导出，默认 JPEG。
- 建议每年复核一次：搜索 `heic encode wasm` / `libheif encoder webassembly`，关注 [libheif 官方](https://github.com/strukturag/libheif)的 wasm 构建是否自带编码器、`icodec` 是否恢复维护。

> 明确的死胡同，不要尝试：**改写原 HEIC 文件内部的图像数据**来"保留原格式"。HEIC 容器内的 HEVC 码流与文件其余部分强关联（hvcC 参数集、tile 布局、缩略图/iLOC 等），处理后像素必然变化、码流必须重编码，容器级"替换内容"不可行。

## 四、若立项（以路径 A 为例）的实施清单

1. `npm i icodec`，在 Worker 中封装 `encodeHeic(imageData, options) → Blob`：
   - 新建 `src/lib/heicEncode.worker.ts`，主线程通过 `postMessage` 传 `ImageData`（或 transferable buffer），Worker 内加载 wasm 编码，返回 HEIC Blob；
   - wasm 产物放独立 chunk，动态加载（沿用 heic2any 的模式），仅当用户选择【原格式(HEIC)】时才下载。
2. UI 改动：
   - `src/lib/image.ts`：`ORIGINAL_EXPORTABLE.heic` 改为 `true`；
   - `src/components/ExportDialog.tsx`：`sourceNotice('heic')` 的置灰提示移除，换成编码耗时提示（"HEIC 编码较慢，可能需要数十秒"）；
   - 导出按钮需支持进度/禁用态，编码放在 Worker，避免主线程卡死；
   - `src/lib/export.ts` 的 `resolveExport`：`heic` 分支返回 `{ format: 'heic', quality: 固定档 }`，`renderExport` 增加 `heic` 分支（`ctx.getImageData` → Worker 编码 → Blob）。
3. 质量参数策略：固定高质量档（建议从 x265 qp≈20 起步，实测调节），对话框注明"按接近原图的规格编码（HEIC 无法复刻原压缩参数）"。
4. 测试清单：
   - iPhone 实拍 HEIC（各种方向/位数）、nokiatech 样例、8/10/12 位深；
   - 产物兼容性：iOS 相册可开、Windows 照片可开、`magick identify` 元数据正确、Photoshop 可开；
   - 大图（12MP+）耗时与内存峰值基准（目标设备：普通笔记本 + 中端安卓）；
   - Service Worker 离线环境下 wasm chunk 可用性。
5. 风险登记：GPL 复核、icodec 停更导致的安全/兼容冻结、低内存设备 OOM（准备超 8MP 时降档或拒绝并提示的兜底）。

## 五、决策记录

| 时间 | 决定 | 理由 |
|---|---|---|
| 2026-10-27 | 搁置，维持 JPEG/WebP 导出 | 非核心刚需；候选包维护停滞；包体 +3~6MB 与编码耗时损害体验；GPL 需复核；"按原压缩规格"对 HEIC 本身不可达 |

## 六、参考

- [libheif（官方，解码+编码，含 JS 说明）](https://github.com/strukturag/libheif)
- [Kaciras/icodec（浏览器端 HEIC 编码，libheif+x265）](https://github.com/Kaciras/icodec)
- [libheif-js（Emscripten 发行版）](https://www.npmjs.com/package/libheif-js)
- [heic-convert（仅解码转换）](https://www.npmjs.com/package/heic-convert)
- 本机工具备忘：ImageMagick 7.1.2 已装，AVIF 可读可写、HEIC 只读（无编码 delegate），可用于产物校验；测试 HEIC 样例可从 [tigranbs/test-heic-images](https://github.com/tigranbs/test-heic-images) 经 jsDelivr 获取。
