"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, Star, X } from "lucide-react";
import { toast } from "sonner";

type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  linkedClients?: LinkedClient[];
};

type Client = {
  id: string;
  businessName: string;
  email: string | null;
  logo: string | null;
  industry?: string | null;
  city?: string | null;
};

type LinkedClient = {
  client: Client;
  isPrimary: boolean;
};

export function LinkClientSidebar({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [linkedClients, setLinkedClients] = useState<LinkedClient[]>([]);

  const { data, isLoading } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients", "ACTIVE"],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE");
      if (!res.ok) throw new Error("Failed to load clients");
      return res.json();
    },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async (nextLinkedClients: LinkedClient[]) => {
      if (!contact) throw new Error("Select a contact first");

      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedClients: nextLinkedClients.map(({ client, isPrimary }) => ({
            clientId: client.id,
            isPrimary,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to update linked clients",
        );
      }
      return body as { contact: Contact };
    },
    onSuccess: ({ contact: updatedContact }) => {
      setLinkedClients(updatedContact.linkedClients ?? []);
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Linked clients updated");
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setLinkedClients(contact?.linkedClients ?? []);
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSearch("");
      setLinkedClients(contact?.linkedClients ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, contact]);

  const clients = (data?.clients ?? []).filter((client) => {
    const q = search.toLowerCase();
    return (
      client.businessName.toLowerCase().includes(q) ||
      (client.email ?? "").toLowerCase().includes(q) ||
      (client.industry ?? "").toLowerCase().includes(q) ||
      (client.city ?? "").toLowerCase().includes(q)
    );
  });

  function persist(nextLinkedClients: LinkedClient[]) {
    setLinkedClients(nextLinkedClients);
    linkMutation.mutate(nextLinkedClients);
  }

  function linkClient(client: Client) {
    if (linkedClients.some((link) => link.client.id === client.id)) return;
    persist([...linkedClients, { client, isPrimary: linkedClients.length === 0 }]);
  }

  function unlinkClient(clientId: string) {
    const wasPrimary = linkedClients.some(
      (link) => link.client.id === clientId && link.isPrimary,
    );
    const next = linkedClients.filter((link) => link.client.id !== clientId);
    persist(
      wasPrimary && next.length > 0
        ? next.map((link, index) => ({ ...link, isPrimary: index === 0 }))
        : next,
    );
  }

  function markPrimary(clientId: string) {
    persist(
      linkedClients.map((link) => ({
        ...link,
        isPrimary: link.client.id === clientId,
      })),
    );
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/30"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Link Client"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Link Client</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Select clients to link to this contact
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <div className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 px-3">
            <Search className="size-4 shrink-0 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-[#7438dc]" />
            </div>
          )}

          {!isLoading && clients.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              {search ? "No clients match your search." : "No clients found."}
            </p>
          )}

          <ul className="space-y-2">
            {clients.map((client) => {
              const link = linkedClients.find((item) => item.client.id === client.id);
              const linked = Boolean(link);
              const initials = client.businessName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <li
                  key={client.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-3"
                >
                  {client.logo ? (
                    <img
                      src={client.logo}
                      alt={client.businessName}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
                      {initials}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {client.businessName}
                    </p>
                    {client.email && (
                      <p className="truncate text-xs text-zinc-500">{client.email}</p>
                    )}
                  </div>

                  {linked && (
                    <button
                      type="button"
                      onClick={() => markPrimary(client.id)}
                      disabled={linkMutation.isPending || link?.isPrimary}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        link?.isPrimary
                          ? "bg-amber-50 text-amber-700"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                    >
                      <Star className="size-3" />
                      {link?.isPrimary ? "Primary" : "Make Primary"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      linked ? unlinkClient(client.id) : linkClient(client)
                    }
                    disabled={linkMutation.isPending}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      linked
                        ? "bg-[#7438dc]/10 text-[#7438dc] hover:bg-red-50 hover:text-red-600"
                        : "bg-[#7438dc] text-white hover:bg-[#6330c2]"
                    }`}
                  >
                    {linked ? (
                      <span className="flex items-center gap-1">
                        <Check className="size-3" /> Linked
                      </span>
                    ) : (
                      "Link"
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2]"
          >
            Done ({linkedClients.length} linked)
          </button>
        </div>
      </div>
    </>
  );
}
