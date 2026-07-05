export default function CrmLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-neutral-200" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl bg-neutral-200" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-64 rounded-xl bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
