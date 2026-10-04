import AdminNav from "@/components/AdminNav";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["owner", "staff"], "/admin");
  return (
    <div className="flex min-h-dvh flex-col gap-6 px-5 pb-16 pt-24 md:flex-row md:gap-10 md:px-10">
      <aside className="min-w-0 md:sticky md:top-24 md:h-fit md:w-56 md:shrink-0">
        <p className="mb-1 text-xs uppercase tracking-[0.3em] text-fg">{user.role}</p>
        <p className="mb-4 font-semibold">{user.name}</p>
        <AdminNav role={user.role as "owner" | "staff"} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
