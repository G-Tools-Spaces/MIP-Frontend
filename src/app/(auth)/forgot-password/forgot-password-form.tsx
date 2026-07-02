"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";

const schema = z.object({
  orgSlug: z.string().trim().min(1, "Organization is required"),
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
      // For privacy, most IdPs return 200 regardless. If the backend still
      // surfaces an error, show a generic message.
      if (error.status === 0) {
        setFormError("Cannot reach the identity service. Check your connection.");
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  if (sent) {
    return (
      <Alert variant="success" title="Check your inbox">
        If an account matches that email, we&apos;ve sent a reset link. The link
        expires in 30 minutes.
      </Alert>
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

      <Field>
        <Label htmlFor="orgSlug">Organization</Label>
        <Input
          id="orgSlug"
          placeholder="acme"
          invalid={!!errors.orgSlug}
          {...register("orgSlug")}
        />
        <FieldError message={errors.orgSlug?.message} />
      </Field>

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
    </form>
  );
};
