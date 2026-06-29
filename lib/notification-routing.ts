/**
 * Deep-link routing for in-app notifications.
 */
export function getNotificationHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null;

  if (entityType === "QUOTATION") {
    return `/sales-and-invoices/quotation-estimates/${entityId}`;
  }
  if (entityType === "DOCUMENT") {
    return `/sales-and-invoices/documents/${entityId}`;
  }
  return null;
}
