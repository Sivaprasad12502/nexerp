"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { TestimonialPanel } from "@/components/auth/testimonial-panel";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-6 pb-24 pt-6 lg:grid-cols-2 lg:gap-12">
      {/* Left: testimonial */}
      <TestimonialPanel />

      {/* Right: signup form */}
      <div className="mx-auto w-full max-w-[440px]">
        <h1 className="text-center text-2xl font-bold text-zinc-900">
          Signup on Refrens
        </h1>

        <button
          type="button"
          className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </button>

        <div className="my-4 text-center text-sm text-zinc-400">OR</div>

        <form className="space-y-4">
          {/* Country */}
          <Field label="Country" htmlFor="country">
            <div className="relative">
              <select
                id="country"
                defaultValue="India"
                className="h-11 w-full appearance-none rounded-md border border-zinc-300 bg-white pl-3.5 pr-9 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              >
                <option>India</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>United Arab Emirates</option>
                <option>Canada</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </Field>

          {/* Name */}
          <Field label="Your Name" htmlFor="name">
            <Input id="name" type="text" />
          </Field>

          {/* Email */}
          <Field label="Your Email" htmlFor="email">
            <Input id="email" type="email" />
          </Field>

          {/* Phone */}
          <Field label="Phone" htmlFor="phone">
            <div className="flex h-11 items-center rounded-md border border-zinc-300 bg-white focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-[#7c3aed]/20">
              <span className="flex items-center gap-1 border-r border-zinc-300 px-2.5 text-sm text-zinc-700">
                <span className="text-base leading-none">🇮🇳</span>
                <ChevronDown className="size-3 text-zinc-400" />
                <span>+91</span>
              </span>
              <input
                id="phone"
                type="tel"
                className="h-full w-full rounded-r-md bg-transparent px-3 text-sm text-zinc-900 outline-none"
              />
            </div>
          </Field>

          {/* Password */}
          <Field label="Set Password" htmlFor="password">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white pl-3.5 pr-10 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
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

          {/* Agree */}
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[#7c3aed]"
            />
            <span>
              I agree to the Refrens{" "}
              <a href="#" className="underline">T&amp;C</a> and{" "}
              <a href="#" className="underline">Privacy Policy</a>
            </span>
          </label>

          <button
            type="submit"
            className="h-12 w-full rounded-md bg-[#7c3aed] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9]"
          >
            Create Account
          </button>
        </form>

        <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
          This site is protected by reCAPTCHA and the Google{" "}
          <a href="#" className="underline">Privacy Policy</a> and{" "}
          <a href="#" className="underline">Terms of Service</a> apply.
        </p>

        <p className="mt-4 text-center text-sm text-zinc-700">
          Already a user?{" "}
          <Link href="/login" className="font-medium text-[#7c3aed] hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3 sm:grid-cols-[112px_1fr] sm:gap-4">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-800">
        {label}
        <span className="text-red-500">*</span>
      </label>
      {children}
    </div>
  );
}

function Input({ id, type }: { id: string; type: string }) {
  return (
    <input
      id={id}
      type={type}
      className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
    />
  );
}

export default Register;
