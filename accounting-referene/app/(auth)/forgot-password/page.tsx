"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail } from "lucide-react";

import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/reset-password";
import { buildLoginUrl, buildRegisterUrl } from "@/lib/public-auth-flow";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;

  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    setSubmittedEmail(data.email);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-115 px-6 pb-24 pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-violet-50 text-[#7c3aed]">
            <Mail className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
            Check your inbox
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            If an account exists for{" "}
            <span className="font-medium text-zinc-800">{submittedEmail}</span>
            , we&apos;ve sent a password reset link. It expires in 1 hour.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setSubmittedEmail("");
              }}
              className="font-medium text-[#7c3aed] hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>

        <p className="mt-10 text-center text-sm text-zinc-700">
          Remembered your password?{" "}
          <Link
            href={buildLoginUrl(callbackUrl ?? "/business-new")}
            className="font-medium text-[#7c3aed] hover:underline"
          >
            Login Here
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-115 px-6 pb-24 pt-10">
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
        Forgot Password
      </h1>
      <p className="mt-3 text-center text-sm text-zinc-600">
        Enter your registered email id to get a link to reset your password.
      </p>

      {errors.root && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {errors.root.message}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
            Email<span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="Your email id"
            {...register("email")}
            className={`h-12 w-full rounded-md border bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 ${
              errors.email ? "border-red-400" : "border-zinc-300"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-md bg-[#7c3aed] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9] disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : "Get Reset Link"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-700">
        Have password?{" "}
        <Link
          href={buildLoginUrl(callbackUrl ?? "/business-new", getValues("email") || undefined)}
          className="font-medium text-[#7c3aed] hover:underline"
        >
          Login Here
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-zinc-700">
        New user?{" "}
        <Link
          href={buildRegisterUrl(callbackUrl ?? "/business-new", getValues("email") || undefined)}
          className="font-medium text-[#7c3aed] hover:underline"
        >
          Create New Account
        </Link>
      </p>
    </div>
  );
}

const ForgotPassword = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
    <ForgotPasswordForm />
  </Suspense>
);

export default ForgotPassword;
