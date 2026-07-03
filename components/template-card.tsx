import type { ContactTemplate } from "@/types/crm";

export function TemplateCard({ template }: { template: ContactTemplate }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-neutral-950">{template.title}</h2>
          <p className="mt-1 text-xs text-muted">{template.category ?? "All categories"}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize text-neutral-600">
            {template.channel}
          </span>
          {template.status && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              {template.status}
            </span>
          )}
        </div>
      </div>
      {template.subject && (
        <p className="mb-3 border-b border-border pb-3 text-sm">
          <span className="text-muted">Subject: </span>
          {template.subject}
        </p>
      )}
      <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-neutral-600">
        {template.body}
      </p>
      <p className="mt-auto pt-5 text-xs text-neutral-400">
        {template.storage_path} · Updated{" "}
        {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(
          new Date(template.updated_at),
        )}
      </p>
    </article>
  );
}
