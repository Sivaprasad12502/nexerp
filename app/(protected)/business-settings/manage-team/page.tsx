import { UserPlus, Users } from "lucide-react";

const teams = [
  { name: "Admins", members: 1, description: "Full access to business settings and reports." },
  { name: "Sales Team", members: 1, description: "Access to contacts, quotations, and invoices." },
];

export default function ManageTeamPage() {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Manage Team</h2>
          <p className="mt-1 text-sm text-zinc-500">Group users by responsibility and access.</p>
        </div>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6330c2]"
        >
          <UserPlus className="size-4" />
          Add Team
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <article key={team.name} className="rounded-lg border border-zinc-100 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-violet-50 text-[#7438dc]">
                <Users className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-950">{team.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{team.description}</p>
                <p className="mt-4 text-sm font-medium text-zinc-700">
                  {team.members} {team.members === 1 ? "member" : "members"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
