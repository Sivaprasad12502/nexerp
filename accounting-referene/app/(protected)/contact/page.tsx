"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Funnel,
  MessageCircle,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from "lucide-react";

const contact = {
  firstName: "Raju",
  lastName: "KR",
  phone: "+91 99324 57258",
  secondaryPhone: "-",
  email: "raju@gmail.com",
  secondaryEmail: "-",
  country: "India",
  createdAt: "May 22 12:35 PM",
};

export default function ContactPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(false);
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);

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
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Contacts</h1>
              <Sun className="size-5 text-amber-400" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-pink-600 px-6 text-base font-semibold text-white transition-colors hover:bg-pink-700"
          >
            <Plus className="size-5" />
            Create New
          </button>
        </div>
      </div>

      {isCreating ? (
        <CreateContactForm
          showSecondaryEmail={showSecondaryEmail}
          showSecondaryPhone={showSecondaryPhone}
          onShowSecondaryEmail={() => setShowSecondaryEmail(true)}
          onShowSecondaryPhone={() => setShowSecondaryPhone(true)}
        />
      ) : (
        <ContactsTable />
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

function ContactsTable() {
  return (
    <div className="mt-4 rounded-md bg-white px-10 py-10 shadow-sm ring-1 ring-zinc-100">
      <div className="flex border-b border-zinc-200">
        {["Active Contacts", "Inactive Contacts", "Deleted Contacts"].map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={`h-12 px-0 text-base font-medium ${
              index === 0
                ? "border-b-2 border-[#7438dc] text-[#7438dc]"
                : "ml-8 text-zinc-600 hover:text-zinc-950"
            }`}
          >
            {tab}
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
          <button type="button" className="inline-flex items-center gap-2 text-zinc-700">
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
          Showing <span className="font-semibold text-zinc-950">1</span> to{" "}
          <span className="font-semibold text-zinc-950">1</span> of{" "}
          <span className="font-semibold text-zinc-950">1</span> contacts
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
        <table className="min-w-[1200px] w-full border-collapse text-left text-base">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <Th className="w-14">
                <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
              </Th>
              <Th className="w-12" />
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
            <tr className="border-t border-zinc-100 text-zinc-950">
              <td className="px-3 py-5">
                <span className="block size-5 rounded-md border border-zinc-200 bg-zinc-100" />
              </td>
              <td className="px-3 py-5">1</td>
              <td className="px-3 py-5">{contact.firstName}</td>
              <td className="px-3 py-5">{contact.lastName}</td>
              <td className="px-3 py-5">{contact.phone}</td>
              <td className="px-3 py-5">{contact.secondaryPhone}</td>
              <td className="px-3 py-5 underline underline-offset-2">{contact.email}</td>
              <td className="px-3 py-5">{contact.secondaryEmail}</td>
              <td className="px-3 py-5">{contact.country}</td>
              <td className="px-3 py-5">{contact.createdAt}</td>
              <td className="px-3 py-5">
                <div className="flex items-center justify-end gap-5 text-zinc-700">
                  <button type="button" className="flex flex-col items-center gap-1">
                    <Eye className="size-5" />
                    View
                  </button>
                  <button type="button" className="flex flex-col items-center gap-1">
                    <MoreHorizontal className="size-5" />
                    More
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-3 py-4 font-medium ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {typeof children === "string" && <Funnel className="size-4 fill-zinc-300 text-zinc-300" />}
      </span>
    </th>
  );
}

function CreateContactForm({
  showSecondaryEmail,
  showSecondaryPhone,
  onShowSecondaryEmail,
  onShowSecondaryPhone,
}: {
  showSecondaryEmail: boolean;
  showSecondaryPhone: boolean;
  onShowSecondaryEmail: () => void;
  onShowSecondaryPhone: () => void;
}) {
  const [taxOpen, setTaxOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  return (
    <div className="mt-4 bg-white">
      <form className="mx-auto max-w-[820px] px-6 py-10">
        <div>
          <label className="text-sm font-medium text-zinc-950">Display Picture</label>
          <button
            type="button"
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-medium text-zinc-950"
          >
            <Upload className="size-4" />
            Upload From Computer
          </button>
        </div>

        <div className="mt-8 grid gap-x-4 gap-y-7 md:grid-cols-2">
          <div>
            <Label required>First Name</Label>
            <div className="mt-2 flex">
              <div className="flex h-10 w-24 items-center justify-between rounded-l-md border border-r-0 border-zinc-200 px-3 text-sm text-zinc-700">
                Mr.
                <X className="size-4 text-zinc-400" />
              </div>
              <Input className="!mt-0 rounded-l-none" placeholder="First Name" />
            </div>
          </div>

          <Field label="Last Name" placeholder="Last Name" />
          <Field label="Email" placeholder="example@email.com" type="email" />

          <div>
            <Label>Phone</Label>
            <div className="mt-2 flex">
              <div className="flex h-10 items-center gap-2 rounded-l-md border border-r-0 border-zinc-200 px-3 text-sm text-zinc-700">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <Input className="!mt-0 rounded-l-none" type="tel" />
            </div>
          </div>

          <div>
            <Label required>Country</Label>
            <select className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc]">
              <option>India</option>
            </select>
          </div>

          <Field label="Contact ID" required />

          {showSecondaryEmail && (
            <Field label="Secondary Email" placeholder="secondary@email.com" type="email" />
          )}
          {showSecondaryPhone && (
            <div>
              <Label>Secondary Phone</Label>
              <div className="mt-2 flex">
                <div className="flex h-10 items-center gap-2 rounded-l-md border border-r-0 border-zinc-200 px-3 text-sm text-zinc-700">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <Input className="!mt-0 rounded-l-none" type="tel" />
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

        <SectionTitle
          title="Tax Information"
          open={taxOpen}
          onToggle={() => setTaxOpen((open) => !open)}
        />
        {taxOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-7 md:grid-cols-2">
            <Field label="PAN Number" />
            <Field label="Aadhaar Number" />
            <Field label="Passport Number" />
          </div>
        )}

        <SectionTitle
          title="Social Profiles"
          open={socialOpen}
          onToggle={() => setSocialOpen((open) => !open)}
        />
        {socialOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-7 md:grid-cols-2">
            <Field label="LinkedIn URL" placeholder="https://linkedin.com/in/username" type="url" />
            <Field label="X URL" placeholder="https://x.com/username" type="url" />
            <Field label="Facebook URL" placeholder="https://facebook.com/username" type="url" />
            <Field label="GitHub URL" placeholder="https://github.com/username" type="url" />
          </div>
        )}

        <SectionTitle
          title="Address Details"
          open={addressOpen}
          onToggle={() => setAddressOpen((open) => !open)}
        />
        {addressOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-7 md:grid-cols-2">
            <div>
              <Label required>Country</Label>
              <select className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc]">
                <option>India</option>
              </select>
            </div>
            <Field label="State/Province" />
            <Field label="City/Town" />
            <Field label="District" />
            <Field label="Building" />
            <Field label="Postal Code" />
            <Field label="Zip Code" />
            <Field label="Street" />
          </div>
        )}

        <button
          type="button"
          className="mt-8 h-10 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2]"
        >
          Save
        </button>
      </form>
    </div>
  );
}

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
      <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function Field({
  label,
  required = false,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <Input placeholder={placeholder} type={type} />
    </div>
  );
}

function Label({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-zinc-950">
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Input({
  className = "",
  placeholder,
  type = "text",
}: {
  className?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] ${className}`}
    />
  );
}
