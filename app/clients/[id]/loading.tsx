export default function ClientDetailsLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-20 rounded-2xl bg-neutral-200" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-96 rounded-2xl bg-neutral-200" />
        <div className="h-64 rounded-2xl bg-neutral-200" />
      </div>
    </div>
  );
}
