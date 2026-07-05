import type { Metadata } from "next";
import { connection } from "next/server";
import { DataError } from "@/components/data-error";
import { PageHeader } from "@/components/page-header";
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
        description="Move leads through the pipeline and keep the next sales action visible."
      />
      {result.data ? (
        <PipelineWorkspace leads={result.data} />
      ) : (
        <DataError title="Could not load the pipeline" message={result.error} />
      )}
    </>
  );
}
