export async function uploadFile(file: File): Promise<string> {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileType: file.type }),
  });

  if (!res.ok) throw new Error("Failed to get upload URL");

  const { uploadUrl, fileUrl } = await res.json();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!put.ok) throw new Error("Upload to storage failed");

  return fileUrl as string;
}
