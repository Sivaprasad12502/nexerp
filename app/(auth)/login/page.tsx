"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/auth/google-icon";
import { loginSchema, type LoginInput } from "@/lib/validations/login";
import {
  buildRegisterUrl,
  clearDocumentAuthContext,
  isPublicDocumentCallback,
  persistDocumentAuthContext,
  resolveAuthCallback,
  resolveAuthEmail,
} from "@/lib/public-auth-flow";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const rawEmail = searchParams.get("email");
  const resolvedCallback = resolveAuthCallback(rawCallback);
  const loginRedirectTarget = resolvedCallback ?? "/business-new";
  const emailParam = resolveAuthEmail(rawEmail) ?? "";
  const linkCallback = resolvedCallback ?? "/business-new";

  useEffect(() => {
    if (rawCallback || rawEmail) {
      persistDocumentAuthContext(rawCallback, rawEmail);
    }
  }, [rawCallback, rawEmail]);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailParam },
  });

  const onSubmit = async (data: LoginInput) => {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (!result?.ok) {
      setError("root", { message: "Invalid email or password. Please try again." });
      toast.error("Invalid email or password. Please try again.");
      return;
    }

    toast.success("Logged in successfully!");
    if (isPublicDocumentCallback(resolvedCallback)) {
      clearDocumentAuthContext();
    }
    router.push(loginRedirectTarget);
    router.refresh();
  };

  const fromDocument = isPublicDocumentCallback(resolvedCallback);

  return (
    <div className="mx-auto w-full max-w-115 px-6 pb-24 pt-10">
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
        Login to your Refrens account
      </h1>

      {fromDocument && (
        <p className="mt-3 text-center text-sm text-zinc-600">
          Sign in to view and accept this document.
        </p>
      )}

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: loginRedirectTarget })}
        className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
      >
        <GoogleIcon className="size-5" />
        Sign in with Google
      </button>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-sm text-zinc-400">OR</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      {errors.root && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {errors.root.message}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
            Email<span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className={`h-12 w-full rounded-md border bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 ${
              errors.email ? "border-red-400" : "border-zinc-300"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className={`h-12 w-full rounded-l-md border border-r-0 bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] ${
                errors.password ? "border-red-400" : "border-zinc-300"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="flex w-12 items-center justify-center rounded-r-md border border-zinc-300 bg-white text-zinc-500 transition-colors hover:bg-zinc-50"
            >
              {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
          <Link
            href="/forgot-password"
            className="inline-block pt-1 text-sm text-zinc-500 hover:text-zinc-700"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-md bg-[#7c3aed] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9] disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Login and Continue"}
        </button>
      </form>

      <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
        This site is protected by reCAPTCHA and the Google{" "}
        <a href="#" className="underline">Privacy Policy</a> and{" "}
        <a href="#" className="underline">Terms of Service</a> apply.
      </p>

      <p className="mt-6 text-center text-sm text-zinc-700">
        Having issues logging in?{" "}
        <Link href="#help" className="font-medium text-[#7c3aed] hover:underline">
          Click here
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-zinc-700">
        Don&apos;t have an account?{" "}
        <Link
          href={buildRegisterUrl(linkCallback, emailParam || undefined)}
          className="font-medium text-[#7c3aed] hover:underline"
        >
          Sign up now
        </Link>
      </p>
      {fromDocument && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Create an account to continue accepting this document.
        </p>
      )}
    </div>
  );
}

const Login = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
    <LoginForm />
  </Suspense>
);

export default Login;
