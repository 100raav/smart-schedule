import { useMemo, useRef, useState, useCallback } from 'react';
import type { Activity, Schedule, ScheduleSettings } from '../../types';
import {
  scheduleDaySpan,
  allCategories,
  categoryName,
  isActivityOnDate,
} from '../../utils/schedule';
import { formatMinutes, monthDay, weekdayShort, shortDate, parseDateKey } from '../../utils/time';
import { withAlpha, textOn } from '../../utils/color';
import {
  Copy,
  Pencil,
  Trash2,
  GripVertical,
  CalendarDays,
  MapPin,
  Clock,
} from 'lucide-react';
import { ACTIVITY_ICONS } from '../../types';

export interface GridMetrics {
  slotHeight: number;
  slots: number[];
  slotMinutes: number;
  totalHeight: number;
  horizontalCellWidth: number | null;
}

export function useGridMetrics(settings: ScheduleSettings, dayCount: number): GridMetrics {
  return useMemo(() => {
    const slotMinutes = settings.interval || 60;
    const start = settings.startTime;
    const end = Math.max(start + slotMinutes, settings.endTime);
    const slots: number[] = [];
    for (let t = start; t < end; t += slotMinutes) slots.push(t);

    const base = settings.density === 'compact' ? 30 : settings.density === 'spacious' ? 56 : 42;
    const slotHeight = dayCount === 1 ? base * 1.5 : base;
    const totalHeight = slots.length * slotHeight;
    const horizontalCellWidth = dayCount > 14 && dayCount <= 31 ? 90 : null;
    return { slotHeight, slots, slotMinutes, totalHeight, horizontalCellWidth };
  }, [settings.startTime, settings.endTime, settings.interval, settings.density, dayCount]);
}

function minuteToTop(minute: number, start: number, slotMinutes: number, slotHeight: number): number {
  return ((minute - start) / slotMinutes) * slotHeight;
}

function computeTracks(acts: Activity[]): Map<string, number> {
  const map = new Map<string, number>();
  const sorted = [...acts].sort((a, b) => a.start - b.start || a.end - b.end);
  const trackEnds: number[] = [];
  for (const act of sorted) {
    let placed = -1;
    for (let i = 0; i < trackEnds.length; i++) {
      if (trackEnds[i] <= act.start) {
        placed = i;
        break;
      }
    }
    if (placed === -1) {
      placed = trackEnds.length;
      trackEnds.push(act.end);
    } else {
      trackEnds[placed] = act.end;
    }
    map.set(act.id, placed);
  }
  return map;
}

function iconEmoji(name: string): string {
  return ACTIVITY_ICONS.find((i) => i.name === name)?.emoji || '📌';
}

interface DragState {
  id: string;
  mode: 'move' | 'resize';
  pointerId: number;
  startX: number;
  startY: number;
  offsetY: number;
  ghostDay: string | null;
  ghostTop: number;
  ghostHeight: number;
  moved: boolean;
}

export interface ScheduleGridProps {
  schedule: Schedule;
  interactive?: boolean;
  selectedId?: string | null;
  onSelectActivity?: (id: string | null) => void;
  onMoveActivity?: (id: string, day: string, start: number, end: number) => void;
  onDuplicateActivity?: (id: string) => void;
  onDeleteActivity?: (id: string) => void;
  onEditActivity?: (id: string) => void;
  onAddActivity?: (day: string, start: number) => void;
  compact?: boolean;
}

export function ScheduleGrid({
  schedule,
  interactive = false,
  selectedId,
  onSelectActivity,
  onMoveActivity,
  onDuplicateActivity,
  onDeleteActivity,
  onEditActivity,
  onAddActivity,
  compact = false,
}: ScheduleGridProps) {
  const days = useMemo(() => scheduleDaySpan(schedule), [schedule]);
  const settings = schedule.settings;
  const monoDay = days.length === 1;
  const metrics = useGridMetrics(settings, days.length);
  const { slotHeight, slots, slotMinutes, totalHeight } = metrics;

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ day: string; minute: number } | null>(null);

  const expanded = useMemo(
    () =>
      days.reduce((acc, day) => {
        acc.set(
          day,
          schedule.activities
            .filter((a) => isActivityOnDate(a, day, a.repeat !== 'none'))
            .map((a) => ({ activity: a, date: day, repeated: a.repeat !== 'none' })),
        );
        return acc;
      }, new Map<string, { activity: Activity; date: string; repeated: boolean }[]>()),
    [days, schedule],
  );

  const verticalStyle: React.CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  const sheetStyle = useSheetStyle(settings);
  const useGridLines = settings.showGrid !== false;
  const isPaper = settings.paperMode || settings.style === 'paper' || settings.style === 'notebook';

  const trackFor = (dayActs: { activity: Activity; date: string; repeated: boolean }[]) =>
    computeTracks(dayActs.map((d) => d.activity));

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, act: Activity, mode: 'move' | 'resize') => {
      if (!interactive || !onMoveActivity) return;
      const dayEl = (e.currentTarget as HTMLElement).closest('[data-day]') as HTMLElement | null;
      if (!dayEl) return;
      const rect = dayEl.getBoundingClientRect();
      const target = e.currentTarget as HTMLElement;
      const cardRect = target.getBoundingClientRect();
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (!gridRect) return;
      const dayKey = dayEl.dataset.day as string;
      activeIdRef.current = act.id;
      const offsetY = e.clientY - cardRect.top;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDrag({
        id: act.id,
        mode,
        pointerId: e.pointerId,
        startX: e.clientX - rect.left,
        startY: e.clientY - gridRect.top,
        offsetY,
        ghostDay: dayKey,
        ghostTop: cardRect.top - gridRect.top,
        ghostHeight: cardRect.height,
        moved: false,
      });
    },
    [interactive, onMoveActivity],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (!gridRect) return;
      const relY = e.clientY - gridRect.top - drag.offsetY;
      const t = Math.min(totalHeight, Math.max(0, relY));
      let newMinute = settings.startTime + Math.round(t / slotHeight) * slotMinutes;
      newMinute = Math.round(newMinute / slotMinutes) * slotMinutes;

      let newDay: string | null = drag.ghostDay;
      const dayEls = Array.from(containerRef.current?.querySelectorAll('[data-day]') || []);
      for (const el of dayEls) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right) {
          newDay = (el as HTMLElement).dataset.day || null;
          break;
        }
      }

      setDrag({
        ...drag,
        moved: true,
        ghostTop: t,
        ghostDay: newDay ?? drag.ghostDay,
        startY: e.clientY - gridRect.top,
      });
      setHoverPos({ day: (newDay ?? drag.ghostDay) ?? days[0], minute: newMinute });
    },
    [drag, settings.startTime, slotHeight, slotMinutes, totalHeight, days],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      activeIdRef.current = null;
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (gridRect && onMoveActivity) {
        const target = e.currentTarget as HTMLElement;
        const el = target.setPointerCapture;
        void el;
        if (target.hasPointerCapture?.(e.pointerId)) {
          (target as HTMLElement).releasePointerCapture?.(e.pointerId);
        }
        const act = schedule.activities.find((a) => a.id === drag.id);
        if (act && drag.moved && drag.ghostDay) {
          const relY = e.clientY - gridRect.top - drag.offsetY;
          let newMinute =
            settings.startTime + Math.round(relY / slotHeight) * slotMinutes;
          newMinute = Math.round(newMinute / slotMinutes) * slotMinutes;
          const duration = act.end - act.start;
          const maxStart = settings.endTime - slotMinutes;
          newMinute = Math.max(settings.startTime, Math.min(maxStart, newMinute));
          if (drag.ghostDay && drag.ghostDay !== act.date) {
            onMoveActivity(drag.id, drag.ghostDay, newMinute, newMinute + duration);
          } else if (newMinute !== act.start) {
            onMoveActivity(drag.id, act.date, newMinute, newMinute + duration);
          }
        } else if (act && drag.mode === 'resize') {
          const relY = e.clientY - gridRect.top;
          const rawMin = settings.startTime + Math.round(relY / slotHeight) * slotMinutes;
          let newEnd = Math.round(rawMin / slotMinutes) * slotMinutes;
          newEnd = Math.min(settings.endTime, Math.max(act.start + slotMinutes, newEnd));
          if (newEnd !== act.end) {
            onMoveActivity(drag.id, act.date, act.start, newEnd);
          }
        }
      }
      setDrag(null);
      setHoverPos(null);
    },
    [drag, onMoveActivity, schedule.activities, settings.startTime, settings.endTime, slotHeight, slotMinutes],
  );

  const handleGridDoubleClick = (e: React.MouseEvent) => {
    if (!interactive || !onAddActivity) return;
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    const relY = e.clientY - gridRect.top;
    let minute = settings.startTime + Math.round(relY / slotHeight) * slotMinutes;
    minute = Math.round(minute / slotMinutes) * slotMinutes;
    minute = Math.max(settings.startTime, Math.min(settings.endTime - slotMinutes, minute));
    const target = (e.target as HTMLElement).closest('[data-day]') as HTMLElement | null;
    const day = target?.dataset.day || days[0];
    if (day) onAddActivity(day, minute);
  };

  const fontSizeCls =
    settings.fontSize === 'small' ? 'text-[11px]' : settings.fontSize === 'large' ? 'text-sm' : 'text-xs';
  const densityPad =
    settings.density === 'compact' ? 'p-1' : settings.density === 'spacious' ? 'p-2.5' : 'p-1.5';

  return (
    <div
      ref={containerRef}
      className={`schedule-sheet select-none ${isPaper ? 'paper-texture' : ''} ${settings.paperMode ? 'pen-cursor' : ''}`}
      style={sheetStyle.sheet}
    >
      <SheetHeader schedule={schedule} days={days} settings={settings} compact={compact} />
      {settings.showLegend && !compact && <SheetLegend schedule={schedule} />}
      <div
        ref={gridRef}
        className={`schedule-grid-body`}
        style={{ display: 'grid', position: 'relative', zIndex: 0 }}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerUp={interactive ? handlePointerUp : undefined}
        onDoubleClick={interactive ? handleGridDoubleClick : undefined}
      >
        {renderGrid()}
      </div>
      {!compact && settings.style === 'professional' && <SheetFooter schedule={schedule} />}
    </div>
  );

  function renderGrid() {
    const timeColW = compact ? 42 : 58;
    const dayCol = monoDay
      ? '1fr'
      : days.length > 14
        ? 'minmax(52px,1fr)'
        : days.length > 7
          ? 'minmax(88px,1fr)'
          : 'minmax(120px,1fr)';
    const cols = `repeat(${days.length}, ${dayCol})`;
    const rows = `auto repeat(${slots.length}, ${slotHeight}px)`;
    const gridStyle: React.CSSProperties = {
      gridTemplateColumns: `${timeColW}px ${cols}`,
      gridTemplateRows: rows,
      minWidth: days.length > 14 ? undefined : `${days.length * (days.length > 7 ? 100 : 140) + timeColW}px`,
    };

    const headerCells: React.ReactNode[] = [
      <div
        key="corner"
        className="sticky left-0 z-20 flex items-end justify-start pb-2 pr-2"
        style={{ gridColumn: 1, gridRow: 1, background: sheetStyle.headerBg, color: sheetStyle.muted, borderBottom: `1px solid ${sheetStyle.borderColor}`, zIndex: 710 }}
      >
        <span className={`${fontSizeCls} font-medium`}>Time</span>
      </div>,
    ];

    days.forEach((day, di) => {
      const d = parseDateKey(day);
      const isToday =
        new Date().toDateString() === d.toDateString();
      headerCells.push(
        <div
          key={day}
          className="relative flex flex-col justify-center px-2 py-2 text-center"
          style={{
            borderBottom: `1px solid ${sheetStyle.borderColor}`,
            borderLeft: di === 0 ? undefined : `1px solid ${sheetStyle.borderColor}`,
            background: isToday ? withAlpha(settings.primaryColor, 0.08) : sheetStyle.headerBg,
          }}
        >
          <span className={`${fontSizeCls} font-bold ${isToday ? 'text-[var(--accent)]' : ''}`} style={{ color: isToday ? settings.primaryColor : undefined }}>
            {weekdayShort(day)}
          </span>
          {!monoDay && (
            <span className={`${fontSizeCls} opacity-70`} style={{ color: sheetStyle.muted }}>
              {monthDay(day)}
            </span>
          )}
        </div>,
      );
    });

    const body: React.ReactNode[] = [];
    slots.forEach((slot, si) => {
      const odd = si % 2 === 1;
      body.push(
        <div
          key={`label-${slot}`}
          className="sticky left-0 z-10 flex items-start justify-end pr-2 pt-0.5"
          style={{
            gridColumn: 1,
            gridRow: si + 2,
            background: sheetStyle.headerBg,
            borderTop: `1px solid ${sheetStyle.borderColor}`,
            color: sheetStyle.muted,
            zIndex: 700,
          }}
        >
          <span className="whitespace-nowrap">{formatMinutes(slot, settings.use24Hour)}</span>
        </div>,
      );
      days.forEach((day, di) => {
        body.push(
          <div
            key={`slot-${day}-${slot}`}
            data-day={day}
            style={{
              gridColumn: di + 2,
              gridRow: si + 2,
              borderTop: useGridLines ? (si > 0 ? `1px solid ${odd ? sheetStyle.lineColor : sheetStyle.borderColor}` : `1px solid ${sheetStyle.borderColor}`) : undefined,
              borderLeft: di === 0 ? undefined : `1px solid ${sheetStyle.borderColor}`,
              background: odd && useGridLines ? sheetStyle.stripeColor : 'transparent',
              position: 'relative',
            }}
          >
            {si === 0 && (
              <div style={{ ...verticalStyle, position: 'absolute', inset: 0, overflow: 'visible', zIndex: 5 }}>
                {renderDayActivities(day)}
              </div>
            )}
          </div>,
        );
      });
    });

    return (
      <div
        style={gridStyle}
        className={monoDay ? '' : 'overflow-visible'}
      >
        {headerCells}
        {body}
      </div>
    );
  }

  function renderDayActivities(day: string) {
    const dayActs = (expanded.get(day) || []).filter((d) => d);
    if (dayActs.length === 0) return null;
    const tracks = trackFor(dayActs);
    const maxTrack = Math.max(...dayActs.map((d) => tracks.get(d.activity.id) || 0));
    const trackCount = maxTrack + 1;
    return dayActs.map(({ activity, repeated }) => {
      const top = minuteToTop(activity.start, settings.startTime, slotMinutes, slotHeight);
      const height = Math.max(slotMinutes * 0.9, activity.end - activity.start) / slotMinutes * slotHeight;
      const trackIdx = tracks.get(activity.id) || 0;
      const isSelected = selectedId === activity.id;
      const isActive = drag?.id === activity.id;
      return (
        <ActivityCard
          key={`${day}-${activity.id}`}
          activity={{ ...activity, date: day }}
          repeated={repeated}
          top={top}
          height={height}
          width={trackCount > 1 ? `${100 / trackCount}%` : '100%'}
          left={trackCount > 1 ? `${(trackIdx * 100) / trackCount}%` : undefined}
          interactive={interactive}
          selected={isSelected}
          dragging={isActive}
          fontSizeCls={fontSizeCls}
          densityPad={densityPad}
          onPointerDown={(e, mode) => handlePointerDown(e, activity, mode)}
          onSelect={() => onSelectActivity?.(isSelected ? null : activity.id)}
          onDuplicate={() => onDuplicateActivity?.(activity.id)}
          onDelete={() => onDeleteActivity?.(activity.id)}
          onEdit={() => onEditActivity?.(activity.id)}
          hoverPos={hoverPos}
        />
      );
    });
  }
}

interface SheetStyle {
  sheet: React.CSSProperties;
  headerBg: string;
  borderColor: string;
  lineColor: string;
  stripeColor: string;
  muted: string;
}

export function useSheetStyle(settings: ScheduleSettings): SheetStyle {
  return useMemo(() => {
    const isPaper = settings.paperMode || settings.style === 'paper' || settings.style === 'notebook';
    const modern = settings.style === 'modern';
    const minimal = settings.style === 'minimal';
    const professional = settings.style === 'professional';
    const darkBg = false;
    void darkBg;
    const bg =
      settings.backgroundColor ||
      (isPaper ? '#fdfaf3' : minimal ? '#ffffff' : modern ? '#ffffff' : '#ffffff');

    const fontFamily =
      settings.font === 'serif'
        ? 'Georgia, ui-serif, serif'
        : settings.font === 'mono'
          ? 'ui-monospace, monospace'
          : settings.font === 'handwritten'
            ? '"Segoe Print", "Bradley Hand", cursive'
            : 'Inter, ui-sans-serif, system-ui, sans-serif';

    const headerBg = isPaper ? 'transparent' : modern || professional ? withAlpha(settings.primaryColor, 0.04) : 'transparent';
    const borderColor = isPaper ? withAlpha(settings.primaryColor, 0.16) : professional ? withAlpha(settings.primaryColor, 0.3) : 'rgba(124,130,150,0.28)';
    const lineColor = isPaper ? withAlpha(settings.primaryColor, 0.12) : 'rgba(124,130,150,0.14)';
    const stripeColor = modern ? withAlpha(settings.primaryColor, 0.025) : 'rgba(124,130,150,0.03)';

    return {
      sheet: {
        backgroundColor: bg,
        color: settings.style === 'notebook' || isPaper ? '#3d3a33' : '#2a2d36',
        fontFamily,
        fontWeight:
          settings.fontWeight === 'bold' ? 700 : settings.fontWeight === 'medium' ? 500 : 400,
        // '--sheet-bg': bg as string,
      },
      headerBg,
      borderColor,
      lineColor,
      stripeColor,
      muted: isPaper ? 'rgba(61,58,51,0.62)' : 'rgba(90,96,115,0.72)',
    };
  }, [settings]);
}

function SheetHeader({
  schedule,
  days,
  settings,
  compact,
}: {
  schedule: Schedule;
  days: string[];
  settings: ScheduleSettings;
  compact?: boolean;
}) {
  const primary = settings.primaryColor;
  const isPaper = settings.paperMode || settings.style === 'paper' || settings.style === 'notebook';
  const dateStr = days.length === 1 ? shortDate(days[0]) : `${shortDate(days[0])} — ${shortDate(days[days.length - 1])}`;
  if (compact) {
    return (
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <div className="min-w-0">
          <span className={`truncate font-bold ${settings.style === 'notebook' ? 'font-handwritten' : ''}`} style={{ color: isPaper ? '#3d3a33' : undefined }}>
            {schedule.name}
          </span>
          <span className="opacity-70" style={{ color: sheetMuted }}>
            {' '}· {dateStr}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="px-1 pb-3 pt-1">
      {settings.style === 'professional' && (
        <div className="mb-3 flex items-center gap-2">
          <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: primary }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#8b93a3' }}>
            {schedule.type} schedule
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className={`text-lg font-bold tracking-tight leading-tight ${settings.style === 'notebook' ? 'font-handwritten text-xl' : ''}`}
            style={{ color: settings.style === 'notebook' || isPaper ? '#3d3a33' : '#20232d' }}
          >
            {schedule.name}
          </h2>
          {schedule.description && (
            <p className="mt-0.5 text-xs opacity-70" style={{ color: '#5a6073' }}>
              {schedule.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: '#5a6073' }}>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {dateStr}
            </span>
            {schedule.author && <span>· {schedule.author}</span>}
          </div>
        </div>
      </div>
      <hr style={{ borderColor: sheetBorder }} className="mt-3" />
    </div>
  );
}

function SheetFooter({ schedule }: { schedule: Schedule }) {
  const primary = schedule.settings.primaryColor;
  const date = new Date(schedule.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t px-1 pt-2 text-[10px] tracking-wide"
      style={{ borderColor: withAlpha(primary, 0.18), color: 'rgba(90,96,115,0.78)' }}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primary }} />
        Prepared with <strong className="font-semibold">SmartSchedule</strong>
      </span>
      <span className="uppercase tracking-[0.18em]">
        {schedule.type} · {date}
      </span>
    </div>
  );
}

function SheetLegend({ schedule }: { schedule: Schedule }) {
  const cats = allCategories(schedule);
  const used = new Set(schedule.activities.map((a) => a.category));
  const shown = cats.filter((c) => used.has(c.id));
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-3">
      {shown.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#5a6073' }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
          {categoryName(c.id, schedule.customCategories)}
        </span>
      ))}
    </div>
  );
}

const sheetMuted = 'rgba(90,96,115,0.72)';
const sheetBorder = 'rgba(124,130,150,0.28)';

function ActivityCard({
  activity,
  repeated,
  top,
  height,
  width,
  left,
  interactive,
  selected,
  dragging,
  fontSizeCls,
  densityPad,
  onPointerDown,
  onSelect,
  onDuplicate,
  onDelete,
  onEdit,
  hoverPos,
}: {
  activity: Activity;
  repeated: boolean;
  top: number;
  height: number;
  width: string;
  left?: string;
  interactive: boolean;
  selected: boolean;
  dragging: boolean;
  fontSizeCls: string;
  densityPad: string;
  onPointerDown: (e: React.PointerEvent, mode: 'move' | 'resize') => void;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  hoverPos?: { day: string; minute: number } | null;
}) {
  const bg = withAlpha(activity.color, 0.16);
  const textColor = textOn('#ffffff');
  const borderColor = withAlpha(activity.color, 0.55);
  const emoji = iconEmoji(activity.icon);
  void hoverPos;

  return (
    <div
      className={`absolute overflow-hidden rounded-lg group ${interactive ? 'cursor-grab active:cursor-grabbing' : ''} transition-shadow ${
        selected ? 'ring-2 ring-[var(--accent)] z-10' : dragging ? 'z-20 opacity-95 shadow-lift' : 'hover:shadow-md'
      } ${densityPad}`}
      style={{
        top,
        height: Math.max(20, height),
        width,
        left,
        background: bg,
        borderLeft: `4px solid ${activity.color}`,
        border: `1px solid ${borderColor}`,
        borderLeftWidth: 4,
        zIndex: dragging ? 30 : selected ? 20 : 1,
        touchAction: 'none',
      }}
      data-activity-id={activity.id}
      onPointerDown={interactive ? (e) => onPointerDown(e, 'move') : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (interactive) onEdit();
      }}
      role={interactive ? 'button' : undefined}
      aria-label={activity.title}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter') onEdit();
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDelete();
        }
      }}
    >
      <div className={`flex h-full min-h-0 flex-col ${interactive ? 'pointer-events-none' : ''}`}>
        <div className={`flex items-start gap-1 font-semibold leading-tight ${fontSizeCls} pointer-events-none`} style={{ color: textColor }}>
          <span className="shrink-0">{emoji}</span>
          <span className="flex-1 truncate">{activity.title}</span>
          {repeated && (
            <span className="shrink-0 opacity-70" aria-label="Repeating">
              ∞
            </span>
          )}
        </div>
        {height > 34 && (
          <div className={`mt-0.5 flex flex-wrap items-center gap-1 opacity-80 pointer-events-none ${fontSizeCls}`}>
            <Clock size={10} className="inline" />
            <span>
              {formatMinutes(activity.start, true)} – {formatMinutes(activity.end, true)}
            </span>
          </div>
        )}
        {activity.location && height > 52 && (
          <div className={`mt-0.5 flex items-center gap-1 opacity-70 pointer-events-none ${fontSizeCls}`}>
            <MapPin size={10} className="inline" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
      </div>

      {interactive && (
        <div className="absolute inset-y-0 right-0 hidden w-16 flex-col items-end justify-center gap-1 bg-gradient-to-l from-black/20 to-transparent py-1 pr-1 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="pointer-events-auto mt-6 rounded-md p-1 text-white hover:bg-white/20"
            aria-label="Edit activity"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="pointer-events-auto rounded-md p-1 text-white hover:bg-white/20"
            aria-label="Duplicate activity"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="pointer-events-auto rounded-md p-1 text-white hover:bg-red-400/80"
            aria-label="Delete activity"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {interactive && height > 44 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center cursor-ns-resize opacity-0 group-hover:opacity-100 text-white"
          style={{ height: 14, touchAction: 'none' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown(e, 'resize');
          }}
        >
          <GripVertical size={12} />
        </div>
      )}
    </div>
  );
}