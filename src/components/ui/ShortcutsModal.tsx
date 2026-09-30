import { useUIStore } from '../../store/uiStore';
import { Modal } from './Modal';
import { Kbd } from './Misc';

export default function ShortcutsModal() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const close = () => useUIStore.getState().setShortcutsOpen(false);

  const groups: { title: string; rows: [string, string[]][] }[] = [
    {
      title: 'Scheduling',
      rows: [
        ['New activity (Schedule view)', ['N']],
        ['Toggle New Activity / add', ['Shift', 'N']],
        ['Open schedule settings', ['S']],
        ['Open customize panel', ['C']],
      ],
    },
    {
      title: 'Editing',
      rows: [
        ['Delete selected activity', ['Del']],
        ['Undo last action', ['Cmd', 'Z']],
        ['Redo', ['Cmd', 'Shift', 'Z']],
        ['Copy activity', ['Cmd', 'C']],
        ['Paste activity', ['Cmd', 'V']],
      ],
    },
    {
      title: 'Navigation',
      rows: [
        ['Previous day (Daily view)', ['←']],
        ['Next day (Daily view)', ['→']],
        ['Previous week/month', ['Shift', '←']],
        ['Next week/month', ['Shift', '→']],
      ],
    },
    {
      title: 'General',
      rows: [
        ['Create schedule', ['Cmd', 'N']],
        ['Show this panel', ['?']],
        ['Close dialogs / menu', ['Esc']],
      ],
    },
  ];

  return (
    <Modal
      open={open}
      title="Keyboard Shortcuts"
      onClose={close}
      footer={
        <div className="w-full text-center text-xs text-ink-400">
          Press <Kbd>? </Kbd> anywhere to bring this up again
        </div>
      }
    >
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">{g.title}</div>
            <div className="space-y-1.5">
              {g.rows.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-ink-600 dark:text-ink-300">{label}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-ink-400">
          Full scheduling shortcuts work when nothing is being typed (inputs, search).
        </p>
      </div>
    </Modal>
  );
}