import type { Metadata } from "next";
import { connection } from "next/server";
import { BattlesheetContent } from "@/components/battlesheet-content";
import { DataError } from "@/components/data-error";
import { PageHeader } from "@/components/page-header";
import { getBattlesheet } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Sales Battlesheet" };

export default async function BattlesheetPage() {
  await connection();
  const result = await getBattlesheet();

  return (
    <>
      <PageHeader
        eyebrow="Internal playbook"
        title={result.data?.title ?? "Sales Battlesheet"}
        description="Live strategic sales context loaded from the private Supabase Storage battlesheet."
      />

      {result.data ? (
        <>
          <article className="rounded-xl border border-border bg-surface px-5 py-7 shadow-sm sm:px-8 sm:py-9">
            <BattlesheetContent markdown={result.data.body} />
          </article>
          <p className="mt-3 text-xs text-muted">
            {result.data.storage_path} · Updated{" "}
            {new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(result.data.updated_at))}
          </p>
        </>
      ) : (
        <DataError title="Could not load the battlesheet" message={result.error} />
      )}
    </>
  );
}
