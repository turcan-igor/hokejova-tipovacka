import Link from "next/link";

export function TipperStatCard({
  title,
  value,
  description,
  href
}: {
  title: string;
  value: string | number;
  description?: string;
  href?: string;
}) {
  const content = (
    <div className="h-full rounded-lg border border-ice-100 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-ice-900 dark:text-slate-100">{value}</p>
      {description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block h-full hover:opacity-90">
      {content}
    </Link>
  );
}
