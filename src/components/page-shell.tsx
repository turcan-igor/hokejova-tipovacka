import { Nav } from "@/components/nav";

export function PageShell({
  children,
  isAdmin
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  return (
    <>
      <Nav isAdmin={isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
