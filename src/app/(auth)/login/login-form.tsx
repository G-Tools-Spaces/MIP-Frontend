"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { authApi, type LoginResponse } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";
import { useSession } from "@/stores/session-store";

const loginSchema = z.object({
  orgSlug: z
    .string()
    .trim()
    .min(1, "Organization is required")
    .max(64, "Organization slug is too long"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSession((s) => s.setSession);
  const setMfaChallenge = useSession((s) => s.setMfaChallenge);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      orgSlug: searchParams.get("org") ?? "",
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) => authApi.login(values),
    onSuccess: (data: LoginResponse) => {
      if (data.mfaRequired && data.mfaChallengeId) {
        setMfaChallenge(
          data.mfaChallengeId,
          data.orgSlug,
          data.mfaChallengeToken ?? undefined,
          data.organizationId ?? undefined,
        );
        router.push("/mfa-challenge");
        return;
      }

      if (!data.user) {
        setFormError("Login succeeded but no profile was returned.");
        return;
      }

      setSession({
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        user: data.user,
        orgSlug: data.orgSlug,
        organizationId: data.organizationId,
      });
      toast.success(`Welcome back, ${data.user.displayName}`);
      const returnTo = searchParams.get("returnTo");
      router.push(returnTo && returnTo.startsWith("/") ? returnTo : "/console");
    },
    onError: (error: ApiError) => {
      if (error.status === 401) {
        setFormError("Invalid email or password.");
      } else if (error.status === 403) {
        setFormError(
          "Your account is not permitted to sign in to this organization.",
        );
      } else if (error.status === 429) {
        setFormError("Too many attempts. Please try again in a moment.");
      } else if (error.status === 0) {
        setFormError(
          "Cannot reach the identity service. Check your connection.",
        );
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  const onSubmit = (values: LoginValues) => {
    setFormError(null);
    loginMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && (
        <Alert variant="error" title="Unable to sign in">
          {formError}
        </Alert>
      )}

      <Field>
        <Label htmlFor="orgSlug">Organization</Label>
        <Input
          id="orgSlug"
          placeholder="acme"
          autoComplete="organization"
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

      <Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register("password")}
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
        <FieldError message={errors.password?.message} />
      </Field>

      <Button
        type="submit"
        block
        size="lg"
        loading={loginMutation.isPending}
      >
        Sign in
      </Button>
    </form>
  );
};
