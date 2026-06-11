import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  CalendarDays,
  ExternalLink,
  MessageCircle,
  Plus,
  UserRound,
  UsersRound,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const gettingStartedCards = [
  {
    title: "Invoices",
    description:
      "Effortlessly create and share professional invoices to clients via Email and WhatsApp.",
    action: "Create New Invoice",
    demo: "See Demo Video",
    href: "/sales/invoices",
    accent: "violet",
    documentType: "Invoice",
    brand: "META MORA",
  },
  {
    title: "Quotations",
    description:
      "Seal the deal with customised quotations and win over potential clients.",
    action: "Create New Quotation",
    demo: "See Demo Video",
    href: "/sales/quotations",
    accent: "sky",
    documentType: "Quotation",
    brand: "LIGHT STUDIO",
  },
  {
    title: "Expenses",
    description:
      "Stay on top of your expenses. Track and manage your finances with ease and accuracy.",
    action: "Record New Purchase",
    demo: "See How",
    href: "/purchases/purchase-orders",
    accent: "emerald",
    documentType: "Expenditure",
    brand: "GOOD CAFE",
  },
  {
    title: "Client Management",
    description:
      "Import all your clients to Refrens for a smooth sales workflow and faster follow-ups.",
    action: "Add New Client",
    demo: "See Demo Video",
    href: "/sales/clients",
    accent: "amber",
    documentType: "Client List",
    brand: "CONTACTS",
  },
  {
    title: "Lead Management",
    description:
      "Effortlessly import and organise all your leads for a clearer sales pipeline.",
    action: "Add New Lead",
    demo: "See Demo Video",
    href: "/sales-crm-and-leads",
    accent: "rose",
    documentType: "Lead Board",
    brand: "PIPELINE",
  },
  {
    title: "Refrens Forms",
    description:
      "Create and embed forms on your website and capture enquiries in one place.",
    action: "Create New Form",
    demo: "See How",
    href: "/workflows-and-automations",
    accent: "indigo",
    documentType: "Form",
    brand: "REFRENS",
  },
] as const;

const accentClasses = {
  violet: {
    frame: "bg-violet-50",
    band: "from-violet-100 to-fuchsia-50",
    line: "bg-violet-500",
    chip: "bg-violet-100 text-violet-700",
  },
  sky: {
    frame: "bg-sky-50",
    band: "from-sky-100 to-cyan-50",
    line: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700",
  },
  emerald: {
    frame: "bg-emerald-50",
    band: "from-emerald-100 to-teal-50",
    line: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    frame: "bg-amber-50",
    band: "from-amber-100 to-orange-50",
    line: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700",
  },
  rose: {
    frame: "bg-rose-50",
    band: "from-rose-100 to-pink-50",
    line: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
  },
  indigo: {
    frame: "bg-indigo-50",
    band: "from-indigo-100 to-blue-50",
    line: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-700",
  },
} as const;

type Accent = keyof typeof accentClasses;

async function getDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      business: {
        select: {
          id: true,
          name: true,
          brandName: true,
          memberships: {
            where: { status: "active" },
            select: { id: true },
          },
          invitations: {
            where: { status: "pending" },
            select: { id: true },
          },
        },
      },
      memberships: {
        where: { status: "active" },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          business: {
            select: {
              id: true,
              name: true,
              brandName: true,
              memberships: {
                where: { status: "active" },
                select: { id: true },
              },
              invitations: {
                where: { status: "pending" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  const business = user?.business ?? user?.memberships[0]?.business ?? null;

  return {
    user,
    organizationName: business?.brandName || business?.name || "your organisation",
    activeUsers: business?.memberships.length ?? 0,
    pendingInvites: business?.invitations.length ?? 0,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { user, organizationName, activeUsers, pendingInvites } =
    await getDashboardData(session.user.id);

  const displayName = user?.name || session.user.name || "there";
  const firstName = displayName.split(" ")[0] || displayName;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="mx-auto max-w-[1510px] px-6 py-10 sm:px-10 lg:px-14">
        <section className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="size-[76px] shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-[#eee5ff]">
                <UserRound className="size-12 fill-[#884ee8] text-[#884ee8]" />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-xl font-medium text-zinc-500">
                Hello {firstName}
              </p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900">
                Welcome to {organizationName}!
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
           

            {pendingInvites > 0 && (
              <div className="flex h-12 items-center rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-800">
                {pendingInvites} pending invite{pendingInvites === 1 ? "" : "s"}
              </div>
            )}

            <Link
              href="#"
              className="inline-flex h-12 items-center justify-center gap-3 rounded-lg bg-[#e9007f] px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#d00072]"
            >
              <CalendarDays className="size-5" />
              Book A Demo
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Getting Started
          </h2>

          <div className="mt-8 grid gap-8 xl:grid-cols-3 md:grid-cols-2">
            {gettingStartedCards.map((card) => (
              <GettingStartedCard key={card.title} {...card} />
            ))}
          </div>
        </section>
      </div>

      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 flex size-[68px] items-center justify-center rounded-full bg-[#7438dc] text-white shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle className="size-8 fill-white text-white" />
      </button>
    </div>
  );
}

function GettingStartedCard({
  title,
  description,
  action,
  demo,
  href,
  accent,
  documentType,
  brand,
}: {
  title: string;
  description: string;
  action: string;
  demo: string;
  href: string;
  accent: Accent;
  documentType: string;
  brand: string;
}) {
  return (
    <article className="flex min-h-[470px] flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-zinc-800">{title}</h3>
      <p className="mt-6 min-h-[64px] text-lg leading-7 text-zinc-500">
        {description}
      </p>

      <DocumentPreview
        accent={accent}
        documentType={documentType}
        brand={brand}
      />

      <Link
        href={href}
        className="mt-6 inline-flex h-12 items-center justify-center gap-3 rounded-lg border border-[#7438dc] px-4 text-lg font-semibold text-[#7438dc] transition-colors hover:bg-[#f5f0ff]"
      >
        <Plus className="size-5" />
        {action}
      </Link>

      <Link
        href="#"
        className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-800"
      >
        {demo}
        <ExternalLink className="size-3.5" />
      </Link>
    </article>
  );
}

function DocumentPreview({
  accent,
  documentType,
  brand,
}: {
  accent: Accent;
  documentType: string;
  brand: string;
}) {
  const classes = accentClasses[accent];

  return (
    <div
      className={`mt-5 flex h-[185px] items-center justify-center rounded-xl ${classes.frame} p-5`}
    >
      <div className="h-full w-full overflow-hidden rounded-lg bg-white shadow-[0_12px_30px_rgba(24,24,27,0.08)]">
        <div
          className={`h-7 bg-gradient-to-r ${classes.band} px-4 py-1.5 text-[10px] font-bold text-zinc-700`}
        >
          {documentType}
        </div>
        <div className="grid h-[calc(100%-1.75rem)] grid-cols-[1fr_112px] gap-4 p-4">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <div className={`h-2 w-12 rounded-full ${classes.line}`} />
              <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${classes.chip}`}>
                {brand}
              </span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-28 rounded-full bg-zinc-200" />
              <div className="h-2 w-36 rounded-full bg-zinc-100" />
              <div className="h-2 w-24 rounded-full bg-zinc-100" />
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              <div className="h-2 rounded-full bg-zinc-200" />
              <div className="h-2 rounded-full bg-zinc-200" />
              <div className="h-2 rounded-full bg-zinc-200" />
              <div className="h-2 rounded-full bg-zinc-200" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2 rounded-full bg-zinc-100" />
              <div className="h-2 rounded-full bg-zinc-100" />
              <div className="h-2 w-2/3 rounded-full bg-zinc-100" />
            </div>
          </div>

          <div className="rounded-md bg-zinc-50 p-3">
            <div className="h-2 w-16 rounded-full bg-zinc-200" />
            <div className="mt-3 space-y-2">
              <div className="h-2 rounded-full bg-zinc-100" />
              <div className="h-2 rounded-full bg-zinc-100" />
              <div className="h-2 w-2/3 rounded-full bg-zinc-100" />
            </div>
            <div className={`mt-6 h-6 rounded ${classes.line} opacity-20`} />
          </div>
        </div>
      </div>
    </div>
  );
}
