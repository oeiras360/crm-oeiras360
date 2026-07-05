"use client";

import { useEffect } from "react";

// Shared shell for slide-over dialogs: backdrop, escape-to-close, body scroll
// lock, and the bottom-sheet-on-mobile / centered-card-on-desktop layout.
export function Drawer({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 backdrop-blur-[1px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
      >
        {children}
      </section>
    </div>
  );
}
