export type ToastKind = 'success' | 'error' | 'info';

export type ToastPayload = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastListener = (toast: ToastPayload) => void;

const listeners = new Set<ToastListener>();

const makeId = () => {
  const c: any = globalThis.crypto as any;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emit = (kind: ToastKind, message: string) => {
  const payload: ToastPayload = { id: makeId(), kind, message };
  for (const l of listeners) l(payload);
  return payload.id;
};

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
  subscribe: (listener: ToastListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
