"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";

const schema = z.object({
  orgSlug: z
    .string()
    .trim()
    .min(1, "Organization is required")
    .max(64, "Organization slug is too long"),
  displayName: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(120, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type Values = z.infer<typeof schema>;

export const RegisterForm = () => {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: Values) => authApi.register(values),
    onSuccess: (data, values) => {
      toast.success("Account created — please verify your email.");
      const needsVerification = !data.emailVerified;
      const next = needsVerification
        ? `/verify-email?email=${encodeURIComponent(values.email)}`
        : `/login?org=${encodeURIComponent(values.orgSlug)}`;
      router.push(next);
    },
    onError: (error: ApiError) => {
      if (error.status === 409) {
        setFormError("An account with this email already exists.");
      } else if (error.status === 404) {
        setFormError(
          "Organization not found. Check the slug and try again.",
        );
      } else if (error.status === 400) {
        setFormError(
          error.problem.detail ??
            "Some fields are invalid. Check the highlighted errors.",
        );
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

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
        <Alert variant="error" title="Unable to create account">
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
        <Label htmlFor="displayName">Full name</Label>
        <Input
          id="displayName"
          placeholder="Ada Lovelace"
          autoComplete="name"
          invalid={!!errors.displayName}
          {...register("displayName")}
        />
        <FieldError message={errors.displayName?.message} />
      </Field>

      <Field>
        <Label htmlFor="email">Work email</Label>
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

      <Field>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <FieldError message={errors.password.message} />
        ) : (
          <FieldHint>
            At least 12 characters, with upper, lower &amp; a number.
          </FieldHint>
        )}
      </Field>

      <Button type="submit" block size="lg" loading={mutation.isPending}>
        Create account
      </Button>
    </form>
  );
};
