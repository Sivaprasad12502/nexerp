import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/reset-password";

/** GET /api/auth/reset-password?token=xxx — validate a token and return user info. */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") ?? "";
    if (!token) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { name: true } } },
    });

    if (!record) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }
    if (record.usedAt) {
      return NextResponse.json({ valid: false, reason: "used" });
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    return NextResponse.json({ valid: true, userName: record.user.name });
  } catch (err) {
    console.error("[reset-password GET]", err);
    return NextResponse.json({ valid: false, reason: "not_found" });
  }
}

/** POST /api/auth/reset-password — consume a token and set a new password. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
