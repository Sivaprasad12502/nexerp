import type { ReactNode } from "react";
import type { QuotationLayoutProps } from "./types";
import { BankUpiFooter } from "./bank-upi-footer";
import {
  AmountInWordsBlock,
  CustomFieldsBlock,
  DocumentNotesSection,
  SplitFooter,
} from "./document-sections";
import { ItemsTable } from "./items-table";
import { PartyBoxes } from "./party-boxes";
import {
  ClassicQuotationHeader,
  ModernQuotationHeader,
  ProfessionalQuotationHeader,
  SimpleQuotationHeader,
} from "./quotation-headers";
import { TotalsBlock } from "./totals-block";

function ProfessionalLayout(props: QuotationLayoutProps) {
  const { q, settings, bs, themeColor, documentLabel, totals, fmt } = props;
  return (
    <>
      <ProfessionalQuotationHeader
        q={q}
        settings={settings}
        bs={bs}
        themeColor={themeColor}
        documentLabel={documentLabel}
      />
      <PartyBoxes q={q} themeColor={themeColor} variant="tinted" />
      <CustomFieldsBlock q={q} />
      <ItemsTable q={q} settings={settings} themeColor={themeColor} fmt={fmt} />
      <SplitFooter
        q={q}
        settings={settings}
        bs={bs}
        totals={totals}
        themeColor={themeColor}
        fmt={fmt}
      />
      <AmountInWordsBlock q={q} totalAmount={totals.totalAmount} />
      <DocumentNotesSection q={q} settings={settings} bs={bs} />
    </>
  );
}

function ModernLayout(props: QuotationLayoutProps) {
  const { q, settings, bs, themeColor, documentLabel, totals, fmt } = props;
  return (
    <>
      <ModernQuotationHeader
        q={q}
        settings={settings}
        bs={bs}
        themeColor={themeColor}
        documentLabel={documentLabel}
      />
      <CustomFieldsBlock q={q} />
      <ItemsTable q={q} settings={settings} themeColor={themeColor} fmt={fmt} />
      <SplitFooter
        q={q}
        settings={settings}
        bs={bs}
        totals={totals}
        themeColor={themeColor}
        fmt={fmt}
      />
      <AmountInWordsBlock q={q} totalAmount={totals.totalAmount} />
      <DocumentNotesSection q={q} settings={settings} bs={bs} />
    </>
  );
}

function SimpleLayout(props: QuotationLayoutProps) {
  const { q, settings, bs, themeColor, documentLabel, totals, fmt } = props;
  return (
    <>
      <SimpleQuotationHeader
        q={q}
        settings={settings}
        bs={bs}
        documentLabel={documentLabel}
      />
      <PartyBoxes
        q={q}
        themeColor={themeColor}
        leftLabel="Billed By"
        rightLabel="Buyer"
        variant="simple"
      />
      <CustomFieldsBlock q={q} />
      <ItemsTable
        q={q}
        settings={settings}
        themeColor={themeColor}
        fmt={fmt}
        variant="simple"
      />
      <div className="mt-4 flex justify-end">
        <TotalsBlock q={q} totals={totals} themeColor={themeColor} fmt={fmt} />
      </div>
      <AmountInWordsBlock q={q} totalAmount={totals.totalAmount} />
      <BankUpiFooter settings={settings} bs={bs} themeColor={themeColor} />
      <DocumentNotesSection q={q} settings={settings} bs={bs} />
    </>
  );
}

function ClassicLayout(props: QuotationLayoutProps) {
  const { q, settings, bs, themeColor, documentLabel, totals, fmt } = props;
  return (
    <>
      <ClassicQuotationHeader
        q={q}
        settings={settings}
        bs={bs}
        themeColor={themeColor}
        documentLabel={documentLabel}
      />
      <PartyBoxes
        q={q}
        themeColor={themeColor}
        leftLabel={`${documentLabel} From`}
        rightLabel={`${documentLabel} For`}
        variant="bordered"
      />
      <CustomFieldsBlock q={q} />
      <ItemsTable q={q} settings={settings} themeColor={themeColor} fmt={fmt} />
      <div className="mt-4 flex justify-end">
        <TotalsBlock q={q} totals={totals} themeColor={themeColor} fmt={fmt} />
      </div>
      <AmountInWordsBlock q={q} totalAmount={totals.totalAmount} />
      <BankUpiFooter settings={settings} bs={bs} themeColor={themeColor} />
      <DocumentNotesSection q={q} settings={settings} bs={bs} />
    </>
  );
}

const LAYOUTS: Record<
  QuotationLayoutProps["settings"]["template"],
  (props: QuotationLayoutProps) => ReactNode
> = {
  professional: ProfessionalLayout,
  modern: ModernLayout,
  simple: SimpleLayout,
  classic: ClassicLayout,
};

export function QuotationDocumentLayout(props: QuotationLayoutProps) {
  const Layout = LAYOUTS[props.settings.template] ?? ProfessionalLayout;
  return <Layout {...props} />;
}
