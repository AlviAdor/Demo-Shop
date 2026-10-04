import { redirect } from "next/navigation";
import { RoleSelect } from "@/components/AdminTables";
import { getUser } from "@/lib/auth";
import { usd } from "@/lib/currency";
import { listUsersWithSpend } from "@/lib/store";

export default async function Team() {
  const me = await getUser();
  if (me?.role !== "owner") redirect("/admin/orders");
  const users = listUsersWithSpend();
  return (
    <div className="space-y-6">
      <h1 className="display text-6xl md:text-8xl">Team &amp; roles</h1>
      <p className="max-w-2xl text-muted">Staff can manage orders and stock. Only the owner sees revenue, customers and roles.</p>
      <ul className="space-y-3 md:hidden">
        {users.map((u) => (
          <li key={u.id} className="border border-line bg-card p-4 text-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{u.name}</p><p className="text-xs text-muted">{u.email}</p></div>{u.role === "owner" || u.id === me.id ? <span className="bg-fg px-3 py-1 text-xs font-bold capitalize text-bg">{u.role}</span> : <RoleSelect id={u.id} role={u.role} />}</div>
            <p className="mt-3 text-xs text-muted">{u.orders} order{u.orders === 1 ? "" : "s"} · {usd(u.spent)} lifetime spend</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto border border-line bg-card p-4 md:block">
        <table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="p-3">Name</th><th>Email</th><th>Orders</th><th>Lifetime spend</th><th>Role</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id} className="border-t border-line"><td className="p-3">{u.name}</td><td className="text-muted">{u.email}</td><td>{u.orders}</td><td>{usd(u.spent)}</td>
              <td>{u.role === "owner" || u.id === me.id ? <span className="bg-fg px-3 py-1 text-xs font-bold capitalize text-bg">{u.role}</span> : <RoleSelect id={u.id} role={u.role} />}</td></tr>))}</tbody></table>
      </div>
    </div>
  );
}
