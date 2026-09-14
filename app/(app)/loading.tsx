export default function AppLoading() {
  return (
    <div className="page-shell space-y-6">
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200" />
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="surface h-40 animate-pulse bg-white" />
        ))}
      </div>
    </div>
  );
}
