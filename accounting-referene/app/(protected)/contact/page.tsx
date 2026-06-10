"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Funnel,
  Link2,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LinkClientSidebar } from "@/components/contact/link-client-sidebar";
import { ViewContactDrawer } from "@/components/contact/view-contact-drawer";
import {
  contactCreateSchema,
  type ContactCreateInput,
} from "@/lib/validations/contact";
import { uploadFile } from "@/lib/upload";

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string;
  prefix: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  secondaryEmail: string | null;
  country: string;
  contactCode: string | null;
  image: string | null;
  createdAt: string;
};

type TabStatus = "ACTIVE" | "INACTIVE" | "DELETED";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(false);
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);

  const showingForm = isCreating || editingContact !== null;

  function closeForm() {
    setIsCreating(false);
    setEditingContact(null);
    setShowSecondaryEmail(false);
    setShowSecondaryPhone(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="rounded-md bg-white px-10 py-8 shadow-sm ring-1 ring-zinc-100">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>Dashboard</span>
              <ChevronRight className="size-4" />
              <span>Contacts</span>
              <ChevronRight className="size-4" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                Contacts
              </h1>
              <Sun className="size-5 text-amber-400" />
            </div>
          </div>

          {!showingForm && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-pink-600 px-6 text-base font-semibold text-white transition-colors hover:bg-pink-700"
            >
              <Plus className="size-5" />
              Create New
            </button>
          )}
        </div>
      </div>

      {showingForm ? (
        <CreateContactForm
          initialData={editingContact}
          showSecondaryEmail={
            showSecondaryEmail || !!editingContact?.secondaryEmail
          }
          showSecondaryPhone={
            showSecondaryPhone || !!editingContact?.secondaryPhone
          }
          onShowSecondaryEmail={() => setShowSecondaryEmail(true)}
          onShowSecondaryPhone={() => setShowSecondaryPhone(true)}
          onCancel={closeForm}
          onSaved={closeForm}
        />
      ) : (
        <ContactsTable onEdit={(c) => setEditingContact(c)} />
      )}

      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 flex size-16 items-center justify-center rounded-full bg-[#7438dc] text-white shadow-lg transition-colors hover:bg-[#6330c2]"
      >
        <MessageCircle className="size-8 fill-white/90" />
      </button>
    </div>
  );
}

// ─── Contacts Table ───────────────────────────────────────────────────────────

function ContactsTable({ onEdit }: { onEdit: (c: Contact) => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>("ACTIVE");
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);
  const [viewContact, setViewContact] = useState<Contact | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [linkContact, setLinkContact] = useState<Contact | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "ACTIVE" | "INACTIVE";
    }) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update contact");
      return status;
    },
    onSuccess: (status) => {
      toast.success(
        status === "INACTIVE"
          ? "Contact marked as inactive"
          : "Contact marked as active",
      );
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string)=>{
      const res=await fetch(`/api/contacts/${id}`,{
        method: "DELETE",
      })
      if(!res.ok) throw new Error("Failed to delete contact");
      return res.json()
    },
    onSuccess:()=>{
      toast.success("Contact deleted successfully");
      qc.invalidateQueries({ queryKey: ["contacts"]});
    },
    onError:(e:Error)=> toast.error(e.message)
  })

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?status=${activeTab}`);
      if (!res.ok) throw new Error("Failed to load contacts");
      return res.json() as Promise<{ contacts: Contact[] }>;
    },
  });

  const contacts = data?.contacts ?? [];

  const tabs: { label: string; value: TabStatus }[] = [
    { label: "Active Contacts", value: "ACTIVE" },
    { label: "Inactive Contacts", value: "INACTIVE" },
    { label: "Deleted Contacts", value: "DELETED" },
  ];

  return (
    <>
      <div className="mt-4 rounded-md bg-white px-10 py-10 shadow-sm ring-1 ring-zinc-100">
        <div className="flex border-b border-zinc-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`h-12 px-0 text-base font-medium transition-colors first:mr-0 not-first:ml-8 ${
                activeTab === tab.value
                  ? "border-b-2 border-[#7438dc] text-[#7438dc]"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            <Download className="size-5 text-zinc-500" />
            Download CSV
          </button>
        </div>

        <div className="mt-8 rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-base">
            <button
              type="button"
              className="inline-flex items-center gap-2 font-semibold text-zinc-950"
            >
              <ChevronDown className="size-5" />
              Filters
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-zinc-700"
            >
              <X className="size-5" />
              Clear All Filters
            </button>
          </div>
          <div className="mt-6 bg-zinc-50 px-4 py-6 text-base font-medium text-zinc-950">
            Applied Filters
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-zinc-600">
            Showing{" "}
            <span className="font-semibold text-zinc-950">
              {isLoading ? "…" : contacts.length}
            </span>{" "}
            contact{contacts.length !== 1 ? "s" : ""}
          </p>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            <SlidersHorizontal className="size-4 text-[#7438dc]" />
            Show/Hide Columns
          </button>
        </div>

        <div className="mt-6 overflow-x-auto border border-zinc-100">
          <table className="min-w-300 w-full border-collapse text-left text-base">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <Th className="w-14">
                  <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
                </Th>
                <Th className="w-12" />
                <Th className="w-16" />
                <Th>First Name</Th>
                <Th>Last Name</Th>
                <Th>Phone</Th>
                <Th>Secondary Phone</Th>
                <Th>Email</Th>
                <Th>Secondary Email</Th>
                <Th>Country</Th>
                <Th>Created At</Th>
                <Th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-10 text-center text-zinc-400"
                  >
                    <Loader2 className="mx-auto size-6 animate-spin" />
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-10 text-center text-zinc-400"
                  >
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-t border-zinc-100 text-zinc-950"
                  >
                    <td className="px-3 py-5">
                      <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
                    </td>
                    <td className="px-3 py-5 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-5">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.firstName}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                          <UserRound className="size-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-5">
                      {c.prefix ? `${c.prefix} ` : ""}
                      {c.firstName}
                    </td>
                    <td className="px-3 py-5">{c.lastName ?? "-"}</td>
                    <td className="px-3 py-5">{c.phone ?? "-"}</td>
                    <td className="px-3 py-5">{c.secondaryPhone ?? "-"}</td>
                    <td className="px-3 py-5 underline underline-offset-2">
                      {c.email ?? "-"}
                    </td>
                    <td className="px-3 py-5">{c.secondaryEmail ?? "-"}</td>
                    <td className="px-3 py-5">{c.country}</td>
                    <td className="px-3 py-5">
                      {new Date(c.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-5">
                      <div className="flex items-center justify-end gap-5 text-zinc-700">
                        <button
                          type="button"
                          onClick={() => {
                            setViewContact(c);
                            setViewOpen(true);
                          }}
                          className="flex flex-col items-center gap-1 text-xs"
                        >
                          <Eye className="size-5" />
                          View
                        </button>
                        <MoreMenu
                          contact={c}
                          activeTab={activeTab}
                          // open={openMoreId === c.id}
                          // onToggle={() =>
                          //   setOpenMoreId(openMoreId === c.id ? null : c.id)
                          // }
                          // onClose={() => setOpenMoreId(null)}
                          onView={() => {
                            setViewContact(c);
                            setViewOpen(true);
                            setOpenMoreId(null);
                          }}
                          onEdit={() => {
                            onEdit(c);
                            setOpenMoreId(null);
                          }}
                          onDelete={()=>{
                            if(confirm("Are you sure you want to delete this contact?")){
                              deleteContact.mutate(c.id);
                            }
                          }}
                          onLinkClient={() => {
                            setLinkContact(c);
                            setSidebarOpen(true);
                            setOpenMoreId(null);
                          }}
                          onToggleStatus={() => {
                            const next =
                              activeTab === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                            updateStatus.mutate({ id: c.id, status: next });
                            setOpenMoreId(null);
                          }}
                          statusPending={updateStatus.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Contact drawer */}
      <ViewContactDrawer
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewContact(null);
        }}
        contact={viewContact}
      />

      {/* Link Client slide-in sidebar */}
      <LinkClientSidebar
        open={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          setLinkContact(null);
        }}
        contact={linkContact}
      />
    </>
  );
}

// ─── More dropdown ───────────────────────────────────────────────────────────

type MoreMenuContact = {
  id: string;
  firstName: string;
  lastName?: string | null;
};

function MoreMenu({
  activeTab,
  onView,
  onEdit,
  onDelete,
  onLinkClient,
  onToggleStatus,
  statusPending,
}: {
  contact: MoreMenuContact;
  activeTab: TabStatus;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinkClient: () => void;
  onToggleStatus: () => void;
  statusPending: boolean;
}) {
  const statusLabel =
    activeTab === "ACTIVE"
      ? statusPending
        ? "Updating..."
        : "Mark as Inactive"
      : statusPending
        ? "Updating..."
        : "Mark as Active";

  const items = [
    { label: "View", icon: Eye, onClick: onView },
    { label: "Link Client", icon: Link2, onClick: onLinkClient },
    { label: "Edit", icon: Pencil, onClick: onEdit ,hidden: activeTab === "DELETED"},
    {
      label: statusLabel,
      icon: Ban,
      onClick: onToggleStatus,
      disabled: statusPending,
      hidden: activeTab === "DELETED"
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: onDelete,
      danger: true,
      hidden: activeTab === "DELETED",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-1 text-xs"
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        {items.filter((item)=>!item.hidden).map(
          ({ label, icon: Icon, onClick, disabled, danger }) => (
            <DropdownMenuItem
              key={label}
              onClick={onClick}
              disabled={disabled}
              className={
                danger
                  ? "text-red-500 focus:text-red-500"
                  : ""
              }
            >
              <Icon className="mr-2 size-4" />
              {label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Th ───────────────────────────────────────────────────────────────────────

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`whitespace-nowrap px-3 py-4 font-medium ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {typeof children === "string" && (
          <Funnel className="size-4 fill-zinc-300 text-zinc-300" />
        )}
      </span>
    </th>
  );
}

// ─── Create Contact Form ──────────────────────────────────────────────────────

function CreateContactForm({
  initialData,
  showSecondaryEmail,
  showSecondaryPhone,
  onShowSecondaryEmail,
  onShowSecondaryPhone,
  onCancel,
  onSaved,
}: {
  initialData?: Contact | null;
  showSecondaryEmail: boolean;
  showSecondaryPhone: boolean;
  onShowSecondaryEmail: () => void;
  onShowSecondaryPhone: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initialData;
  const qc = useQueryClient();
  const [taxOpen, setTaxOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image ?? null,
  );
  const [imageUploading, setImageUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContactCreateInput>({
    resolver: zodResolver(contactCreateSchema),
    defaultValues: initialData
      ? {
          prefix: initialData.prefix ?? "",
          firstName: initialData.firstName,
          lastName: initialData.lastName ?? "",
          email: initialData.email ?? "",
          phone: initialData.phone ?? "",
          country: initialData.country,
          contactCode: initialData.contactCode ?? "",
          secondaryEmail: initialData.secondaryEmail ?? "",
          secondaryPhone: initialData.secondaryPhone ?? "",
          image: initialData.image ?? "",
        }
      : { country: "India" },
  });

  const save = useMutation({
    mutationFn: async (data: ContactCreateInput) => {
      const url = isEdit ? `/api/contacts/${initialData!.id}` : "/api/contacts";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save contact");
      return body;
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Contact updated successfully"
          : "Contact created successfully",
      );
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const url = await uploadFile(file);
      setValue("image", url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <div className="mt-4 bg-white">
      <form
        className="mx-auto max-w-205 px-6 py-10"
        onSubmit={handleSubmit((data) => save.mutate(data))}
      >
        {/* Display Picture */}
        <div>
          <label className="text-sm font-medium text-zinc-950">
            Display Picture
          </label>
          <div className="mt-3 flex items-center gap-4">
            {imagePreview ? (
              <div className="relative size-16 shrink-0">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="size-16 rounded-full object-cover ring-2 ring-zinc-200"
                />
                {imageUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                    <Loader2 className="size-5 animate-spin text-[#7438dc]" />
                  </div>
                )}
              </div>
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                <UserRound className="size-8" />
              </span>
            )}
            <button
              type="button"
              disabled={imageUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {imageUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload From Computer
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-x-4 gap-y-7 md:grid-cols-2">
          {/* First Name with prefix */}
          <div>
            <Label required>First Name</Label>
            <div className="mt-2 flex">
              <select
                {...register("prefix")}
                className="h-10 w-24 shrink-0 rounded-l-md border border-r-0 border-zinc-200 bg-white px-2 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
              >
                <option value="">–</option>
                {["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                {...register("firstName")}
                placeholder="First Name"
                className="mt-0 h-10 w-full rounded-r-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <ControlledField
            label="Last Name"
            placeholder="Last Name"
            register={register("lastName")}
          />
          <ControlledField
            label="Email"
            placeholder="example@email.com"
            type="email"
            register={register("email")}
            error={errors.email?.message}
          />

          {/* Phone */}
          <div>
            <Label>Phone</Label>
            <div className="mt-2 flex">
              <div className="flex h-10 items-center gap-2 rounded-l-md border border-r-0 border-zinc-200 px-3 text-sm text-zinc-700">
                <span>🇦🇪</span>
                <span>+971</span>
              </div>
              <input
                {...register("phone")}
                type="tel"
                className="mt-0 h-10 w-full rounded-r-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <Label required>Country</Label>
            <select
              {...register("country")}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc]"
            >
              <option>India</option>
              <option>United Arab Emirates</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
            {errors.country && (
              <p className="mt-1 text-xs text-red-500">
                {errors.country.message}
              </p>
            )}
          </div>

          <ControlledField
            label="Contact ID"
            register={register("contactCode")}
          />

          {showSecondaryEmail && (
            <ControlledField
              label="Secondary Email"
              placeholder="secondary@email.com"
              type="email"
              register={register("secondaryEmail")}
              error={errors.secondaryEmail?.message}
            />
          )}
          {showSecondaryPhone && (
            <div>
              <Label>Secondary Phone</Label>
              <div className="mt-2 flex">
                <div className="flex h-10 items-center gap-2 rounded-l-md border border-r-0 border-zinc-200 px-3 text-sm text-zinc-700">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  {...register("secondaryPhone")}
                  type="tel"
                  className="mt-0 h-10 w-full rounded-r-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-7 flex flex-wrap gap-5">
          {!showSecondaryEmail && (
            <button
              type="button"
              onClick={onShowSecondaryEmail}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#7438dc]"
            >
              <Plus className="size-4" />
              Add Secondary Email
            </button>
          )}
          {!showSecondaryPhone && (
            <button
              type="button"
              onClick={onShowSecondaryPhone}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#7438dc]"
            >
              <Plus className="size-4" />
              Add Secondary Phone
            </button>
          )}
        </div>

        {/* Tax Information */}
        <SectionTitle
          title="Tax Information"
          open={taxOpen}
          onToggle={() => setTaxOpen((o) => !o)}
        />
        {taxOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-7 md:grid-cols-2">
            <ControlledField
              label="PAN Number"
              register={register("panNumber")}
            />
            <ControlledField
              label="Aadhaar Number"
              register={register("aadhaarNumber")}
            />
            <ControlledField
              label="Passport Number"
              register={register("passportNumber")}
            />
          </div>
        )}

        {/* Social Profiles */}
        <SectionTitle
          title="Social Profiles"
          open={socialOpen}
          onToggle={() => setSocialOpen((o) => !o)}
        />
        {socialOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-7 md:grid-cols-2">
            <ControlledField
              label="LinkedIn URL"
              placeholder="https://linkedin.com/in/username"
              type="url"
              register={register("linkedinUrl")}
              error={errors.linkedinUrl?.message}
            />
            <ControlledField
              label="X URL"
              placeholder="https://x.com/username"
              type="url"
              register={register("xUrl")}
              error={errors.xUrl?.message}
            />
            <ControlledField
              label="Facebook URL"
              placeholder="https://facebook.com/username"
              type="url"
              register={register("facebookUrl")}
              error={errors.facebookUrl?.message}
            />
            <ControlledField
              label="GitHub URL"
              placeholder="https://github.com/username"
              type="url"
              register={register("githubUrl")}
              error={errors.githubUrl?.message}
            />
          </div>
        )}

        {/* Address Details */}
        <SectionTitle
          title="Address Details"
          open={addressOpen}
          onToggle={() => setAddressOpen((o) => !o)}
        />
        {addressOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-7 md:grid-cols-2">
            <div>
              <Label>Country</Label>
              <select
                {...register("addressCountry")}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc]"
              >
                <option value="">Select country…</option>
                <option>India</option>
                <option>United Arab Emirates</option>
                <option>United States</option>
                <option>United Kingdom</option>
              </select>
            </div>
            <ControlledField
              label="State/Province"
              register={register("state")}
            />
            <ControlledField label="City/Town" register={register("city")} />
            <ControlledField label="District" register={register("district")} />
            <ControlledField label="Building" register={register("building")} />
            <ControlledField
              label="Postal Code"
              register={register("postalCode")}
            />
            <ControlledField label="Zip Code" register={register("zipCode")} />
            <ControlledField label="Street" register={register("street")} />
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={save.isPending || imageUploading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2] disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionTitle({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-8 flex w-full items-center justify-between text-left text-lg font-medium text-zinc-950"
    >
      {title}
      <ChevronDown
        className={`size-5 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function ControlledField({
  label,
  required = false,
  placeholder,
  type = "text",
  register,
  error,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  register: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input
        {...register}
        type={type}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Label({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-zinc-950">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}
