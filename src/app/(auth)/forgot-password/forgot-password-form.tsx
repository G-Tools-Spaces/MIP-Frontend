"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";

/**
 * Forgot-password form.
 *
 * Since V18 users are global (no org slug required). The user only needs
 * to enter their email address; the backend looks them up by email alone.
 */
const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export const ForgotPasswordForm = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: Values) => authApi.forgotPassword(values),
    onSuccess: () => setSent(true),
    onError: (error: ApiError) => {
      if (error.status === 0) {
        setFormError(
          "Cannot reach the identity service. Check your connection.",
        );
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Check your inbox">
          If an account matches that email, we&apos;ve sent a password reset
          link. The link expires in 1 hour.
        </Alert>
        <p className="text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Back to sign in
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
        <Alert variant="error" title="Something went wrong">
          {formError}
        </Alert>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <Field>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </Field>

      <Button type="submit" block size="lg" loading={mutation.isPending}>
        Send reset link
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
