export default function ClientsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-56 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-neutral-200" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-48 rounded-2xl bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
