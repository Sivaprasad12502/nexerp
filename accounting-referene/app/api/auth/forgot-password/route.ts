import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/reset-password";
import { sendPasswordResetEmail } from "@/lib/mailer";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Always return success to prevent email enumeration.
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Clear any prior tokens for this user to prevent token flooding.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_TTL_MS);

      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      });

      const origin =
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
        `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      const resetUrl = `${origin}/reset-password/${token}`;

      await sendPasswordResetEmail({ to: email, resetUrl, userName: user.name });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
