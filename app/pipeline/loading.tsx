export default function PipelineLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-56 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-neutral-200" />
      <div className="mt-10 h-14 rounded-xl bg-neutral-200" />
      <div className="mt-4 h-96 rounded-xl bg-neutral-200" />
    </div>
  );
}
