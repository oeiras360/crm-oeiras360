#!/usr/bin/env python3
"""Replace Supabase leads_import with a complete Notion CSV export."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


EXPECTED_COLUMNS = {
    "Nome",
    "Canal",
    "Cargo",
    "E-mail",
    "Empresa",
    "Fonte",
    "Funil",
    "ICP",
    "LinkedIn",
    "Local",
    "Notas",
    "Pontuação do lead",
    "Site",
    "Tags",
    "Telefone",
    "Último contato",
}
EXPECTED_STAGES = {
    "Lead",
    "Contacted",
    "Engaged",
    "Negotiation",
    "Closed - Won",
    "Closed - On Hold",
    "Closed - Lost",
}
STAGE_RANK = {
    "Lead": 0,
    "Contacted": 1,
    "Engaged": 2,
    "Negotiation": 3,
    "Closed - On Hold": 4,
    "Closed - Lost": 5,
    "Closed - Won": 6,
}


def load_env(path: Path) -> None:
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value.strip().strip("'\""))


def normalized(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    return re.sub(r"[^a-z0-9]", "", text.encode("ascii", "ignore").decode().lower())


def identity_key(row: dict[str, object]) -> str:
    email = str(row.get("E-mail") or "").strip().lower()
    phone = re.sub(r"\D", "", str(row.get("Telefone") or ""))
    linkedin = str(row.get("LinkedIn") or "").strip().lower().split("?", 1)[0].rstrip("/")
    company_contact = f"{normalized(row.get('Empresa'))}|{normalized(row.get('Nome'))}"
    identity = email or (phone if len(phone) >= 7 else "") or linkedin or company_contact
    return hashlib.sha256(identity.encode()).hexdigest()


def identity_signals(row: dict[str, object]) -> list[str]:
    email = str(row.get("E-mail") or "").strip().lower()
    phone = re.sub(r"\D", "", str(row.get("Telefone") or ""))
    linkedin = str(row.get("LinkedIn") or "").strip().lower().split("?", 1)[0].rstrip("/")
    company_contact = f"{normalized(row.get('Empresa'))}|{normalized(row.get('Nome'))}"
    return [
        signal
        for signal in (
            f"email:{email}" if email else "",
            f"phone:{phone}" if len(phone) >= 7 else "",
            f"linkedin:{linkedin}" if linkedin else "",
            f"company-contact:{company_contact}" if "|" != company_contact else "",
        )
        if signal
    ]


def merge_duplicate_rows(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    parents = list(range(len(rows)))

    def find(index: int) -> int:
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    def union(left: int, right: int) -> None:
        left_root, right_root = find(left), find(right)
        if left_root != right_root:
            parents[right_root] = left_root

    signal_owner: dict[str, int] = {}
    for index, row in enumerate(rows):
        for signal in identity_signals(row):
            if signal in signal_owner:
                union(index, signal_owner[signal])
            else:
                signal_owner[signal] = index

    grouped: dict[int, list[dict[str, str]]] = {}
    for index, row in enumerate(rows):
        grouped.setdefault(find(index), []).append(row)

    merged: list[dict[str, object]] = []
    for duplicates in grouped.values():
        duplicates.sort(key=lambda row: STAGE_RANK[row["Funil"]], reverse=True)
        canonical = dict(duplicates[0])
        canonical["Funil"] = max(
            (row["Funil"] for row in duplicates),
            key=STAGE_RANK.__getitem__,
        )
        for column in EXPECTED_COLUMNS - {"Funil", "Notas", "Tags", "Último contato"}:
            if not canonical[column].strip():
                canonical[column] = next(
                    (row[column] for row in duplicates if row[column].strip()),
                    "",
                )

        notes = list(dict.fromkeys(row["Notas"].strip() for row in duplicates if row["Notas"].strip()))
        canonical["Notas"] = "\n\n".join(notes)
        tags = list(
            dict.fromkeys(
                tag.strip()
                for row in duplicates
                for tag in row["Tags"].split(",")
                if tag.strip()
            )
        )
        canonical["Tags"] = ", ".join(tags)
        dates = [row["Último contato"].strip() for row in duplicates if row["Último contato"].strip()]
        canonical["Último contato"] = max(dates, default="")
        canonical["identity_key"] = identity_key(canonical)
        merged.append(canonical)
    return merged


def read_csv(path: Path) -> list[dict[str, object]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        columns = set(reader.fieldnames or [])
        if columns != EXPECTED_COLUMNS:
            missing = sorted(EXPECTED_COLUMNS - columns)
            extra = sorted(columns - EXPECTED_COLUMNS)
            raise ValueError(f"Unexpected CSV schema. Missing={missing}; extra={extra}")
        rows = list(reader)

    if not rows:
        raise ValueError("CSV contains no leads.")
    if any(not row["Empresa"].strip() or not row["Nome"].strip() for row in rows):
        raise ValueError("Every lead must have Empresa and Nome.")

    stages = {row["Funil"] for row in rows}
    unknown_stages = stages - EXPECTED_STAGES
    if unknown_stages:
        raise ValueError(f"Unknown Funil values: {sorted(unknown_stages)}")
    return merge_duplicate_rows(rows)


class SupabaseRest:
    def __init__(self, url: str, service_key: str) -> None:
        self.endpoint = f"{url.rstrip('/')}/rest/v1/leads_import"
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        }

    def request(
        self,
        method: str,
        *,
        query: dict[str, str] | None = None,
        body: object | None = None,
        prefer: str | None = None,
    ) -> tuple[bytes, dict[str, str]]:
        url = self.endpoint
        if query:
            url = f"{url}?{urlencode(query)}"
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        payload = None if body is None else json.dumps(body, ensure_ascii=False).encode()
        request = Request(url, data=payload, headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as response:
                return response.read(), dict(response.headers)
        except HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"Supabase {method} failed ({error.code}): {detail}") from error

    def fetch_all(self) -> list[dict[str, object]]:
        body, _ = self.request("GET", query={"select": "*"})
        return json.loads(body)

    def delete_all(self) -> None:
        self.request("DELETE", query={"Empresa": "not.is.null"})

    def insert(self, rows: list[dict[str, object]], batch_size: int = 100) -> None:
        for start in range(0, len(rows), batch_size):
            self.request(
                "POST",
                body=rows[start : start + batch_size],
                prefer="return=minimal",
            )


def stage_counts(rows: list[dict[str, object]]) -> dict[str, int]:
    return dict(sorted(Counter(str(row["Funil"]) for row in rows).items()))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    rows = read_csv(args.csv_path)
    print(json.dumps({"rows": len(rows), "stages": stage_counts(rows)}, ensure_ascii=False))
    if not args.apply:
        print("Dry run only. Pass --apply to replace Supabase leads_import.")
        return 0

    load_env(args.env_file)
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise RuntimeError("Missing Supabase URL or service-role key.")

    client = SupabaseRest(url, service_key)
    backup = client.fetch_all()
    print(f"Backed up {len(backup)} existing rows in memory.")

    try:
        client.delete_all()
        client.insert(rows)
        actual = client.fetch_all()
        if len(actual) != len(rows) or stage_counts(actual) != stage_counts(rows):
            raise RuntimeError(
                "Post-import verification mismatch: "
                f"expected={len(rows)} {stage_counts(rows)}; "
                f"actual={len(actual)} {stage_counts(actual)}"
            )
    except Exception:
        print("Import failed; restoring the previous table contents.", file=sys.stderr)
        client.delete_all()
        client.insert(backup)
        raise

    print(
        json.dumps(
            {"imported": len(actual), "stages": stage_counts(actual)},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
