"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { PermissionMatrix } from "@/components/dashboard/permission-matrix";
import {
  emptyPermissions,
  type PermissionSet,
} from "@/lib/permissions";

type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: PermissionSet;
};

type Member = {
  id: string;
  isOwner: boolean;
  status: string;
  user: { id: string; name: string; email: string; image: string | null };
  role: { id: string; name: string; isSystem: boolean } | null;
  hasOverride: boolean;
  permissions: PermissionSet | null;
};

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  role: { id: string; name: string } | null;
  expiresAt: string;
};

type MembersResponse = {
  currentUserId: string;
  members: Member[];
  invitations: Invitation[];
};

const AVATAR_COLORS = [
  "bg-slate-600 text-white",
  "bg-violet-100 text-violet-600",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
];

function avatarClass(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

async function fetchMembers(): Promise<MembersResponse> {
  const res = await fetch("/api/members");
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

async function fetchRoles(): Promise<{ roles: Role[] }> {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to load roles");
  return res.json();
}

export function AllUsersClient() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [permEditor, setPermEditor] = useState<Member | null>(null);

  const roles = rolesData?.roles ?? [];
  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["members"] });

  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">All Users</h2>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6330c2]"
        >
          <UserPlus className="size-4" />
          Add User
        </button>
      </div>

      <div className="overflow-visible rounded-md border border-zinc-100">
        <div className="bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">Name/Email</div>

        {isLoading && <div className="px-4 py-6 text-sm text-zinc-500">Loading users…</div>}

        {!isLoading &&
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              roles={roles}
              isCurrentUser={member.user.id === data?.currentUserId}
              onChanged={refresh}
              onEditPermissions={() => setPermEditor(member)}
            />
          ))}
      </div>

      {invitations.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700">Pending invitations</h3>
          <div className="overflow-hidden rounded-md border border-zinc-100">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invite={inv} onChanged={refresh} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-zinc-600">
        Showing {members.length} {members.length === 1 ? "user" : "users"}
        {invitations.length > 0 && ` · ${invitations.length} pending`}
      </p>

      {inviteOpen && (
        <InviteModal roles={roles} onClose={() => setInviteOpen(false)} onInvited={refresh} />
      )}
      {permEditor && (
        <PermissionsOverrideModal
          member={permEditor}
          roles={roles}
          onClose={() => setPermEditor(null)}
          onSaved={() => {
            setPermEditor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function MemberRow({
  member,
  roles,
  isCurrentUser,
  onChanged,
  onEditPermissions,
}: {
  member: Member;
  roles: Role[];
  isCurrentUser: boolean;
  onChanged: () => void;
  onEditPermissions: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (member.user.name || member.user.email).charAt(0).toUpperCase();

  const patch = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Update failed");
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Remove failed");
    },
    onSuccess: () => {
      toast.success("Member removed");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inactive = member.status === "inactive";

  return (
    <div className="grid gap-4 border-t border-zinc-100 px-4 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex min-w-0 gap-4">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold ${avatarClass(
            member.user.email
          )} ${inactive ? "opacity-50" : ""}`}
        >
          {initials}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-medium text-zinc-950">
            {member.user.name}
            {isCurrentUser && <span className="text-zinc-400"> (You)</span>}
            {member.isOwner && (
              <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-[#7438dc]">
                Owner
              </span>
            )}
            {inactive && (
              <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                Inactive
              </span>
            )}
          </p>
          <p className="truncate text-sm text-sky-950">{member.user.email}</p>

          <div className="mt-3 flex h-10 max-w-xs items-center rounded-md border border-zinc-200 bg-white px-2">
            {member.isOwner ? (
              <span className="px-1 text-sm text-zinc-600">Super Admin</span>
            ) : (
              <select
                value={member.role?.id ?? ""}
                disabled={patch.isPending}
                onChange={(e) =>
                  patch.mutate({ roleId: e.target.value || null }, {
                    onSuccess: () => {
                      toast.success("Role updated");
                      onChanged();
                    },
                  })
                }
                className="w-full bg-transparent text-sm text-zinc-800 outline-none"
              >
                <option value="">No role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start justify-end gap-6 text-sm text-zinc-500">
        <button
          type="button"
          onClick={onEditPermissions}
          disabled={member.isOwner}
          className="flex flex-col items-center gap-1 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300"
          title={member.isOwner ? "Owner always has full access" : "Edit permissions"}
        >
          <LockKeyhole className="size-5" />
          Permissions
          {member.hasOverride && !member.isOwner && (
            <span className="text-[10px] text-[#7438dc]">custom</span>
          )}
        </button>

        {!member.isOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex flex-col items-center gap-1 transition-colors hover:text-zinc-900"
            >
              <MoreHorizontal className="size-5" />
              More
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      patch.mutate(
                        { status: inactive ? "active" : "inactive" },
                        {
                          onSuccess: () => {
                            toast.success(inactive ? "User activated" : "User deactivated");
                            onChanged();
                          },
                        }
                      );
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    {inactive ? "Activate user" : "Deactivate user"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm(`Remove ${member.user.name} from the team?`)) remove.mutate();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                    Remove user
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InvitationRow({ invite, onChanged }: { invite: Invitation; onChanged: () => void }) {
  const revoke = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invitations/${invite.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke invitation");
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex items-center justify-between gap-4 border-t border-zinc-100 px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Mail className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800">{invite.email}</p>
          <p className="text-xs text-zinc-500">
            {invite.role?.name ?? "Custom permissions"} · pending
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => revoke.mutate()}
        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Revoke
      </button>
    </div>
  );
}

function InviteModal({
  roles,
  onClose,
  onInvited,
}: {
  roles: Role[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => !r.isSystem)?.id ?? "");
  const [useCustom, setUseCustom] = useState(false);
  const [permissions, setPermissions] = useState<PermissionSet>(emptyPermissions());
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const invite = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          roleId: useCustom ? null : roleId || null,
          permissions: useCustom ? permissions : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof body.error === "object") setErrors(body.error);
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not send invitation"
        );
      }
      return body as { inviteUrl: string; emailSent: boolean };
    },
    onSuccess: (body) => {
      setInviteUrl(body.inviteUrl);
      setEmailSent(body.emailSent);
      toast.success(body.emailSent ? "Invitation email sent" : "Invitation created");
      onInvited();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Success state: show the invite link to copy/share.
  if (inviteUrl) {
    return (
      <Modal open onClose={onClose} title="Invitation ready" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Check className="size-4" />
            {emailSent
              ? `An invitation email was sent to ${email}.`
              : "Share this secure link with the user to let them join."}
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="h-10 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-700"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("Link copied");
              }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-[#7438dc] px-3 text-sm font-medium text-white hover:bg-[#6330c2]"
            >
              <Copy className="size-4" />
              Copy
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size={useCustom ? "xl" : "md"}
      title="Add user"
      description="Invite a teammate by email and choose what they can access."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={invite.isPending}
            onClick={() => {
              setErrors({});
              invite.mutate();
            }}
            className="h-10 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white hover:bg-[#6330c2] disabled:opacity-60"
          >
            {invite.isPending ? "Sending…" : "Send invitation"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 ">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">
              Full name <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email[0]}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800">Role</label>
          <select
            value={roleId}
            disabled={useCustom}
            onChange={(e) => setRoleId(e.target.value)}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#7438dc] disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {errors.roleId && <p className="mt-1 text-xs text-red-500">{errors.roleId[0]}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            className="size-4 rounded border-zinc-300 accent-[#7438dc]"
          />
          Set custom permissions instead of a role
        </label>

        {useCustom && (
          <PermissionMatrix value={permissions} onChange={setPermissions} />
        )}
      </div>
    </Modal>
  );
}

function PermissionsOverrideModal({
  member,
  roles,
  onClose,
  onSaved,
}: {
  member: Member;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Prefill with the member's existing override, else their role's permissions.
  const rolePerms = roles.find((r) => r.id === member.role?.id)?.permissions;
  const [permissions, setPermissions] = useState<PermissionSet>(
    member.permissions ?? rolePerms ?? emptyPermissions()
  );

  const save = useMutation({
    mutationFn: async (payload: { permissions: PermissionSet | null }) => {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Save failed");
    },
    onSuccess: () => {
      toast.success("Permissions updated");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Permissions · ${member.user.name}`}
      description="Custom permissions override the assigned role for this user only."
      footer={
        <>
          {member.hasOverride && (
            <button
              type="button"
              onClick={() => save.mutate({ permissions: null })}
              className="mr-auto h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Reset to role
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate({ permissions })}
            className="h-10 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white hover:bg-[#6330c2] disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save permissions"}
          </button>
        </>
      }
    >
      <PermissionMatrix value={permissions} onChange={setPermissions} />
    </Modal>
  );
}
