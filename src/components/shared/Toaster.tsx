import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import * as Toast from '@radix-ui/react-toast';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-green-900 text-white',
  error: 'bg-red-700 text-white',
  info: 'bg-gray-900 text-white',
};

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++_id;
    setToasts((t) => [...t, { id, message, variant }]);
  }, []);

  function dismiss(id: number) {
    setToasts((t) => t.filter((m) => m.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) dismiss(t.id); }}
            duration={4000}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
              text-sm font-medium max-w-sm
              data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2
              data-[state=closed]:animate-out data-[state=closed]:fade-out-80
              ${VARIANT_STYLES[t.variant]}
            `}
          >
            <Toast.Description>{t.message}</Toast.Description>
            <Toast.Close
              className="ml-auto opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </Toast.Close>
          </Toast.Root>
        ))}

        <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
