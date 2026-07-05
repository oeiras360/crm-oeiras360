import "server-only";

import { createHash } from "node:crypto";

// Mirrors public.compute_identity_key in the database (and the retired
// tools/sync_notion_csv_to_supabase.py recipe) so leads created in the app
// stay dedup-visible to the n8n workflows writing through the
// leads_import view.
function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function computeIdentityKey(input: {
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  company_name: string;
  contact_name: string;
}) {
  const email = (input.email ?? "").trim().toLowerCase();
  const phone = (input.phone ?? "").replace(/\D/g, "");
  const linkedin = (input.linkedin_url ?? "")
    .trim()
    .toLowerCase()
    .split("?")[0]
    .replace(/\/+$/, "");
  const companyContact = `${normalized(input.company_name)}|${normalized(input.contact_name)}`;

  const identity =
    email || (phone.length >= 7 ? phone : "") || linkedin || companyContact;
  return createHash("sha256").update(identity).digest("hex");
}
