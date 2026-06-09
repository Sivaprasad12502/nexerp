"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Lookup =
  | { valid: false; reason: "not_found" | "expired" | "used" }
  | {
      valid: true;
      email: string;
      name: string | null;
      roleName: string;
      businessName: string;
      accountExists: boolean;
      hasPassword: boolean;
    };

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: Lookup) => {
        setLookup(data);
        if (data.valid && data.name) setName(data.name);
      })
      .catch(() => setLookup({ valid: false, reason: "not_found" }))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async (extra: { name?: string; password?: string } = {}) => {
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...extra }),
    });
    return res;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookup?.valid) return;
    setSubmitting(true);

    const loggedInAsInvitee =
      status === "authenticated" &&
      session?.user?.email?.toLowerCase() === lookup.email.toLowerCase();
    // Brand-new and passwordless accounts (e.g. created via Google) set a
    // password here; password-protected accounts must sign in with theirs.
    const settingPassword = !lookup.accountExists || !lookup.hasPassword;

    const goToDashboard = async () => {
      // Refresh the JWT so the freshly created membership is reflected in the
      // `hasBusiness` claim the middleware reads — otherwise the user gets
      // bounced to /business-new onboarding instead of the dashboard.
      await update();
      toast.success(`Welcome to ${lookup.businessName}!`);
      router.push("/dashboard");
      router.refresh();
    };

    const reportError = async (res: Response, fallback: string) => {
      const body = await res.json().catch(() => ({}));
      toast.error(
        typeof body.error === "string"
          ? body.error
          : body.error?.password?.[0] ?? fallback
      );
      setSubmitting(false);
    };

    try {
      // Already logged in with the matching email → accept directly.
      if (loggedInAsInvitee) {
        const res = await accept();
        if (!res.ok) return reportError(res, "Could not accept invite.");
        await goToDashboard();
        return;
      }

      // Existing password-protected account → sign in first, then accept.
      if (!settingPassword) {
        const signin = await signIn("credentials", {
          email: lookup.email,
          password,
          redirect: false,
        });
        if (!signin?.ok) {
          toast.error("Incorrect password for this email.");
          setSubmitting(false);
          return;
        }
        const res = await accept();
        if (!res.ok) return reportError(res, "Could not accept invite.");
        await goToDashboard();
        return;
      }

      // Brand-new or passwordless account → set password + membership, then sign in.
      const res = await accept({ name: name || undefined, password });
      if (!res.ok) return reportError(res, "Could not create your account.");
      const signin = await signIn("credentials", {
        email: lookup.email,
        password,
        redirect: false,
      });
      if (signin?.ok) {
        await goToDashboard();
      } else {
        toast.success("Account created. Please log in.");
        router.push("/login");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Centered>Loading invitation…</Centered>;
  }

  if (!lookup?.valid) {
    const message =
      lookup?.reason === "expired"
        ? "This invitation has expired. Ask your admin to send a new one."
        : lookup?.reason === "used"
          ? "This invitation has already been used."
          : "This invitation link is invalid.";
    return (
      <Centered>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Invitation unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">{message}</p>
        </div>
      </Centered>
    );
  }

  const matchesSession =
    status === "authenticated" &&
    session?.user?.email?.toLowerCase() === lookup.email.toLowerCase();
  const needsPassword = !matchesSession; // logged-out visitors always supply a password
  const isNewAccount = !lookup.accountExists;
  // New accounts and passwordless accounts set a password; others sign in with theirs.
  const settingPassword = !lookup.accountExists || !lookup.hasPassword;

  return (
    <Centered>
      <div className="w-full max-w-md rounded-xl border border-zinc-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-50 text-[#7438dc]">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-zinc-900">
            Join {lookup.businessName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            You&apos;ve been invited as <strong>{lookup.roleName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Email</label>
            <input
              value={lookup.email}
              readOnly
              className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600"
            />
          </div>

          {isNewAccount && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
              />
            </div>
          )}

          {needsPassword && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">
                {settingPassword ? "Set a password" : "Your password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 pr-10 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-md bg-[#7438dc] text-sm font-semibold text-white transition-colors hover:bg-[#6330c2] disabled:opacity-60"
          >
            {submitting
              ? "Joining…"
              : matchesSession
                ? "Accept invitation"
                : settingPassword
                  ? isNewAccount
                    ? "Create account & join"
                    : "Set password & join"
                  : "Sign in & join"}
          </button>
        </form>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4 py-12">
      {children}
    </div>
  );
}
