import type { Metadata } from "next";
import { connection } from "next/server";
import { DataError } from "@/components/data-error";
import { PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TemplateCard } from "@/components/template-card";
import { getContactTemplates } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Contact Templates" };

export default async function TemplatesPage() {
  await connection();
  const result = await getContactTemplates();

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Contact Templates"
        description="Reusable messages for consistent email and LinkedIn outreach."
        action={
          <button
            type="button"
            disabled
            title="Template creation will be connected to Supabase next."
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white opacity-60"
          >
            <PlusIcon className="size-4" />
            New template
          </button>
        }
      />
      {!result.data ? (
        <DataError
          title="Contact templates are not available"
          message={result.error}
        />
      ) : result.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-14 text-center shadow-sm">
          <p className="font-medium">No contact templates yet</p>
          <p className="mt-1 text-sm text-muted">
            Add Markdown files to the contact-templates Storage bucket to show them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.data.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </>
  );
}
