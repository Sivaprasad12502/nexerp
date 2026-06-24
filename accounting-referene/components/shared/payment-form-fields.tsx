/** Shared payment form UI helpers (client-safe). */

export function currencySymbol(currency: string): string {
  const m = currency.match(/[₹$€£¥₦₩]/);
  if (m) return m[0];
  const m2 = currency.match(/\(([^,)]+)/);
  if (m2) return m2[1];
  if (currency === "INR" || currency.toLowerCase().includes("rupee")) return "₹";
  return currency.slice(0, 3);
}

export function FormField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm text-zinc-600">{label}</label>
      {children}
    </div>
  );
}

export function NumInput({
  symbol,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  symbol: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-zinc-300 focus-within:border-[#7438dc] focus-within:ring-1 focus-within:ring-[#7438dc]">
      <span className="border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        {symbol}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm text-zinc-900 outline-none read-only:bg-zinc-50 read-only:text-zinc-500"
      />
    </div>
  );
}

export const METHOD_LABELS: Record<string, string> = {
  ACCOUNT_TRANSFER: "Account Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

/** Encode/decode TDS and notes in tags array (no schema migration). */
export function tagsFromExtras(notes: string, tdsWithheld: number): string[] {
  const tags: string[] = [];
  if (tdsWithheld > 0) tags.push(`tds:${tdsWithheld}`);
  if (notes.trim()) tags.push(`note:${notes.trim()}`);
  return tags;
}

export function parseLineTags(tags: string[]) {
  let tdsWithheld = 0;
  let notes = "";
  const displayTags: string[] = [];
  for (const t of tags) {
    if (t.startsWith("tds:")) {
      tdsWithheld = parseFloat(t.slice(4)) || 0;
    } else if (t.startsWith("note:")) {
      notes = t.slice(5);
    } else if (t.trim()) {
      displayTags.push(t);
    }
  }
  return { tdsWithheld, notes, displayTags };
}
