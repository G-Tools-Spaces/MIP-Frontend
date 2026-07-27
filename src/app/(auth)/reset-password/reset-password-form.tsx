"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";

/**
 * Reset-password form.
 *
 * Reads the reset token from the URL query parameter (?token=...) which is
 * embedded in the email link sent by the backend.
 *
 * Backend endpoint: POST /api/v1/password-reset/reset
 * Body: { token, newPassword }
 */
const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100)
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[a-z]/, "Include at least one lowercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      authApi.resetPassword({ token, newPassword: values.newPassword }),
    onSuccess: () => {
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => router.push("/login"), 3000);
    },
    onError: (error: ApiError) => {
      if (error.status === 0) {
        setFormError(
          "Cannot reach the identity service. Check your connection.",
        );
      } else if (error.status === 400) {
        setFormError(
          error.problem.detail ??
            "The reset link is invalid or has expired. Please request a new one.",
        );
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  // No token in URL — the user landed here without a valid link
  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="Invalid reset link">
          This password reset link is missing a token. Please request a new
          link from the{" "}
          <Link
            href="/forgot-password"
            className="underline font-medium hover:text-red-700"
          >
            forgot password
          </Link>{" "}
          page.
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Password updated">
          Your password has been reset successfully. Redirecting you to
          sign&nbsp;in…
        </Alert>
        <p className="text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Sign in now
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        mutation.mutate(v);
      })}
      className="space-y-5"
      noValidate
    >
      {formError && (
        <Alert variant="error" title="Unable to reset password">
          {formError}
        </Alert>
      )}

      <Field>
        <Label htmlFor="newPassword">New password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.newPassword ? (
          <FieldError message={errors.newPassword.message} />
        ) : (
          <FieldHint>
            At least 8 characters, with upper, lower &amp; a number.
          </FieldHint>
        )}
      </Field>

      <Field>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <FieldError message={errors.confirmPassword?.message} />
      </Field>

      <Button type="submit" block size="lg" loading={mutation.isPending}>
        Set new password
      </Button>

      <p className="text-center text-sm text-slate-500">
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
};
