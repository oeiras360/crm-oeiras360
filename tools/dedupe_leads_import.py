#!/usr/bin/env python3
"""Transactionally consolidate duplicate leads and add stable database identities."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import psycopg
from psycopg import sql

from sync_notion_csv_to_supabase import EXPECTED_COLUMNS, merge_duplicate_rows


def load_env(path: Path) -> None:
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value.strip().strip("'\""))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    load_env(args.env_file)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Missing DATABASE_URL.")

    columns = sorted(EXPECTED_COLUMNS)
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                sql.SQL("select {} from public.leads_import").format(
                    sql.SQL(", ").join(map(sql.Identifier, columns))
                )
            )
            source = [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]
            merged = merge_duplicate_rows(source)
            print(f"Current rows: {len(source)}")
            print(f"Canonical rows: {len(merged)}")
            print(f"Duplicates removed: {len(source) - len(merged)}")
            if not args.apply:
                print("Dry run only. Pass --apply to update Supabase.")
                connection.rollback()
                return 0

            cursor.execute("create extension if not exists pgcrypto")
            cursor.execute(
                "alter table public.leads_import "
                "add column if not exists identity_key text"
            )
            cursor.execute(
                "alter table public.leads_import "
                "add column if not exists id uuid default gen_random_uuid()"
            )
            cursor.execute("delete from public.leads_import")
            insert_columns = columns + ["identity_key"]
            statement = sql.SQL("insert into public.leads_import ({}) values ({})").format(
                sql.SQL(", ").join(map(sql.Identifier, insert_columns)),
                sql.SQL(", ").join(sql.Placeholder() * len(insert_columns)),
            )
            cursor.executemany(
                statement,
                [[row.get(column) or None for column in insert_columns] for row in merged],
            )
            cursor.execute("update public.leads_import set id = gen_random_uuid() where id is null")
            cursor.execute("alter table public.leads_import alter column id set not null")
            cursor.execute(
                "alter table public.leads_import "
                "add constraint leads_import_pkey primary key (id)"
            )
            cursor.execute("alter table public.leads_import alter column identity_key set not null")
            cursor.execute(
                "alter table public.leads_import "
                "add constraint leads_import_identity_key_key unique (identity_key)"
            )
            cursor.execute("select count(*), count(distinct identity_key) from public.leads_import")
            total, identities = cursor.fetchone()
            if total != len(merged) or identities != total:
                raise RuntimeError("Post-migration uniqueness verification failed.")

        connection.commit()
    print(f"Migration committed: {len(merged)} unique leads.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
