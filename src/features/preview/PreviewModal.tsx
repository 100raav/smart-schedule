import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  FileJson,
  Printer,
  Image as ImageIcon,
  Pencil,
  CheckCircle2,
} from 'lucide-react';
import type { ExportQuality, Orientation, PaperSize, Schedule } from '../../types';
import { ScheduleGrid } from '../scheduler/ScheduleGrid';
import { Segmented } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useUIStore } from '../../store/uiStore';
import {
  exportPDF,
  exportPNG,
  exportJPG,
  buildExportName,
  describeExport,
} from '../../services/exportService';
import { exportScheduleJson } from '../../services/jsonService';

const PAGE_PX: Record<PaperSize, number> = {
  a4: 794,
  a5: 559,
  letter: 816,
};

const PAGE_RATIO: Record<PaperSize, number> = {
  a4: 297 / 210,
  a5: 210 / 148,
  letter: 279.4 / 215.9,
};

const QUALITY_LABEL: Record<ExportQuality, string> = {
  standard: '2×',
  high: '3×',
  ultra: '4×',
};

interface Props {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  onEdit: () => void;
}

export function PreviewModal({ open, onClose, schedule, onEdit }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const toast = useUIStore((s) => s.toast);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (open) setZoom(1);
  }, [open]);

  // True page box, then swap the long edge for landscape.
  const portraitW = PAGE_PX[paperSize];
  const portraitH = Math.round(portraitW * PAGE_RATIO[paperSize]);
  const isLandscape = orientation === 'landscape';
  const pageWidthPx = isLandscape ? portraitH : portraitW;
  const pageHeightPx = isLandscape ? portraitW : portraitH;
  // ~10 mm of print margin on every side, measured off the short edge so the
  // physical margin stays identical in portrait and landscape.
  const pagePad = Math.round(portraitW * 0.047);

  const plan = describeExport(
    sheetSize.w || pageWidthPx,
    sheetSize.h || pageHeightPx,
    { quality, paperSize, orientation },
  );
  const baseName = buildExportName(schedule.name, '').replace(/\.$/, '');
  const fileName = `${baseName}.pdf · .png · .jpg`;

  // Track the real sheet size so the readout matches the downloaded file.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const measure = () =>
      setSheetSize((prev) => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, pageWidthPx, pageHeightPx, schedule]);

  const runExport = async (format: 'pdf' | 'png' | 'jpg' | 'json') => {
    const node = sheetRef.current;
    if (!node) return;
    setBusy(format);
    // Export at 1:1 — never let the on-screen zoom affect the rendered output.
    const prevZoom = zoom;
    setZoom(1);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const name = buildExportName(schedule.name, format);
      if (format === 'pdf') {
        await exportPDF(node, { quality, paperSize, orientation }, name);
        toast('success', 'PDF exported successfully', name);
      } else if (format === 'png') {
        await exportPNG(node, { quality, paperSize, orientation }, name);
        toast('success', 'PNG exported successfully', name);
      } else if (format === 'jpg') {
        await exportJPG(node, { quality, paperSize, orientation }, name);
        toast('success', 'JPG exported successfully', name);
      } else {
        exportScheduleJson(schedule, name);
        toast('success', 'Schedule data exported', name);
      }
    } catch (e) {
      toast('error', 'Export failed', (e as Error).message || 'Something went wrong.');
    } finally {
      setBusy(null);
      if (prevZoom !== 1) setZoom(prevZoom);
    }
  };

  return (
    <motion.div
      className={`fixed inset-0 z-[90] flex flex-col bg-ink-950/55 ${open ? '' : 'pointer-events-none'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      style={{ display: open ? 'flex' : 'none' }}
      aria-hidden={!open}
    >
      <header className="no-print flex flex-wrap items-center justify-between gap-3 overflow-x-auto border-b border-white/10 bg-white/90 dark:bg-[#15161c]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink-900 dark:text-white">
              Preview — {schedule.name}
            </h2>
            <p className="font-mono text-[10px] text-ink-400 dark:text-ink-500">
              {fileName}
            </p>
          </div>
          <Segmented
            value={paperSize}
            onChange={(v) => setPaperSize(v)}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'a5', label: 'A5' },
              { value: 'letter', label: 'Letter' },
            ]}
          />
          <Segmented
            value={orientation}
            onChange={(v) => setOrientation(v)}
            options={[
              { value: 'portrait', label: 'Portrait' },
              { value: 'landscape', label: 'Landscape' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-ink-100 dark:bg-white/10 p-1">
            <button className="btn-ghost h-7 w-7 p-0" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
              <ZoomOut size={14} />
            </button>
            <button className="btn-ghost h-7 w-7 p-0" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}>
              <ZoomIn size={14} />
            </button>
            <button className="btn-ghost h-7 w-7 p-0" aria-label="Fit to screen" onClick={() => setZoom(1)}>
              <Maximize size={14} />
            </button>
            <span className="px-1 text-xs font-semibold text-ink-500">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <Segmented
              value={quality}
              onChange={(v) => setQuality(v)}
              options={[
                { value: 'standard', label: `Std • ${QUALITY_LABEL.standard}` },
                { value: 'high', label: `High • ${QUALITY_LABEL.high}` },
                { value: 'ultra', label: `Ultra • ${QUALITY_LABEL.ultra}` },
              ]}
            />
          </div>

          <div className="h-6 w-px bg-ink-200 dark:bg-white/15 hidden md:block" />

          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Print
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runExport('json')} disabled={busy === 'json'}>
            <FileJson size={13} /> JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runExport('png')} disabled={busy === 'png'}>
            <ImageIcon size={13} /> PNG
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runExport('jpg')} disabled={busy === 'jpg'}>
            <ImageIcon size={13} /> JPG
          </Button>
          <Button size="sm" onClick={() => runExport('pdf')} loading={busy === 'pdf'}>
            <Download size={14} /> PDF
          </Button>
          <button className="btn-ghost h-8 w-8 p-0" aria-label="Close preview" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </header>

      <div
        className="print-root flex-1 overflow-auto p-4 sm:p-8"
        style={{
          backgroundImage:
            'radial-gradient(rgba(120,130,150,0.22) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        {open && (
          <div className="mx-auto" style={{ width: pageWidthPx * zoom, height: (sheetSize.h || pageHeightPx) * zoom }}>
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: pageWidthPx,
              }}
            >
              <div
                ref={sheetRef}
                className="print-sheet mx-auto overflow-hidden bg-white shadow-lift ring-1 ring-ink-900/10"
                style={{
                  width: pageWidthPx,
                  minHeight: pageHeightPx,
                  padding: pagePad,
                  boxSizing: 'border-box',
                  printColorAdjust: 'exact',
                  WebkitPrintColorAdjust: 'exact',
                }}
              >
                <ScheduleGrid schedule={schedule} fitPage />
              </div>
            </div>
          </div>
        )}

        <div className="no-print mx-auto mt-5 flex max-w-2xl flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="chip border-ink-200 bg-white text-ink-600 dark:border-white/15 dark:bg-white/10 dark:text-ink-300">
              {paperSize.toUpperCase()} · {orientation} · {plan.paperWidthMm} × {plan.paperHeightMm} mm
            </span>
            <span className="chip border-ink-200 bg-white text-ink-600 dark:border-white/15 dark:bg-white/10 dark:text-ink-300">
              {plan.pages} {plan.pages === 1 ? 'page' : 'pages'}
            </span>
            <span className="chip border-ink-200 bg-white text-ink-600 dark:border-white/15 dark:bg-white/10 dark:text-ink-300">
              {QUALITY_LABEL[quality]} · {plan.imageWidth} × {plan.imageHeight} px
            </span>
            <span className="chip border-ink-200 bg-white text-ink-600 dark:border-white/15 dark:bg-white/10 dark:text-ink-300">
              {schedule.activities.length} activities · {sheetSize.w || pageWidthPx} ×{' '}
              {sheetSize.h || pageHeightPx} px
            </span>
          </div>
          <p className="text-center text-xs text-ink-500 dark:text-ink-400">
            Crisp print-resolution text at {QUALITY_LABEL[quality]} · PNG and PDF stay lossless ·
            the PDF paginates automatically and every column always fits the page width.
          </p>
        </div>

        {busy && (
          <div className="no-print mt-3 flex items-center justify-center gap-2 text-sm text-ink-600 dark:text-ink-300">
            <CheckCircle2 size={15} className="animate-pulse" /> Exporting…
          </div>
        )}
      </div>
    </motion.div>
  );
}