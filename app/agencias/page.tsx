import type { Metadata } from "next";
import { connection } from "next/server";
import { AgencyWorkspace } from "@/components/agency-workspace";
import { DataError } from "@/components/data-error";
import { PageHeader } from "@/components/page-header";
import { getAgencies } from "@/lib/agencies";

export const metadata: Metadata = { title: "Agências" };

export default async function AgenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ agency?: string }>;
}) {
  await connection();
  const [result, { agency: initialAgencyId }] = await Promise.all([
    getAgencies(),
    searchParams,
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Agências"
        title="Funil de agências"
        description="Agencies whose clients could sponsor Oeiras360 — move them from first contact to an agreement."
      />
      {result.data ? (
        <AgencyWorkspace agencies={result.data} initialAgencyId={initialAgencyId ?? null} />
      ) : (
        <DataError title="Could not load the agencies" message={result.error} />
      )}
    </>
  );
}
