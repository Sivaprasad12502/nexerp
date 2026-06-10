"use client";

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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Client = {
  id: string;
  logo: string;
  name: string;
  type: "Client" | "Prospect";
  industry: string;
  phone: string;
  email: string;
  country: string;
  status: string;
  lastCommunication: string;
};

const clients: Client[] = [
  {
    id: "1",
    logo: "R",
    name: "Rockeys",
    type: "Prospect",
    industry: "-",
    phone: "+91 62386 99743",
    email: "sivarokecy@gmail.com",
    country: "IN",
    status: "-",
    lastCommunication: "-",
  },
  {
    id: "2",
    logo: "T",
    name: "totroys",
    type: "Prospect",
    industry: "-",
    phone: "+91 663 589 7510",
    email: "nokki@gmail.com",
    country: "IN",
    status: "-",
    lastCommunication: "-",
  },
  {
    id: "3",
    logo: "A",
    name: "Acme Trading",
    type: "Client",
    industry: "Wholesale",
    phone: "+91 98210 45678",
    email: "billing@acmetrading.in",
    country: "IN",
    status: "Active",
    lastCommunication: "10 Jun 2026",
  },
];

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
  return (
    <div className="min-h-screen bg-zinc-50 pb-10">
      <div className="rounded-b-md bg-white px-6 py-9 shadow-sm ring-1 ring-zinc-100 sm:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base text-zinc-500">
              <span>Sivaprasad R</span>
              <ChevronRight className="size-5" />
              <span>Your Clients</span>
              <ChevronRight className="size-5" />
            </div>
            <h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-900">
              Your Clients
            </h1>
          </div>

          <div className="flex h-12 overflow-hidden rounded-lg bg-[#e9007f] text-white shadow-sm">
            <Button className="h-12 rounded-none bg-[#e9007f] px-6 text-base font-semibold hover:bg-[#d00072]">
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
            Reports & More
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <main className="px-5 pt-12 sm:px-10">
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            className="h-12 pr-8 text-lg font-medium text-zinc-700"
          >
            Active Clients
          </button>
          <button
            type="button"
            className="h-12 px-0 text-lg font-medium text-zinc-600 hover:text-zinc-900"
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
              placeholder="Search Clients"
              className="min-w-0 flex-1 bg-transparent px-3 text-lg text-zinc-700 outline-none placeholder:text-zinc-400"
            />
            <ArrowRight className="size-6 shrink-0 text-zinc-500" />
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg text-zinc-600">
            Showing <span className="font-semibold text-zinc-900">1</span> to{" "}
            <span className="font-semibold text-zinc-900">{clients.length}</span>{" "}
            of <span className="font-semibold text-zinc-900">{clients.length}</span>{" "}
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
          <table className="w-full min-w-[1500px] border-collapse text-left text-lg">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <Th className="w-14">
                  <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
                </Th>
                <Th className="w-12" />
                <Th className="w-24">Logo</Th>
                <Th>Name</Th>
                <Th>Select Clients/Prospects</Th>
                <Th>Industry</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Country</Th>
                <Th>Status</Th>
                <Th>Last Communication Date</Th>
                <Th className="w-52" />
              </tr>
            </thead>

            <tbody>
              {clients.map((client, index) => (
                <tr
                  key={client.id}
                  className="border-t border-zinc-100 text-zinc-700"
                >
                  <td className="px-3 py-5">
                    <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
                  </td>
                  <td className="px-3 py-5 text-zinc-700">{index + 1}</td>
                  <td className="px-3 py-5">
                    <span className="flex size-[51px] items-center justify-center rounded-lg bg-zinc-800 text-3xl font-medium text-white">
                      {client.logo}
                    </span>
                  </td>
                  <td className="px-3 py-5 text-zinc-800">{client.name}</td>
                  <td className="px-3 py-5">{client.type}</td>
                  <td className="px-3 py-5">{client.industry}</td>
                  <td className="px-3 py-5">
                    <a
                      href={`tel:${client.phone.replaceAll(" ", "")}`}
                      className="block max-w-32 break-words underline underline-offset-2"
                    >
                      {client.phone}
                    </a>
                  </td>
                  <td className="px-3 py-5">{client.email}</td>
                  <td className="px-3 py-5">{client.country}</td>
                  <td className="px-3 py-5">{client.status}</td>
                  <td className="px-3 py-5">{client.lastCommunication}</td>
                  <td className="px-3 py-5">
                    <div className="flex items-center justify-end gap-5 text-zinc-600">
                      <RowAction icon={Pencil} label="Edit" />
                      <RowAction icon={Archive} label="Archive" />
                      <ClientMoreMenu />
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}

function ClientMoreMenu() {
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

          return (
            <div key={item.label}>
              {index === 5 || index === 10 || index === 12 ? (
                <DropdownMenuSeparator className="my-1 bg-zinc-100" />
              ) : null}
              <DropdownMenuItem className="min-h-10 cursor-pointer gap-4 rounded-md px-3 py-2 text-lg text-zinc-800 focus:bg-zinc-50 focus:text-zinc-950">
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
}: {
  icon: typeof Pencil;
  label: string;
}) {
  return (
    <button
      type="button"
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
