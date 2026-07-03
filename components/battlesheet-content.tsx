import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BattlesheetContent({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-5 mt-10 text-3xl font-semibold tracking-tight first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-4 mt-10 border-b border-border pb-3 text-2xl font-semibold tracking-tight first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-7 text-lg font-semibold text-neutral-900">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-2 mt-6 font-semibold text-neutral-900">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="my-3 max-w-4xl text-sm leading-7 text-neutral-700">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-4 max-w-4xl list-disc space-y-2 pl-6 text-sm leading-6 text-neutral-700">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 max-w-4xl list-decimal space-y-2 pl-6 text-sm leading-6 text-neutral-700">
            {children}
          </ol>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-5 border-l-4 border-emerald-600 bg-emerald-50/60 px-5 py-2 text-neutral-700">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:decoration-emerald-700"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-neutral-950">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-800">
            {children}
          </code>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-neutral-50">{children}</thead>,
        th: ({ children }) => (
          <th className="border-b border-border px-4 py-3 font-semibold text-neutral-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border px-4 py-3 align-top text-neutral-700">
            {children}
          </td>
        ),
        hr: () => <hr className="my-8 border-border" />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
