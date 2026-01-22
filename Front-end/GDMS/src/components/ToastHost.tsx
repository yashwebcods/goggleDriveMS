import { useEffect, useState } from 'react';
import { toast, type ToastPayload } from '../utils/toast';

type ToastItem = ToastPayload & { createdAt: number };

const bgByKind: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
};

const ToastHost = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = toast.subscribe((t) => {
      const createdAt = Date.now();
      const item: ToastItem = { ...t, createdAt };
      setItems((prev) => [item, ...prev].slice(0, 5));

      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, 3000);
    });

    return () => {
      unsub();
    };
  }, []);

  return (
    <div className="fixed right-4 top-4 z-9999 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`${bgByKind[t.kind] || 'bg-slate-800'} text-white rounded-lg px-3 py-2 shadow-lg text-sm`}
          role="status"
          aria-live="polite"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
