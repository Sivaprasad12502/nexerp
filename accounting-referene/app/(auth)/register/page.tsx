"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/auth/google-icon";
import { TestimonialPanel } from "@/components/auth/testimonial-panel";
import { registerSchema, type RegisterInput } from "@/lib/validations/register";
import {
  buildBusinessNewUrl,
  buildLoginUrl,
  isPublicDocumentCallback,
  persistDocumentAuthContext,
  resolveAuthCallback,
  resolveAuthEmail,
} from "@/lib/public-auth-flow";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();

  const rawCallback = searchParams.get("callbackUrl");
  const rawEmail = searchParams.get("email");
  const resolvedCallback = resolveAuthCallback(rawCallback);
  const emailParam = resolveAuthEmail(rawEmail) ?? "";
  const linkCallback = resolvedCallback ?? "/business-new";
  const emailFromDocument = Boolean(emailParam && isPublicDocumentCallback(resolvedCallback));

  useEffect(() => {
    if (rawCallback || rawEmail) {
      persistDocumentAuthContext(rawCallback, rawEmail);
    }
  }, [rawCallback, rawEmail]);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: "India", agreed: true, email: emailParam },
  });

  const agreed = watch("agreed");
  const fromDocument = isPublicDocumentCallback(resolvedCallback);

  const postRegisterRedirect = async () => {
    await updateSession();
    const target = resolveAuthCallback(rawCallback);
    router.push(target ? buildBusinessNewUrl(target) : "/business-new");
    router.refresh();
  };

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 409) {
        setServerError("This email is already registered. Please login.");
        toast.error("This email is already registered. Please login.");
      } else {
        setServerError("Something went wrong. Please try again.");
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    toast.success("Account created successfully!");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.ok) {
      await postRegisterRedirect();
    } else {
      setServerError("Account created but sign-in failed. Please login.");
      toast.error("Account created but sign-in failed. Please login.");
      router.push(buildLoginUrl(linkCallback, data.email));
    }
  };

  const googleCallbackUrl = buildBusinessNewUrl(resolvedCallback);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-6 pb-24 pt-6 lg:grid-cols-2 lg:gap-12">
      <TestimonialPanel />

      <div className="mx-auto w-full max-w-[440px]">
        <h1 className="text-center text-2xl font-bold text-zinc-900">
          Signup on Refrens
        </h1>

        {fromDocument && (
          <p className="mt-2 text-center text-sm text-zinc-600">
            Create an account to view and accept this document.
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            signIn("google", { callbackUrl: googleCallbackUrl });
            toast.success("Redirecting to Google for authentication...");
          }}
          className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </button>

        <div className="my-4 text-center text-sm text-zinc-400">OR</div>

        {serverError && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Country" htmlFor="country" error={errors.country?.message}>
            <div className="relative">
              <select
                id="country"
                {...register("country")}
                className="h-11 w-full appearance-none rounded-md border border-zinc-300 bg-white pl-3.5 pr-9 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              >
                <option>United Arab Emirates</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </Field>

          <Field label="Your Name" htmlFor="name" error={errors.name?.message}>
            <input
              id="name"
              type="text"
              {...register("name")}
              className={inputCls(!!errors.name)}
            />
          </Field>

          <Field label="Your Email" htmlFor="email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              readOnly={emailFromDocument}
              {...register("email")}
              className={`${inputCls(!!errors.email)} ${emailFromDocument ? "bg-zinc-50 text-zinc-600" : ""}`}
            />
            {emailFromDocument && (
              <p className="mt-1 text-xs text-zinc-500">
                Use the email address this document was sent to.
              </p>
            )}
          </Field>

          <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <div
              className={`flex h-11 items-center rounded-md border bg-white focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-[#7c3aed]/20 ${
                errors.phone ? "border-red-400" : "border-zinc-300"
              }`}
            >
              <span className="flex items-center gap-1 border-r border-zinc-300 px-2.5 text-sm text-zinc-700">
                <span className="text-base leading-none">🇦🇪</span>
                <ChevronDown className="size-3 text-zinc-400" />
                <span>+971</span>
              </span>
              <input
                id="phone"
                type="tel"
                {...register("phone")}
                className="h-full w-full rounded-r-md bg-transparent px-3 text-sm text-zinc-900 outline-none"
              />
            </div>
          </Field>

          <Field label="Set Password" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`${inputCls(!!errors.password)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
              >
                {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              </button>
            </div>
          </Field>

          <div>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                {...register("agreed")}
                checked={agreed}
                onChange={(e) =>
                  setValue("agreed", e.target.checked as true, {
                    shouldValidate: true,
                  })
                }
                className="mt-0.5 size-4 shrink-0 accent-[#7c3aed]"
              />
              <span>
                I agree to the Refrens{" "}
                <a href="#" className="underline">
                  T&amp;C
                </a>{" "}
                and{" "}
                <a href="#" className="underline">
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.agreed && (
              <p className="mt-1 text-xs text-red-500">{errors.agreed.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-md bg-[#7c3aed] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
          This site is protected by reCAPTCHA and the Google{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="#" className="underline">
            Terms of Service
          </a>{" "}
          apply.
        </p>

        <p className="mt-4 text-center text-sm text-zinc-700">
          Already a user?{" "}
          <Link
            href={buildLoginUrl(linkCallback, emailParam || undefined)}
            className="font-medium text-[#7c3aed] hover:underline"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  error,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-3 sm:grid-cols-[112px_1fr] sm:gap-4">
      <label htmlFor={htmlFor} className="pt-2 text-sm font-medium text-zinc-800">
        {label}
        <span className="text-red-500">*</span>
      </label>
      <div>
        {children}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `h-11 w-full rounded-md border bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 ${
    hasError ? "border-red-400" : "border-zinc-300"
  }`;
}

const Register = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
    <RegisterForm />
  </Suspense>
);

export default Register;
