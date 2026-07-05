import "server-only";

import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { ContactTemplate, FunnelStage, Lead } from "@/types/crm";

type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface BattlesheetDocument {
  title: string;
  source: string | null;
  body: string;
  storage_path: string;
  updated_at: string;
}

export async function getLeads(): Promise<QueryResult<Lead[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("leads")
    .select("*")
    .order("lead_score", { ascending: false, nullsFirst: false })
    .order("company_name");

  if (error) return { data: null, error: error.message };
  return { data: data as Lead[], error: null };
}

export async function updateLeadFunnel(
  leadId: string,
  funnelStage: FunnelStage,
): Promise<QueryResult<Lead>> {
  const { data: updated, error } = await getSupabaseAdminClient()
    .from("leads")
    .update({ funnel_stage: funnelStage })
    .eq("id", leadId)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!updated) return { data: null, error: "Lead no longer exists." };

  return { data: updated as Lead, error: null };
}

export async function getContactTemplates(): Promise<QueryResult<ContactTemplate[]>> {
  const storage = getSupabaseAdminClient().storage.from("contact-templates");
  const { data: files, error: listError } = await storage.list("", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (listError) return { data: null, error: listError.message };

  const markdownFiles = files.filter((file) => file.name.endsWith(".md"));
  try {
    const templates = await Promise.all(
      markdownFiles.map(async (file): Promise<ContactTemplate> => {
        const { data, error } = await storage.download(file.name);
        if (error) throw new Error(`Could not read ${file.name}: ${error.message}`);

        const parsed = parseTemplateMarkdown(await data.text());
        return {
          id: file.id ?? file.name,
          title: parsed.metadata.title ?? titleFromFilename(file.name),
          channel: parsed.metadata.channel === "linkedin" ? "linkedin" : "email",
          subject: parsed.metadata.subject ?? null,
          body: parsed.body,
          category: parsed.metadata.category ?? null,
          status: parsed.metadata.status ?? null,
          storage_path: file.name,
          created_at: file.created_at ?? new Date(0).toISOString(),
          updated_at: file.updated_at ?? file.created_at ?? new Date(0).toISOString(),
        };
      }),
    );

    return { data: templates, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Could not load contact templates.",
    };
  }
}

export async function getBattlesheet(): Promise<QueryResult<BattlesheetDocument>> {
  const storage = getSupabaseAdminClient().storage.from("battlesheet");
  const storagePath = "lead-battlesheet-oeiras360.md";
  const [{ data: file, error: downloadError }, { data: files, error: listError }] =
    await Promise.all([
      storage.download(storagePath),
      storage.list("", { limit: 100 }),
    ]);

  if (downloadError) return { data: null, error: downloadError.message };
  if (listError) return { data: null, error: listError.message };

  const parsed = parseTemplateMarkdown(await file.text());
  const metadata = files.find((item) => item.name === storagePath);

  return {
    data: {
      title: parsed.metadata.title ?? "Sales Battlesheet",
      source: parsed.metadata.source ?? null,
      body: parsed.body,
      storage_path: storagePath,
      updated_at:
        metadata?.updated_at ?? metadata?.created_at ?? new Date(0).toISOString(),
    },
    error: null,
  };
}

function parseTemplateMarkdown(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { metadata: {} as Record<string, string>, body: markdown.trim() };

  const metadata = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator === -1) return null;
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );

  return { metadata, body: match[2].trim() };
}

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.md$/i, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
