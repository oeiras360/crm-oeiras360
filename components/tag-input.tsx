"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/icons";

export function TagInput({
  name,
  initialTags,
}: {
  name: string;
  initialTags: string[];
}) {
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");

  function addDraft() {
    const tag = draft.trim();
    if (tag && !tags.includes(tag)) setTags((current) => [...current, tag]);
    setDraft("");
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/10">
      <input type="hidden" name={name} value={tags.join(", ")} />
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => setTags((current) => current.filter((item) => item !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
          >
            <CloseIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addDraft();
          } else if (event.key === "Backspace" && !draft && tags.length) {
            setTags((current) => current.slice(0, -1));
          }
        }}
        onBlur={addDraft}
        placeholder={tags.length ? "" : "Add tags…"}
        className="min-w-24 flex-1 border-none bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}
