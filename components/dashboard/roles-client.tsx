"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { PermissionMatrix } from "@/components/dashboard/permission-matrix";
import {
  emptyPermissions,
  summarizePermissions,
  type PermissionSet,
} from "@/lib/permissions";

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionSet;
  memberCount: number;
};

async function fetchRoles(): Promise<{ roles: Role[] }> {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to load roles");
  return res.json();
}

export function RolesClient() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete role");
    },
    onSuccess: () => {
      toast.success("Role deleted");
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roles = data?.roles ?? [];

  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Roles &amp; Permissions
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Manage role access for team users.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6330c2]"
        >
          <Plus className="size-4" />
          Add Role
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-100">
        <div className="grid grid-cols-[minmax(0,1fr)_200px_90px_110px] bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
          <span>Role</span>
          <span>Permissions</span>
          <span className="text-right">Users</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading && (
          <div className="px-4 py-6 text-sm text-zinc-500">Loading roles…</div>
        )}

        {!isLoading &&
          roles.map((role) => (
            <div
              key={role.id}
              className="grid grid-cols-[minmax(0,1fr)_200px_90px_110px] items-center border-t border-zinc-100 px-4 py-4 text-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-[#7438dc]">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-950">{role.name}</p>
                  {role.description && (
                    <p className="truncate text-xs text-zinc-500">{role.description}</p>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center gap-2 text-zinc-600">
                <LockKeyhole className="size-4 text-zinc-400" />
                {role.isSystem ? "All permissions" : summarizePermissions(role.permissions)}
              </span>
              <span className="text-right text-zinc-600">{role.memberCount}</span>
              <div className="flex items-center justify-end gap-1">
                {role.isSystem ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                    System
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(role)}
                      className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
                      aria-label={`Edit ${role.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete the "${role.name}" role?`)) {
                          deleteMutation.mutate(role.id);
                        }
                      }}
                      className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${role.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

        {!isLoading && roles.length === 0 && (
          <div className="px-4 py-6 text-sm text-zinc-500">No roles yet.</div>
        )}
      </div>

      {(creating || editing) && (
        <RoleEditor
          role={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["roles"] });
          }}
        />
      )}
    </div>
  );
}

function RoleEditor({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<PermissionSet>(
    role?.permissions ?? emptyPermissions()
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(role ? `/api/roles/${role.id}` : "/api/roles", {
        method: role ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof body.error === "object") setErrors(body.error);
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not save role"
        );
      }
    },
    onSuccess: () => {
      toast.success(role ? "Role updated" : "Role created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={role ? "Edit role" : "Create role"}
      description="Choose what this role can do in each module."
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
            disabled={save.isPending}
            onClick={() => {
              setErrors({});
              save.mutate();
            }}
            className="h-10 rounded-lg bg-[#7438dc] px-5 text-sm font-semibold text-white hover:bg-[#6330c2] disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save role"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Role name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Salesman"
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name[0]}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">
              Description <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of this role"
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
            />
          </div>
        </div>

        <PermissionMatrix value={permissions} onChange={setPermissions} />
      </div>
    </Modal>
  );
}
