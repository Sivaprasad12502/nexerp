import { LockKeyhole, ShieldCheck } from "lucide-react";

const roles = [
  { name: "Super Admin", permissions: "All permissions", users: 1 },
  { name: "salesman", permissions: "Sales and contact access", users: 1 },
];

export default function RolesPermissionsPage() {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Roles & Permissions
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Manage role access for team users.</p>
      </div>

      <div className="overflow-hidden border border-zinc-100">
        <div className="grid grid-cols-[minmax(0,1fr)_180px_120px] bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
          <span>Role</span>
          <span>Permissions</span>
          <span className="text-right">Users</span>
        </div>

        {roles.map((role) => (
          <div
            key={role.name}
            className="grid grid-cols-[minmax(0,1fr)_180px_120px] items-center border-t border-zinc-100 px-4 py-4 text-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-[#7438dc]">
                <ShieldCheck className="size-5" />
              </div>
              <span className="truncate font-medium text-zinc-950">{role.name}</span>
            </div>
            <span className="inline-flex items-center gap-2 text-zinc-600">
              <LockKeyhole className="size-4 text-zinc-400" />
              {role.permissions}
            </span>
            <span className="text-right text-zinc-600">{role.users}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
