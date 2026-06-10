"use client";

import { useEffect, useState } from "react";
import { Copy, Pencil, Phone, X } from "lucide-react";

type Contact = {
  id: string;
  prefix: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  country: string;
  contactCode: string | null;
  image: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  passportNumber?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  facebookUrl?: string | null;
  githubUrl?: string | null;
  addressCountry?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  building?: string | null;
  postalCode?: string | null;
  zipCode?: string | null;
  street?: string | null;
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function initials(c: Contact) {
  return `${c.firstName[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase();
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="w-48 shrink-0 text-sm text-zinc-400">{label}</span>
      <span className="text-sm text-zinc-900">{value || "-"}</span>
    </div>
  );
}

export function ViewContactDrawer({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
}) {
  const [tab, setTab] = useState<"details" | "clients">("details");

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

  // Reset tab when a new contact opens
  useEffect(() => {
    if (open) setTab("details");
  }, [open, contact?.id]);

  if (!contact) return null;

  const fullName = [contact.prefix, contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

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
        aria-label="View Contact"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-950">View Contact</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Edit"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-center gap-4">
            {contact.image ? (
              <img
                src={contact.image}
                alt={contact.firstName}
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-zinc-700 text-xl font-semibold text-white">
                {initials(contact)}
              </span>
            )}
            <div>
              <p className="text-xl font-semibold text-zinc-950">{fullName}</p>
              {contact.email && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(contact.email!)}
                  className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
                >
                  {contact.email}
                  <Copy className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {contact.phone && (
            <button
              type="button"
              onClick={() => copyToClipboard(contact.phone!)}
              className="mt-4 flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
            >
              <Phone className="size-4 text-zinc-400" />
              <span className="text-zinc-400">Phone -</span>
              <span>{contact.phone}</span>
              <Copy className="size-3.5 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 px-6">
          {(["details", "clients"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-11 px-0 text-sm font-medium transition-colors first:mr-6 ${
                tab === t
                  ? "border-b-2 border-[#7438dc] text-[#7438dc]"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              {t === "details" ? "Contact Details" : "Clients"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {tab === "details" ? (
            <div>
              <div className="divide-y divide-zinc-100">
                <FieldRow label="Salutation" value={contact.prefix} />
                <FieldRow label="First Name" value={contact.firstName} />
                <FieldRow label="Last Name" value={contact.lastName} />
                <FieldRow label="Secondary Email" value={contact.secondaryEmail} />
                <FieldRow label="Alternate Email" value={null} />
                <FieldRow label="Secondary Phone" value={contact.secondaryPhone} />
                <FieldRow label="Alternate Phone" value={null} />
                <FieldRow label="Country" value={contact.country} />
                {contact.contactCode && (
                  <FieldRow label="Contact ID" value={contact.contactCode} />
                )}
              </div>

              <p className="mt-6 text-sm font-bold text-zinc-950">Tax Information</p>
              <div className="mt-1 divide-y divide-zinc-100">
                <FieldRow label="Aadhaar Number" value={contact.aadhaarNumber} />
                <FieldRow label="PAN Number" value={contact.panNumber} />
                <FieldRow label="Passport Number" value={contact.passportNumber} />
              </div>

              {(contact.linkedinUrl || contact.xUrl || contact.facebookUrl || contact.githubUrl) && (
                <>
                  <p className="mt-6 text-sm font-bold text-zinc-950">Social Profiles</p>
                  <div className="mt-1 divide-y divide-zinc-100">
                    {contact.linkedinUrl && <FieldRow label="LinkedIn" value={contact.linkedinUrl} />}
                    {contact.xUrl && <FieldRow label="X" value={contact.xUrl} />}
                    {contact.facebookUrl && <FieldRow label="Facebook" value={contact.facebookUrl} />}
                    {contact.githubUrl && <FieldRow label="GitHub" value={contact.githubUrl} />}
                  </div>
                </>
              )}

              {(contact.addressCountry || contact.state || contact.city) && (
                <>
                  <p className="mt-6 text-sm font-bold text-zinc-950">Address</p>
                  <div className="mt-1 divide-y divide-zinc-100">
                    <FieldRow label="Country" value={contact.addressCountry} />
                    <FieldRow label="State/Province" value={contact.state} />
                    <FieldRow label="District" value={contact.district} />
                    <FieldRow label="City/Town" value={contact.city} />
                    <FieldRow label="Building" value={contact.building} />
                    <FieldRow label="Postal Code" value={contact.postalCode} />
                    <FieldRow label="Zip Code" value={contact.zipCode} />
                    <FieldRow label="Street" value={contact.street} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <p className="text-sm">No clients linked yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
