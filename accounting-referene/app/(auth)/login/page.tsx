"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[460px] px-6 pb-24 pt-10">
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
        Login to your Refrens account
      </h1>

      {/* Google */}
      <button
        type="button"
        className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
      >
        <GoogleIcon className="size-5" />
        Sign in with Google
      </button>

      {/* OR divider */}
      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-sm text-zinc-400">OR</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
            Email<span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            defaultValue="adam@gmai.com"
            className="h-12 w-full rounded-md border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="h-12 w-full rounded-l-md border border-r-0 border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed]"
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
          <Link
            href="#forgot"
            className="inline-block pt-1 text-sm text-zinc-500 hover:text-zinc-700"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="h-12 w-full rounded-md bg-[#7c3aed] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9]"
        >
          Login and Continue
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
        <Link href="/register" className="font-medium text-[#7c3aed] hover:underline">
          Sign up now
        </Link>
      </p>
    </div>
  );
};

export default Login;
