import "server-only";

import { createHash } from "node:crypto";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ContactTemplate,
  FunnelStage,
  Lead,
  LeadChannel,
} from "@/types/crm";
import { FUNNEL_STAGES } from "@/types/crm";

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

interface ImportedLeadRow {
  Empresa: string;
  ICP: string;
  Nome: string;
  Cargo: string | null;
  "E-mail": string | null;
  Fonte: string | null;
  Funil: string;
  LinkedIn: string | null;
  Local: string;
  Notas: string | null;
  "Pontuação do lead": string | number | null;
  Site: string | null;
  Tags: string | null;
  Telefone: string | null;
  "Último contato": string | null;
  Canal: string | null;
}

const portugueseMonths: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

function parseNotionDate(value: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const match = value.match(/^(\d{1,2}) de ([^\s]+) de (\d{4})$/i);
  if (!match) return null;

  const month = portugueseMonths[match[2].toLocaleLowerCase("pt")];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
}

function parseScore(value: string | number | null) {
  if (typeof value === "number") return value;
  if (!value) return null;

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function mapImportedLead(row: ImportedLeadRow, index: number): Lead {
  const identity = [row.Empresa, row["E-mail"], row.Telefone, row.Nome, index].join("|");
  const funnelStage = FUNNEL_STAGES.includes(row.Funil as FunnelStage)
    ? (row.Funil as FunnelStage)
    : "Lead";
  const preferredChannel =
    row.Canal === "Email" || row.Canal === "Telefone" ? (row.Canal as LeadChannel) : null;

  return {
    // leads_import has no primary key; this stable ID is for rendering only.
    id: createHash("sha256").update(identity).digest("hex").slice(0, 24),
    company_name: row.Empresa,
    contact_name: row.Nome,
    job_title: row.Cargo,
    email: row["E-mail"],
    phone: row.Telefone,
    website: row.Site,
    linkedin_url: row.LinkedIn,
    source: row.Fonte,
    funnel_stage: funnelStage,
    icp: row.ICP,
    location: row.Local,
    notes: row.Notas,
    lead_score: parseScore(row["Pontuação do lead"]),
    tags: row.Tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
    last_contacted_at: parseNotionDate(row["Último contato"]),
    preferred_channel: preferredChannel,
    // The import table does not expose these timestamps.
    created_at: "",
    updated_at: "",
  };
}

export async function getLeads(): Promise<QueryResult<Lead[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("leads_import")
    .select("*")
    .order("Pontuação do lead", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data as ImportedLeadRow[]).map(mapImportedLead), error: null };
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
