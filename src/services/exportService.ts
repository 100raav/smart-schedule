import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { ExportQuality, PaperSize, Orientation } from '../types';
import { downloadFile } from '../utils/id';

export interface ExportOptions {
  quality: ExportQuality;
  paperSize: PaperSize;
  orientation: Orientation;
  jpegQuality?: number;
}

const QUALITY_SCALE: Record<ExportQuality, number> = {
  standard: 2,
  high: 3,
  ultra: 4,
};

const JPEG_QUALITY: Record<ExportQuality, number> = {
  standard: 0.94,
  high: 0.98,
  ultra: 1,
};

const PAPER_DIMS: Record<PaperSize, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a5: { w: 148, h: 210 },
  letter: { w: 215.9, h: 279.4 },
};

export interface RenderedCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** CSS pixel size of the rendered node. */
  cssWidth: number;
  cssHeight: number;
  scale: number;
}

export async function renderToCanvas(
  node: HTMLElement,
  quality: ExportQuality = 'high',
): Promise<RenderedCanvas> {
  const scale = QUALITY_SCALE[quality];
  // Webfonts must be resolved first, otherwise html2canvas measures and paints
  // text with a fallback face and the output looks soft/wrong.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      /* font loading API unavailable — continue */
    }
  }
  // Render the whole node: never crop horizontally (that is how day columns
  // used to disappear) and always include the full content height.
  const cssWidth = node.clientWidth || node.scrollWidth;
  const cssHeight = Math.max(node.scrollHeight, node.clientHeight);
  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 15000,
    width: cssWidth,
    height: cssHeight,
    windowWidth: cssWidth,
    scrollX: 0,
    scrollY: 0,
  });
  return { canvas, width: canvas.width, height: canvas.height, cssWidth, cssHeight, scale };
}

function nodeSanitizedTitle(): string {
  return 'schedule';
}

export async function exportPNG(
  node: HTMLElement,
  opts: ExportOptions,
  filename = 'schedule.png',
): Promise<void> {
  const { canvas } = await renderToCanvas(node, opts.quality);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('Could not create PNG image.');
  downloadFile(filename, blob);
}

export async function exportJPG(
  node: HTMLElement,
  opts: ExportOptions,
  filename = 'schedule.jpg',
): Promise<void> {
  const { canvas } = await renderToCanvas(node, opts.quality);
  const quality = JPEG_QUALITY[opts.quality] ?? 0.92;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Could not create JPG image.');
  downloadFile(filename, blob);
}

export async function exportPDF(
  node: HTMLElement,
  opts: ExportOptions,
  filename = 'schedule.pdf',
): Promise<void> {
  const { canvas, cssWidth, cssHeight } = await renderToCanvas(node, opts.quality);
  const dims = PAPER_DIMS[opts.paperSize];
  const pdf = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: [dims.w, dims.h],
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // The sheet carries its own print margin, so it is placed full-bleed on the
  // page: 1:1 CSS pixels, no double margins, nothing squeezed.
  const mmPerPx = pageW / cssWidth;
  const pageContentPx = pageH / mmPerPx;
  const totalPages = Math.max(1, Math.ceil((cssHeight - 0.5) / pageContentPx));
  // Lossless PNG keeps small type crisp; JPEG artifacts were the main source of
  // the "blurry text" look in exported PDFs.
  const dataUrl = canvas.toDataURL('image/png');

  if (totalPages === 1) {
    const drawH = Math.min(cssHeight, pageContentPx) * mmPerPx;
    pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, drawH, undefined, 'FAST');
  } else {
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      // Integer pixel slices keep every page seamless and sharp.
      const srcTop = Math.round(page * pageContentPx);
      const srcH = Math.min(Math.round(pageContentPx), canvas.height - srcTop);
      if (srcH <= 0) break;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = srcH;
      const ctx = slice.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, srcTop, canvas.width, srcH, 0, 0, canvas.width, srcH);
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageW, srcH * mmPerPx, undefined, 'FAST');
    }
  }

  pdf.save(filename);
}

export function buildExportName(name: string, format: string): string {
  const base = (name || nodeSanitizedTitle())
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'schedule'}.${format}`;
}

export function paperDimensionsMm(size: PaperSize, orientation: Orientation): { w: number; h: number } {
  const base = PAPER_DIMS[size];
  if (orientation === 'landscape') return { w: base.h, h: base.w };
  return base;
}

export interface ExportPlan {
  scale: number;
  /** PNG/JPG output size in pixels. */
  imageWidth: number;
  imageHeight: number;
  /** Number of PDF pages the current sheet will produce. */
  pages: number;
  paperWidthMm: number;
  paperHeightMm: number;
}

/** Describes exactly what a given sheet size will produce, without exporting. */
export function describeExport(
  cssWidth: number,
  cssHeight: number,
  opts: Pick<ExportOptions, 'quality' | 'paperSize' | 'orientation'>,
): ExportPlan {
  const scale = QUALITY_SCALE[opts.quality];
  const paper = paperDimensionsMm(opts.paperSize, opts.orientation);
  const safeW = cssWidth > 0 ? cssWidth : 1;
  const mmPerPx = paper.w / safeW;
  const pageContentPx = paper.h / mmPerPx;
  return {
    scale,
    imageWidth: Math.round(cssWidth * scale),
    imageHeight: Math.round(cssHeight * scale),
    pages: Math.max(1, Math.ceil((cssHeight - 0.5) / pageContentPx)),
    paperWidthMm: paper.w,
    paperHeightMm: paper.h,
  };
}

export function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}