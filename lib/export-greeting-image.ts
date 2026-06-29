import { toPng } from "html-to-image";

export async function exportGreetingAsPng(
  element: HTMLElement,
  filename: string,
): Promise<Blob> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = dataUrl;
  link.click();

  return blob;
}

export function buildShareText(businessName: string, message: string): string {
  const parts = [message.trim()];
  if (businessName.trim()) parts.push(`— ${businessName.trim()}`);
  return parts.filter(Boolean).join("\n");
}

export function shareToWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

export function shareToTwitter(text: string) {
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareToFacebook(text: string) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareToLinkedIn(text: string) {
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareToEmail(text: string, subject: string) {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export async function copyShareText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function nativeShareGreeting(
  blob: Blob,
  title: string,
  text: string,
): Promise<boolean> {
  if (!navigator.share) return false;

  const file = new File([blob], "greeting.png", { type: "image/png" });
  const payload: ShareData = { title, text };

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ ...payload, files: [file] });
    return true;
  }

  await navigator.share(payload);
  return true;
}
