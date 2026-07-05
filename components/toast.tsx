"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<{
  showToast: (message: string, tone?: Toast["tone"]) => void;
} | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4"
          >
            {toasts.map((toast) => (
              <p
                key={toast.id}
                role="status"
                className={`pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
                  toast.tone === "success" ? "bg-neutral-900" : "bg-red-600"
                }`}
              >
                {toast.message}
              </p>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
