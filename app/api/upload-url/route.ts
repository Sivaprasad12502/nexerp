import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET_NAME } from "@/lib/s3";

export async function POST(req: Request) {
  const body = await req.json();

  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("BUCKET:", BUCKET_NAME);
  console.log("FOLDER:", process.env.SUPABASE_S3_FOLDER);


  const fileType = body.fileType;
  const extension = fileType.split("/")[1];

  const key = `${process.env.SUPABASE_S3_FOLDER}/${crypto.randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME, // ✅ use the imported constant
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 60,
  });

  // ✅ Supabase public URL format
  const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

  return NextResponse.json({
    uploadUrl,
    fileUrl,
    key,
  });
}