export function PageLoadingSkeleton({
  title = true,
  cards = 3,
  table = false
}: {
  title?: boolean;
  cards?: number;
  table?: boolean;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {title ? (
        <div className="mb-6 space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-9 w-64" />
          <SkeletonBlock className="h-4 w-full max-w-xl" />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <SkeletonBlock className="h-5 w-2/3" />
            <SkeletonBlock className="mt-4 h-8 w-1/2" />
            <SkeletonBlock className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>
      {table ? (
        <div className="mt-6 rounded-lg border border-ice-100 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <SkeletonBlock className="h-6 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ice-100 dark:bg-slate-800 ${className}`} />;
}
