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
