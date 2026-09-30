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
  standard: 0.82,
  high: 0.92,
  ultra: 0.98,
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
}

export async function renderToCanvas(
  node: HTMLElement,
  quality: ExportQuality = 'high',
): Promise<RenderedCanvas> {
  const scale = QUALITY_SCALE[quality];
  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: getComputedStyle(node).backgroundColor || '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
  });
  return { canvas, width: canvas.width, height: canvas.height };
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
  const content = await renderToCanvas(node, opts.quality);
  const { canvas } = content;
  const dims = PAPER_DIMS[opts.paperSize];
  const pdf = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: [dims.w, dims.h],
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  const imgAspect = canvas.width / canvas.height;
  let imgW = usableW;
  let imgH = imgW / imgAspect;

  if (imgH > usableH) {
    imgH = usableH;
    imgW = imgH * imgAspect;
  }

  const x = (pageW - imgW) / 2;
  const y = margin;

  const scaledTotalH = canvas.height * (usableW / canvas.width);
  const fitsOnOnePage = scaledTotalH <= usableH + 1;

  if (fitsOnOnePage) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, imgW, imgH);
  } else {
    const pxToMm = usableW / canvas.width;
    const slicePxHeight = Math.floor(usableH / pxToMm);
    let offsetPixels = 0;
    let pageNum = 0;
    while (offsetPixels < canvas.height) {
      const sliceHeight = Math.min(slicePxHeight, canvas.height - offsetPixels);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(sliceHeight);
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, offsetPixels, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      const sliceW = usableW;
      const sliceH = sliceHeight * pxToMm;
      if (pageNum > 0) pdf.addPage();
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, sliceW, sliceH);
      offsetPixels += sliceHeight;
      pageNum += 1;
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