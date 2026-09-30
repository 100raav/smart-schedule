import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettingsStore } from '../../store/settingsStore';

const INK_PATH =
  'M22,78 C40,60 52,100 66,78 C80,58 94,96 108,76 C122,56 136,88 148,68 L164,58 L186,86 L198,64 L214,90 L230,72 C246,58 262,62 276,76 C292,92 302,88 318,90';

const WORD = 'SmartSchedule';
const DASH = 700;

/** Shown once per browser session; a plain reload should not replay 5s of theatre. */
const SEEN_KEY = 'ss-boot-seen';
const FIRST_VISIT = 5000;
const REVISIT = 500;
/** Hard cap: the overlay must never outlive this, whatever else goes wrong. */
const MAX_DURATION = 6000;

interface Props {
  minDuration?: number;
  children: ReactNode;
}

export function BootLoader({ minDuration, children }: Props) {
  const reduced =
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    useSettingsStore.getState().settings.reducedMotion;

  // Read once, before the first render, so the duration never changes mid-flight.
  const [isFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const seen = window.sessionStorage.getItem(SEEN_KEY) === '1';
      window.sessionStorage.setItem(SEEN_KEY, '1');
      return !seen;
    } catch {
      return true;
    }
  });

  const floor = minDuration ?? (isFirstVisit ? FIRST_VISIT : REVISIT);
  const duration = reduced ? Math.min(floor, 700) : Math.min(floor, MAX_DURATION);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Timers, not requestAnimationFrame: rAF is throttled to a standstill in
  // background tabs, which used to freeze the bar at 0% forever.
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setProgress(Math.round(t * 100));
      if (t < 1) setTimeout(tick, 80);
      else setDone(true);
    };
    tick();
  }, [duration]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), reduced ? 60 : 420);
    return () => clearTimeout(t);
  }, [done, reduced]);

  // Failsafe, independent of the progress loop: if anything above stalls,
  // drop the overlay anyway so the app underneath is never trapped.
  useEffect(() => {
    const t = setTimeout(() => {
      setProgress(100);
      setDone(true);
      setHidden(true);
    }, MAX_DURATION + 1200);
    return () => clearTimeout(t);
  }, []);

  const caption =
    progress < 30
      ? 'Sharpening the pencil…'
      : progress < 85
        ? 'Writing your schedule…'
        : progress < 100
          ? 'Almost there, dotting the i’s…'
          : 'Ready!';

  const penMotion = reduced ? { offsetDistance: '100%' } : undefined;
  const inkMotion = reduced ? { strokeDasharray: '0', strokeDashoffset: 0 } : undefined;

  return (
    <>
      {children}
      <AnimatePresence>
        {!hidden && (
          <motion.div
            className={`fixed inset-0 z-[9999] overflow-y-auto bg-ink-50 transition-opacity dark:bg-[#0e0f15] ${
              done ? 'pointer-events-none' : ''
            }`}
            initial={{ opacity: 1 }}
            animate={{ opacity: done ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.45, ease: 'easeOut' }}
            aria-label="Loading SmartSchedule"
            aria-busy="true"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
              style={{
                background:
                  'radial-gradient(900px 400px at 50% -80px, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)',
              }}
            />

            <div className="relative grid min-h-dvh place-items-center px-4 py-10">
              <div className="w-full max-w-md">
                <motion.div
                  className="relative mx-auto w-[340px] max-w-[88vw] -rotate-1 rounded-2xl bg-[#fdfcf7] shadow-lift ring-1 ring-ink-200/60 paper-texture"
                  initial={{ opacity: 0, y: 16, rotate: -3 }}
                  animate={{ opacity: 1, y: 0, rotate: -1 }}
                  transition={{ duration: reduced ? 0.01 : 0.5, ease: 'easeOut' }}
                >
                  <div className="px-6 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <motion.span
                        className="font-handwritten text-2xl leading-none text-[var(--accent)]"
                        initial="hidden"
                        animate="show"
                        variants={{ show: { transition: { staggerChildren: reduced ? 0 : 0.075 } } }}
                      >
                        {WORD.split('').map((ch, i) => (
                          <motion.span
                            key={i}
                            className="inline-block"
                            variants={{
                              hidden: { opacity: 0, y: 10, rotate: 8 },
                              show: {
                                opacity: 1,
                                y: 0,
                                rotate: 0,
                                transition: { duration: reduced ? 0.01 : 0.22 },
                              },
                            }}
                          >
                            {ch}
                          </motion.span>
                        ))}
                      </motion.span>
                      <span className="shrink-0 text-right text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-300">
                        Create · Organize
                        <br />
                        · Plan
                      </span>
                    </div>
                    <svg className="mt-3 w-full" viewBox="0 0 340 120" role="img" aria-hidden="true">
                      <g stroke="#ddd3b8" strokeWidth="1" opacity="0.5">
                        <line x1="16" y1="30" x2="324" y2="30" />
                        <line x1="16" y1="56" x2="324" y2="56" />
                        <line x1="16" y1="82" x2="324" y2="82" />
                        <line x1="16" y1="108" x2="324" y2="108" />
                      </g>
                      <path
                        d={INK_PATH}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          strokeDasharray: DASH,
                          strokeDashoffset: DASH,
                          animation: reduced
                            ? undefined
                            : `ink-draw ${duration}ms cubic-bezier(0.3, 0.7, 0.2, 1) forwards`,
                          ...inkMotion,
                        }}
                      />
                      <circle
                        cx="180"
                        cy="44"
                        r="3.4"
                        fill="var(--accent)"
                        opacity="0"
                        style={{
                          animation: reduced
                            ? undefined
                            : `loader-dot 0.3s ease ${Math.round(duration * 0.63)}s forwards`,
                        }}
                      />
                      <g
                        className="loader-pen"
                        style={{
                          offsetPath: `path('${INK_PATH}')`,
                          offsetRotate: 'auto',
                          offsetDistance: '0%',
                          animation: reduced
                            ? undefined
                            : `pen-trace ${duration}ms ease-in-out forwards`,
                          ...penMotion,
                        }}
                      >
                        <path d="M0 0 L7 -3 L26 -3 Q30 -3 30 0 L30 4 Q30 6 26 6 L7 6 Z" fill="#2b3350" />
                        <path d="M0 0 L7 -3 L7 6 L0 0 Z" fill="#c9a75a" />
                        <path d="M1 1 L23 -2 L23 5 L3 2 Z" fill="#3f4a6e" opacity="0.6" />
                      </g>
                    </svg>
                    <p className="mt-2 h-4 text-center text-[11px] font-medium tracking-wide text-ink-400">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={caption}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: reduced ? 0.01 : 0.2 }}
                        >
                          {caption}
                        </motion.span>
                      </AnimatePresence>
                    </p>
                  </div>
                  <div className="px-6 pb-6 pt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: 'var(--accent)',
                          transitionDuration: reduced ? '10ms' : '120ms',
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-semibold tracking-[0.14em] text-ink-300">
                      <span>SMARTSCHEDULE</span>
                      <span className="tabular-nums text-ink-500">{progress}%</span>
                    </div>
                  </div>
                </motion.div>

                <motion.p
                  className="mt-6 text-center text-xs font-medium text-ink-400 dark:text-ink-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduced ? 0 : 0.4 }}
                >
                  Plan your time — your way.
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}