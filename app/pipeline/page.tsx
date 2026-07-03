import type { Metadata } from "next";
import { connection } from "next/server";
import { DataError } from "@/components/data-error";
import { PageHeader } from "@/components/page-header";
import { PlusIcon } from "@/components/icons";
import { PipelineWorkspace } from "@/components/pipeline-workspace";
import { getLeads } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  await connection();
  const result = await getLeads();

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Funil de vendas"
        description="Move leads through the real Notion pipeline and keep the next sales action visible."
        action={
          <button
            type="button"
            disabled
            title="Lead creation is not part of this read-only connection yet."
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white opacity-60"
          >
            <PlusIcon className="size-4" />
            Add lead
          </button>
        }
      />
      {result.data ? (
        <PipelineWorkspace leads={result.data} />
      ) : (
        <DataError title="Could not load the pipeline" message={result.error} />
      )}
    </>
  );
}
