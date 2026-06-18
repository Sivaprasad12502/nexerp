"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/reset-password";

interface ResetPasswordFormProps {
  token: string;
  userName: string | null;
}

export function ResetPasswordForm({ token, userName }: ResetPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body.error === "string"
          ? body.error
          : "Something went wrong. Please try again.";
      setError("root", { message });
      toast.error(message);
      return;
    }

    toast.success("Password updated successfully!");
    router.push("/login");
  };

  return (
    <div className="mx-auto w-full max-w-115 px-6 pb-24 pt-10">
      {userName && (
        <p className="text-center text-lg text-zinc-700">
          Hi {userName} 👋
        </p>
      )}
      <h1 className="mt-2 text-center text-3xl font-bold tracking-tight text-zinc-900">
        Reset your Password
      </h1>

      {errors.root && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {errors.root.message}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {/* Hidden token field */}
        <input type="hidden" {...register("token")} />

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
            New Password<span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Choose a strong password"
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
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-800">
            Confirm Password<span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm your new password"
              {...register("confirmPassword")}
              className={`h-12 w-full rounded-l-md border border-r-0 bg-white px-3.5 text-sm text-zinc-900 outline-none transition-colors focus:border-[#7c3aed] ${
                errors.confirmPassword ? "border-red-400" : "border-zinc-300"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="flex w-12 items-center justify-center rounded-r-md border border-zinc-300 bg-white text-zinc-500 transition-colors hover:bg-zinc-50"
            >
              {showConfirm ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-md bg-[#7c3aed] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9] disabled:opacity-60"
        >
          {isSubmitting ? "Updating…" : "Update"}
        </button>
      </form>
    </div>
  );
}
