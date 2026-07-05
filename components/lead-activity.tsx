"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getLeadActivitiesAction,
  logActivityAction,
  setNextActionAction,
} from "@/app/pipeline/actions";
import type { ActivityType, Lead, LeadActivity } from "@/types/crm";

const LOGGABLE_TYPES: { value: ActivityType; label: string }[] = [
  { value: "note", label: "Nota" },
  { value: "email", label: "Email" },
  { value: "call", label: "Chamada" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "meeting", label: "Reunião" },
];

const TYPE_LABELS: Record<ActivityType, string> = {
  note: "Nota",
  email: "Email",
  call: "Chamada",
  linkedin: "LinkedIn",
  meeting: "Reunião",
  stage_change: "Mudança de fase",
};

const TYPE_DOTS: Record<ActivityType, string> = {
  note: "bg-neutral-400",
  email: "bg-blue-500",
  call: "bg-amber-500",
  linkedin: "bg-sky-600",
  meeting: "bg-violet-500",
  stage_change: "bg-emerald-600",
};

export function isOverdue(lead: Lead) {
  return Boolean(
    lead.next_action_at &&
      lead.next_action_at < new Date().toISOString().slice(0, 10) &&
      !lead.funnel_stage.startsWith("Closed"),
  );
}

export function NextActionSection({
  lead,
  onLeadUpdated,
}: {
  lead: Lead;
  onLeadUpdated: (lead: Lead) => void;
}) {
  const [date, setDate] = useState(lead.next_action_at ?? "");
  const [note, setNote] = useState(lead.next_action_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = date !== (lead.next_action_at ?? "") || note !== (lead.next_action_note ?? "");
  const overdue = isOverdue(lead);

  return (
    <section aria-labelledby="next-action-title" className="mt-8 border-t border-border pt-6">
      <h3
        id="next-action-title"
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
      >
        Próxima ação
        {overdue && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-amber-800">
            Em atraso
          </span>
        )}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setSaved(false);
          }}
          aria-label="Next action date"
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
        />
        <input
          type="text"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(false);
          }}
          placeholder="What's the next step? e.g. Send proposal"
          aria-label="Next action note"
          className="h-10 min-w-52 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
        />
        <button
          type="button"
          disabled={isPending || !dirty}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setNextActionAction(lead.id, date, note);
              if (!result.data) {
                setError(result.error);
                return;
              }
              onLeadUpdated(result.data);
              setSaved(true);
            });
          }}
          className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !dirty && <span className="text-xs text-emerald-700">Saved ✓</span>}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}

export function ActivitySection({ lead }: { lead: Lead }) {
  const [activities, setActivities] = useState<LeadActivity[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getLeadActivitiesAction(lead.id).then((result) => {
      if (cancelled) return;
      if (result.data) setActivities(result.data);
      else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  return (
    <section aria-labelledby="activity-title" className="mt-8 border-t border-border pt-6">
      <h3
        id="activity-title"
        className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
      >
        Atividade
      </h3>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <div className="relative">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ActivityType)}
            aria-label="Activity type"
            className="h-10 appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-neutral-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
          >
            {LOGGABLE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted">
            ▾
          </span>
        </div>
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.form?.requestSubmit();
          }}
          placeholder="What happened? e.g. Called, asked to follow up in May"
          aria-label="Activity description"
          className="h-10 min-w-52 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
        />
        <button
          type="button"
          disabled={isPending || !body.trim()}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await logActivityAction(lead.id, type, body);
              if (!result.data) {
                setError(result.error);
                return;
              }
              setActivities((current) => [result.data!, ...(current ?? [])]);
              setBody("");
            });
          }}
          className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {isPending ? "Logging…" : "Log"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5">
        {loadError && <p className="text-sm text-red-700">{loadError}</p>}
        {!loadError && activities === null && (
          <p className="text-sm text-muted">Loading activity…</p>
        )}
        {activities !== null && activities.length === 0 && (
          <p className="text-sm text-muted">
            No activity yet. Log a call, email or note to start the timeline.
          </p>
        )}
        {activities !== null && activities.length > 0 && (
          <ol className="space-y-4">
            {activities.map((activity) => (
              <li key={activity.id} className="flex gap-3">
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${TYPE_DOTS[activity.type]}`}
                />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-900">
                    <span className="font-medium">{TYPE_LABELS[activity.type]}</span>
                    {activity.body && (
                      <span className="text-neutral-700"> — {activity.body}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateTime(activity.occurred_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
