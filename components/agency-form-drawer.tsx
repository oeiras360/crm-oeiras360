"use client";

import { useActionState, useEffect } from "react";
import { saveAgencyAction, type AgencyFormState } from "@/app/agencias/actions";
import { Drawer } from "@/components/drawer";
import { CloseIcon } from "@/components/icons";
import { TagInput } from "@/components/tag-input";
import { AGENCY_STAGES, AGENCY_STAGE_LABELS, type Agency } from "@/types/crm";

const initialState: AgencyFormState = { error: null, agency: null };

export function AgencyFormDrawer({
  agency,
  onClose,
  onSaved,
}: {
  agency: Agency | null;
  onClose: () => void;
  onSaved: (agency: Agency) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    saveAgencyAction.bind(null, agency?.id ?? null),
    initialState,
  );

  useEffect(() => {
    if (state.agency) onSaved(state.agency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.agency]);

  return (
    <Drawer labelledBy="agency-form-title" onClose={onClose}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-border bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
        <div>
          <h2 id="agency-form-title" className="text-2xl font-semibold tracking-tight">
            {agency ? "Edit agency" : "New agency"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {agency
              ? `Update ${agency.company_name}'s details.`
              : "Add an agency to the agências funnel."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-muted hover:bg-neutral-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          aria-label="Close agency form"
        >
          <CloseIcon />
        </button>
      </header>

      <form action={formAction} className="px-5 py-6 sm:px-7">
        <fieldset disabled={isPending} className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Contacto
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Agência *">
                <TextInput name="company_name" defaultValue={agency?.company_name} required />
              </Field>
              <Field label="Nome *">
                <TextInput name="contact_name" defaultValue={agency?.contact_name} required />
              </Field>
              <Field label="Cargo">
                <TextInput name="job_title" defaultValue={agency?.job_title ?? ""} />
              </Field>
              <Field label="E-mail">
                <TextInput name="email" type="email" defaultValue={agency?.email ?? ""} />
              </Field>
              <Field label="Telefone">
                <TextInput name="phone" type="tel" defaultValue={agency?.phone ?? ""} />
              </Field>
              <Field label="Site">
                <TextInput name="website" defaultValue={agency?.website ?? ""} />
              </Field>
              <Field label="LinkedIn">
                <TextInput name="linkedin_url" defaultValue={agency?.linkedin_url ?? ""} />
              </Field>
              <Field label="Fonte">
                <TextInput name="source" defaultValue={agency?.source ?? ""} />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Funil
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Fase">
                <SelectInput name="funnel_stage" defaultValue={agency?.funnel_stage ?? "lead"}>
                  {AGENCY_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {AGENCY_STAGE_LABELS[stage]}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Último contato">
                <TextInput
                  name="last_contacted_at"
                  type="date"
                  defaultValue={agency?.last_contacted_at ?? ""}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Tags">
                  <TagInput name="tags" initialTags={agency?.tags ?? []} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Notas
            </h3>
            <textarea
              name="notes"
              rows={4}
              defaultValue={agency?.notes ?? ""}
              className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              placeholder="Clients they work with, sponsorship fit, objections…"
            />
          </section>
        </fieldset>

        {state.error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isPending ? "Saving…" : agency ? "Save changes" : "Create agency"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
    />
  );
}

function SelectInput({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-10 w-full appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-neutral-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
      >
        {children}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted">
        ▾
      </span>
    </div>
  );
}
