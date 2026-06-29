"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Funnel,
  Gem,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Loader2,
  Recycle,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewClientDrawer } from "@/components/client/view-client-drawer";
import type { ClientRow } from "./components/client-form";
import { LinkContactSidebar } from "@/components/client/link-contact-sidebar";

type Client = ClientRow & { updatedAt: string };

type TabStatus = "ACTIVE" | "ARCHIVED";
type LinkedContact = ClientRow["linkedContacts"][number]["contact"];

const moreMenuItems = [
  { label: "View Client", icon: Eye },
  { label: "Link Contact", icon: Link2 },
  { label: "See All Invoices", icon: FileText },
  { label: "See All Quotations", icon: FileText },
  { label: "Activity History", icon: FileText },
  { label: "Edit", icon: Pencil },
  { label: "Client Statement", icon: FileText },
  { label: "Ledger Statement", icon: FileText },
  { label: "View Party Transaction Report", icon: FileText },
  { label: "Archive", icon: Archive },
  { label: "See All Leads", icon: FileText },
  { label: "Create New Lead", icon: FileText },
  { label: "Create Invoice", icon: FileText, premium: true },
  { label: "Create Proforma Invoice", icon: FileText, premium: true },
  { label: "Create Quotation", icon: FileText, premium: true },
  { label: "Create Credit Note", icon: FileText, premium: true },
  { label: "Create Debit Note", icon: FileText, premium: true },
] as const;

export default function ClientsAndProspectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabStatus>("ACTIVE");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [linkClient, setLinkClient] = useState<Client | null>(null);
  const [linkedContactIds, setLinkedContactIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data, isLoading } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients", tab, search],
    queryFn: () =>
      fetch(
        `/api/clients?status=${tab}&search=${encodeURIComponent(search)}`,
      ).then((r) => r.json()),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/clients/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Client archived");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Failed to archive client"),
  });
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        throw new Error("Failed to restore client");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Client restored");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Failed to restore client"),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}/permanent`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete client");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Failed to delete client"),
  });
  const linkContactsMutation = useMutation({
    mutationFn: async ({
      clientId,
      contactIds,
    }: {
      clientId: string;
      contactIds: string[];
    }) => {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedContactIds: contactIds }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update linked contacts");
      }
      return body as { client: Client };
    },
    onSuccess: ({ client }) => {
      setLinkClient(client);
      setLinkedContactIds(client.linkedContacts.map((lc) => lc.contact.id));
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clients = data?.clients ?? [];

  function handleArchive(id: string) {
    if (confirm("Archive this client?")) archiveMutation.mutate(id);
  }
  function handleRestore(id: string) {
    if (confirm("Restore this client?")) restoreMutation.mutate(id);
  }
  function openLinkContacts(client: Client) {
    setLinkClient(client);
    setLinkedContactIds(client.linkedContacts.map((lc) => lc.contact.id));
  }
  function persistLinkedContacts(nextIds: string[]) {
    if (!linkClient) return;
    setLinkedContactIds(nextIds);
    linkContactsMutation.mutate({
      clientId: linkClient.id,
      contactIds: nextIds,
    });
  }
  function handleLinkContact(contact: LinkedContact) {
    if (linkedContactIds.includes(contact.id)) return;
    persistLinkedContacts([...linkedContactIds, contact.id]);
  }
  function handleUnlinkContact(contactId: string) {
    persistLinkedContacts(linkedContactIds.filter((id) => id !== contactId));
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-10">
      <div className="rounded-b-md bg-white px-6 py-9 shadow-sm ring-1 ring-zinc-100 sm:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base text-zinc-500">
              <span>Your Clients</span>
              <ChevronRight className="size-5" />
            </div>
            <h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-900">
              Your Clients
            </h1>
          </div>

          <div className="flex h-12 overflow-hidden rounded-lg bg-[#e9007f] text-white shadow-sm">
            <Button
              className="h-12 rounded-none bg-[#e9007f] px-6 text-base font-semibold hover:bg-[#d00072]"
              onClick={() =>
                router.push("/sales-and-invoices/clients-prospects/new")
              }
            >
              <Plus className="size-5" />
              Add Client
            </Button>
            <Button
              aria-label="Open add client options"
              className="h-12 w-13 rounded-none border-l border-white/40 bg-[#e9007f] px-0 hover:bg-[#d00072]"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-9 text-lg font-medium text-zinc-500">
          <button
            type="button"
            className="h-10 border-b-2 border-[#7438dc] text-zinc-700"
          >
            All Clients
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 hover:text-zinc-900"
          >
            Reports &amp; More
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <main className="px-5 pt-12 sm:px-10">
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setTab("ACTIVE")}
            className={`h-12 pr-8 text-lg font-medium transition-colors ${
              tab === "ACTIVE"
                ? "border-b-2 border-[#7438dc] text-zinc-700"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Active Clients
          </button>
          <button
            type="button"
            onClick={() => setTab("ARCHIVED")}
            className={`h-12 px-0 text-lg font-medium transition-colors ${
              tab === "ARCHIVED"
                ? "border-b-2 border-[#7438dc] text-zinc-700"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Archived Clients
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
          <Button
            variant="outline"
            className="h-12 gap-2 rounded-lg border-zinc-200 bg-white px-6 text-lg font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="size-5 text-zinc-500" />
            Download CSV
          </Button>

          <div className="flex h-12 w-full items-center rounded-md border border-zinc-400 bg-white px-5 text-zinc-400 lg:w-[250px]">
            <Search className="size-5 shrink-0" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Clients"
              className="min-w-0 flex-1 bg-transparent px-3 text-lg text-zinc-700 outline-none placeholder:text-zinc-400"
            />
            <ArrowRight className="size-6 shrink-0 text-zinc-500" />
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg text-zinc-600">
            Showing <span className="font-semibold text-zinc-900">1</span> to{" "}
            <span className="font-semibold text-zinc-900">
              {clients.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-900">
              {clients.length}
            </span>{" "}
            Clients
          </p>

          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            <SlidersHorizontal className="size-4 text-[#7438dc]" />
            Show/Hide Columns
          </Button>
        </div>

        <div className="mt-6 overflow-x-auto border border-zinc-100 bg-white">
          <table className="w-full min-w-[1400px] border-collapse text-left text-lg">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <Th className="w-14">
                  <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
                </Th>
                <Th className="w-12" />
                <Th className="w-24">Logo</Th>
                <Th>Name</Th>
                <Th>Clients/Prospects</Th>
                <Th>Industry</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Country</Th>
                <Th>Status</Th>
                <Th>Last Updated</Th>
                <Th className="w-52" />
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-zinc-500">
                    <Loader2 className="mx-auto size-6 animate-spin text-[#7438dc]" />
                  </td>
                </tr>
              )}

              {!isLoading && clients.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-zinc-500">
                    No clients found.
                  </td>
                </tr>
              )}

              {clients.map((client, index) => {
                const initials = client.businessName.slice(0, 2).toUpperCase();
                const phone = client.phone
                  ? `${client.phoneCode ?? ""} ${client.phone}`.trim()
                  : "-";
                const lastUpdated = new Date(
                  client.updatedAt,
                ).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <tr
                    key={client.id}
                    className="border-t border-zinc-100 text-zinc-700"
                  >
                    <td className="px-3 py-5">
                      <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
                    </td>
                    <td className="px-3 py-5 text-zinc-700">{index + 1}</td>
                    <td className="px-3 py-5">
                      {client.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={client.logo}
                          alt={client.businessName}
                          className="size-[51px] rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex size-[51px] items-center justify-center rounded-lg bg-zinc-800 text-xl font-medium text-white">
                          {initials}
                        </span>
                      )}
                    </td>
                    <td
                      className="cursor-pointer px-3 py-5 font-medium text-zinc-800 hover:text-[#7438dc]"
                      onClick={() => setViewClient(client)}
                    >
                      {client.businessName}
                    </td>
                    <td className="px-3 py-5">
                      {client.clientType === "INDIVIDUAL"
                        ? "Individual"
                        : "Company"}
                    </td>
                    <td className="px-3 py-5">{client.industry ?? "-"}</td>
                    <td className="px-3 py-5">
                      {client.phone ? (
                        <a
                          href={`tel:${phone.replaceAll(" ", "")}`}
                          className="block max-w-32 break-words underline underline-offset-2"
                        >
                          {phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-5">{client.email ?? "-"}</td>
                    <td className="px-3 py-5">{client.country ?? "-"}</td>
                    <td className="px-3 py-5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                          client.status === "ACTIVE"
                            ? "bg-green-50 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {client.status === "ACTIVE" ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-3 py-5">{lastUpdated}</td>
                    <td className="px-3 py-5">
                      <div className="flex items-center justify-end gap-5 text-zinc-600">
                        {client.status === "ACTIVE" ? (
                          <>
                            <RowAction
                              icon={Pencil}
                              label="Edit"
                              onClick={() =>
                                router.push(
                                  `/sales-and-invoices/clients-prospects/${client.id}/edit`,
                                )
                              }
                            />
                            <RowAction
                              icon={Archive}
                              label="Archive"
                              onClick={() => handleArchive(client.id)}
                            />
                            <ClientMoreMenu
                              onView={() => setViewClient(client)}
                              onEdit={() =>
                                router.push(
                                  `/sales-and-invoices/clients-prospects/${client.id}/edit`,
                                )
                              }
                              onArchive={() => handleArchive(client.id)}
                              onLink={() => openLinkContacts(client)}
                            />
                          </>
                        ) : (
                          <>
                            <RowAction
                              icon={Recycle}
                              label="Restore"
                              onClick={() => handleRestore(client.id)}
                            />
                            <RowAction
                              icon={Trash2}
                              label="Delete"
                              onClick={() => {
                                if (
                                  confirm(
                                    "This action cannot be undone. Delete permenently?",
                                  )
                                ) {
                                  deleteMutation.mutate(client.id);
                                }
                              }}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 flex size-16 items-center justify-center rounded-full bg-[#7438dc] text-white shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle className="size-8 fill-white/90" />
      </button>

      <ViewClientDrawer
        open={viewClient !== null}
        client={viewClient}
        onClose={() => setViewClient(null)}
        onEdit={() => {
          if (viewClient) {
            router.push(
              `/sales-and-invoices/clients-prospects/${viewClient.id}/edit`,
            );
          }
        }}
      />
      <LinkContactSidebar
        open={linkClient !== null}
        linkedIds={linkedContactIds}
        onLink={handleLinkContact}
        onUnlink={handleUnlinkContact}
        onClose={() => setLinkClient(null)}
      />
    </div>
  );
}

function ClientMoreMenu({
  onView,
  onEdit,
  onArchive,
  onLink,
}: {
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onLink: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-80 rounded-md border-zinc-100 bg-white p-3 shadow-xl"
      >
        {moreMenuItems.map((item, index) => {
          const Icon = item.icon;
          const premium = "premium" in item && item.premium;

          const actionable =
            item.label === "View Client"
              ? onView
              : item.label === "Edit"
                ? onEdit
                : item.label === "Archive"
                  ? onArchive
                  : item.label === "Link Contact"
                    ? onLink
                    : undefined;

          return (
            <div key={item.label}>
              {index === 5 || index === 10 || index === 12 ? (
                <DropdownMenuSeparator className="my-1 bg-zinc-100" />
              ) : null}
              <DropdownMenuItem
                onClick={actionable}
                className="min-h-10 cursor-pointer gap-4 rounded-md px-3 py-2 text-lg text-zinc-800 focus:bg-zinc-50 focus:text-zinc-950"
              >
                <Icon className="size-5 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {premium ? (
                  <span className="flex size-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-500">
                    <Gem className="size-4 fill-orange-300" />
                  </span>
                ) : null}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Pencil;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
    >
      <Icon className="size-5 fill-zinc-500/10" />
      {label}
    </button>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`whitespace-nowrap px-3 py-4 font-normal ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {typeof children === "string" && (
          <Funnel className="size-4 fill-zinc-300 text-zinc-300" />
        )}
      </span>
    </th>
  );
}
