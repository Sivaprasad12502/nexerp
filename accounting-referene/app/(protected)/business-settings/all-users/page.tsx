import { ChevronDown, Ellipsis, LockKeyhole, Sun, UserPlus, X } from "lucide-react";

const users = [
  {
    name: "siva prasad (You)",
    email: "0009sivaprasadvft@gmail.com",
    initials: "S",
    avatarClass: "bg-slate-600 text-white",
    roles: ["Super Admin"],
  },
  {
    name: "rohit",
    email: "sivaprasad122003@gmail.com",
    initials: "R",
    avatarClass: "bg-violet-100 text-violet-600",
    roles: ["salesman"],
  },
];

export default function AllUsersPage() {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">All Users</h2>
          <Sun className="size-5 text-amber-400" />
        </div>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6330c2]"
        >
          <UserPlus className="size-4" />
          Add User
        </button>
      </div>

      <div className="overflow-hidden border border-zinc-100">
        <div className="bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
          Name/Email
        </div>

        {users.map((user) => (
          <div
            key={user.email}
            className="grid gap-4 border-t border-zinc-100 px-4 py-5 md:grid-cols-[minmax(0,1fr)_180px]"
          >
            <div className="flex min-w-0 gap-4">
              <div
                className={`flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold ${user.avatarClass}`}
              >
                {user.initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-medium text-zinc-950">{user.name}</p>
                <p className="truncate text-base text-sky-950">{user.email}</p>
                <div className="mt-3 flex h-11 max-w-xs items-center justify-between rounded-md border border-zinc-200 bg-white px-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-2 rounded bg-zinc-200 px-2 py-1 text-sm text-zinc-900"
                      >
                        {role}
                        <X className="size-3" />
                      </span>
                    ))}
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-zinc-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-7 text-sm text-zinc-500">
              <button
                type="button"
                className="flex flex-col items-center gap-1 text-zinc-300"
                disabled
              >
                <LockKeyhole className="size-5" />
                Permissions
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 transition-colors hover:text-zinc-900"
              >
                <Ellipsis className="size-5" />
                More
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-zinc-600">
        Showing 1 to {users.length} of {users.length} Records
      </p>
    </div>
  );
}
