import { create } from 'zustand';
import type { Toast } from '../types';
import { uid } from '../utils/id';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface UIState {
  toasts: Toast[];
  toast: (type: Toast['type'], message: string, sub?: string) => void;
  dismissToast: (id: string) => void;
  confirm: ConfirmRequest | null;
  requestConfirm: (req: Omit<ConfirmRequest, 'onConfirm'>) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
}

let confirmResolver: ((ok: boolean) => void) | null = null;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  toast: (type, message, sub) => {
    const id = uid('toast');
    set({ toasts: [...get().toasts, { id, type, message, sub }] });
    setTimeout(() => get().dismissToast(id), 3800);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  confirm: null,
  requestConfirm: (req) =>
    new Promise<boolean>((resolve) => {
      confirmResolver = resolve;
      set({ confirm: { ...req, onConfirm: () => {} } });
    }),
  resolveConfirm: (ok) => {
    const req = get().confirm;
    set({ confirm: null });
    if (confirmResolver) {
      confirmResolver(ok);
      confirmResolver = null;
    }
    if (ok && req) req.onConfirm();
  },

  shortcutsOpen: false,
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
}));