import nodemailer from "nodemailer";

/**
 * SMTP is optional. When the SMTP_* env vars are not configured, email sending
 * is skipped and callers fall back to showing the invite link in the UI.
 */
function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

type InviteEmailArgs = {
  to: string;
  inviteUrl: string;
  businessName: string;
  roleName: string;
  inviterName?: string | null;
};

type QuotationEmailArgs = {
  to: string;
  cc?: string[];
  replyTo?: string;
  subject: string;
  message: string;
  approvalUrl: string;
  businessName: string;
};

/** Returns true if an email was actually dispatched. Never throws. */
export async function sendQuotationEmail(args: QuotationEmailArgs): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, cc, replyTo, subject, message, approvalUrl, businessName } = args;

  // Convert plain-text message to simple HTML (preserve line breaks)
  const bodyHtml = message
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px 0;color:#444">${line || "&nbsp;"}</p>`)
    .join("");

  try {
    await transport.sendMail({
      from,
      to,
      ...(cc && cc.length > 0 && { cc }),
      ...(replyTo && { replyTo }),
      subject,
      text:
        message +
        `\n\nView & approve the quotation online:\n${approvalUrl}\n\n— ${businessName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#7438dc;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">${businessName}</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px">
            ${bodyHtml}
            <div style="margin:24px 0">
              <a href="${approvalUrl}"
                 style="background:#7438dc;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                View &amp; Approve Quotation
              </a>
            </div>
            <p style="color:#888;font-size:12px">Or paste this link into your browser:<br>
              <a href="${approvalUrl}" style="color:#7438dc">${approvalUrl}</a>
            </p>
            <p style="color:#aaa;font-size:11px;margin-top:16px">
              Quotation PDF attachment and online link are included automatically.
            </p>
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error("[mailer] failed to send quotation email", err);
    return false;
  }
}

/** Returns true if an email was actually dispatched. Never throws. */
export async function sendInvitationEmail(args: InviteEmailArgs): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, inviteUrl, businessName, roleName, inviterName } = args;
  const inviter = inviterName ? `${inviterName} ` : "";

  try {
    await transport.sendMail({
      from,
      to,
      subject: `You're invited to join ${businessName}`,
      text:
        `${inviter}invited you to join ${businessName} as ${roleName}.\n\n` +
        `Accept your invitation: ${inviteUrl}\n\n` +
        `This link will expire in 7 days.`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#111">Join ${businessName}</h2>
          <p style="color:#444">${inviter}invited you to join
            <strong>${businessName}</strong> as <strong>${roleName}</strong>.</p>
          <p style="margin:24px 0">
            <a href="${inviteUrl}"
               style="background:#7438dc;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Accept invitation
            </a>
          </p>
          <p style="color:#888;font-size:13px">Or paste this link into your browser:<br>${inviteUrl}</p>
          <p style="color:#888;font-size:13px">This link expires in 7 days.</p>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error("[mailer] failed to send invitation", err);
    return false;
  }
}

// ─── Seller notification emails (quotation workflow) ─────────────────────────

type SellerEventEmailArgs = {
  to: string;
  subject: string;
  body: string;
  businessName: string;
  ctaUrl?: string;
  ctaLabel?: string;
};

/** Generic seller-facing event email. Never throws. */
export async function sendSellerQuotationEventEmail(
  args: SellerEventEmailArgs,
): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, subject, body, businessName, ctaUrl, ctaLabel } = args;

  const ctaHtml = ctaUrl
    ? `<div style="margin:24px 0">
         <a href="${ctaUrl}"
            style="background:#7438dc;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
           ${ctaLabel ?? "View quotation"}
         </a>
       </div>`
    : "";

  const ctaText = ctaUrl ? `\n\n${ctaLabel ?? "View quotation"}: ${ctaUrl}` : "";

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text: `${body}${ctaText}\n\n— ${businessName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#7438dc;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">${businessName}</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 8px 0;color:#444">${body}</p>
            ${ctaHtml}
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[mailer] failed to send seller event email", err);
    }
    return false;
  }
}

export async function sendQuotationViewedEmail(args: {
  to: string;
  clientName: string;
  quotationNumber: string;
  businessName: string;
  ctaUrl?: string;
}): Promise<boolean> {
  const { to, clientName, quotationNumber, businessName, ctaUrl } = args;
  return sendSellerQuotationEventEmail({
    to,
    subject: "Quotation Viewed",
    body: `${clientName} has viewed quotation ${quotationNumber}.`,
    businessName,
    ctaUrl,
    ctaLabel: "View quotation",
  });
}

export async function sendQuotationAcceptedEmail(args: {
  to: string;
  clientName: string;
  quotationNumber: string;
  businessName: string;
  ctaUrl?: string;
}): Promise<boolean> {
  const { to, clientName, quotationNumber, businessName, ctaUrl } = args;
  return sendSellerQuotationEventEmail({
    to,
    subject: "Client Accepted Your Quotation",
    body: `${clientName} accepted quotation ${quotationNumber}.`,
    businessName,
    ctaUrl,
    ctaLabel: "View quotation",
  });
}

export async function sendPurchaseOrderReceivedEmail(args: {
  to: string;
  clientName: string;
  quotationNumber: string;
  businessName: string;
  ctaUrl?: string;
}): Promise<boolean> {
  const { to, clientName, quotationNumber, businessName, ctaUrl } = args;
  return sendSellerQuotationEventEmail({
    to,
    subject: "Purchase Order Received",
    body: `Purchase order received from ${clientName} for quotation ${quotationNumber}.`,
    businessName,
    ctaUrl,
    ctaLabel: "View quotation",
  });
}

/** Resolve seller email + business name for outbound notifications. */
export async function getSellerEmailContext(businessId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      brandName: true,
      user: { select: { email: true } },
    },
  });
}

export function buildQuotationDetailUrl(quotationId: string, origin?: string): string {
  const base =
    origin?.replace(/\/$/, "") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    "";
  return `${base}/sales-and-invoices/quotation-estimates/${quotationId}`;
}

type PurchaseOrderEmailArgs = {
  to: string;
  cc?: string[];
  replyTo?: string;
  subject: string;
  message: string;
  businessName: string;
  /** Public link to view the PO (renders "View Purchase Order" button). */
  viewUrl?: string;
  /** Deep-link that auto-accepts as a Sales Order (renders "Add As Sales Order" button). */
  acceptUrl?: string;
};

/** Send purchase order to vendor. Never throws. */
export async function sendPurchaseOrderEmail(args: PurchaseOrderEmailArgs): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, cc, replyTo, subject, message, businessName, viewUrl, acceptUrl } = args;

  const bodyHtml = message
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px 0;color:#444">${line || "&nbsp;"}</p>`)
    .join("");

  const buttonsHtml = (viewUrl || acceptUrl)
    ? `<div style="margin:24px 0;display:flex;gap:12px;flex-wrap:wrap">
        ${viewUrl
          ? `<a href="${viewUrl}"
               style="background:#7438dc;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
               View Purchase Order
             </a>`
          : ""}
        ${acceptUrl
          ? `<a href="${acceptUrl}"
               style="background:#fff;color:#7438dc;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;border:2px solid #7438dc">
               Add As Sales Order
             </a>`
          : ""}
       </div>`
    : "";

  const buttonsText = [
    viewUrl ? `View Purchase Order: ${viewUrl}` : "",
    acceptUrl ? `Add As Sales Order: ${acceptUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await transport.sendMail({
      from,
      to,
      ...(cc && cc.length > 0 && { cc }),
      ...(replyTo && { replyTo }),
      subject,
      text: `${message}${buttonsText ? `\n\n${buttonsText}` : ""}\n\n— ${businessName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#7438dc;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">${businessName}</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px">
            ${bodyHtml}
            ${buttonsHtml}
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[mailer] failed to send purchase order email", err);
    }
    return false;
  }
}

type InvoiceEmailArgs = {
  to: string;
  cc?: string[];
  replyTo?: string;
  subject: string;
  message: string;
  businessName: string;
  viewUrl?: string;
};

/** Send invoice to client. Never throws. */
export async function sendInvoiceEmail(args: InvoiceEmailArgs): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, cc, replyTo, subject, message, businessName, viewUrl } = args;

  const bodyHtml = message
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px 0;color:#444">${line || "&nbsp;"}</p>`)
    .join("");

  const viewButtonHtml = viewUrl
    ? `<div style="margin:24px 0">
        <a href="${viewUrl}"
           style="background:#7438dc;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          View Invoice
        </a>
       </div>`
    : "";

  try {
    await transport.sendMail({
      from,
      to,
      ...(cc && cc.length > 0 && { cc }),
      ...(replyTo && { replyTo }),
      subject,
      text: `${message}${viewUrl ? `\n\nView Invoice: ${viewUrl}` : ""}\n\n— ${businessName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#7438dc;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">${businessName}</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px">
            ${bodyHtml}
            ${viewButtonHtml}
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[mailer] failed to send invoice email", err);
    }
    return false;
  }
}
