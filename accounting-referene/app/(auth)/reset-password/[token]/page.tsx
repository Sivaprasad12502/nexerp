"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ResetPasswordForm } from "./reset-password-form";

type TokenLookup =
  | { valid: false; reason: "not_found" | "expired" | "used" }
  | { valid: true; userName: string | null };

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [lookup, setLookup] = useState<TokenLookup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: TokenLookup) => setLookup(data))
      .catch(() => setLookup({ valid: false, reason: "not_found" }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-zinc-500">Validating reset link…</p>
      </div>
    );
  }

  if (!lookup?.valid) {
    const message =
      lookup?.reason === "expired"
        ? "This password reset link has expired."
        : lookup?.reason === "used"
          ? "This password reset link has already been used."
          : "This password reset link is invalid.";

    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">Link unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">{message}</p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block text-sm font-medium text-[#7c3aed] hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} userName={lookup.userName} />;
}
