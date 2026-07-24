"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDealAction } from "@/app/clients/actions";

export function DeleteDealButton({
  dealId,
  onDeleted,
}: {
  dealId: string;
  onDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteDealAction(dealId);
            if (result.error) {
              setError(result.error);
              setConfirming(false);
              return;
            }
            router.refresh();
            onDeleted?.();
          });
        }}
        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:opacity-60 ${
          confirming
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border border-red-200 text-red-700 hover:bg-red-50"
        }`}
      >
        {isPending
          ? "Deleting…"
          : confirming
            ? "Confirm delete (removes payments)"
            : "Delete contract"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
