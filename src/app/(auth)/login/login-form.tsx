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
import { onboardingApi } from "@/lib/api/endpoints/onboarding";
import { ApiError } from "@/lib/api/problem";
import { useSession } from "@/stores/session-store";

/**
 * Login form.
 *
 * Since V18 the user is a global identity and may belong to zero, one, or
 * many organizations. We therefore no longer prompt for an org slug — the
 * backend resolves the caller's active membership from their credentials.
 * After a successful login we probe `/onboarding/me/memberships`:
 *   • ≥1 ACTIVE membership → route to /console (dashboard)
 *   • zero memberships     → route to /onboarding/choose (join or create)
 */
const loginSchema = z.object({
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
      email: searchParams.get("email") ?? "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) => authApi.login(values),
    onSuccess: async (data: LoginResponse) => {
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

      // Decide the post-login destination.
      //   • ?returnTo=/some/path → honour it (deep-link support).
      //   • The token already carries an org_id → user has an active
      //     membership, send them to the console.
      //   • Otherwise probe /onboarding/me/memberships and route based on
      //     whether they have any ACTIVE memberships.
      const returnTo = searchParams.get("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        router.push(returnTo);
        return;
      }

      if (data.organizationId) {
        router.push("/console");
        return;
      }

      try {
        const memberships = await onboardingApi.myMemberships();
        const activeMembership = memberships.find(
          (m) => m.status === "ACTIVE",
        );
        if (activeMembership) {
          // Bind the SPA session to the user's primary active org so that
          // org-scoped pages (invitations, users, roles, …) don't fall back
          // to the "No organization context" warning. Without this, the
          // token store keeps `organizationId = null` and every downstream
          // `useCurrentOrgId()` returns null.
          setSession({
            accessToken: data.accessToken,
            expiresIn: data.expiresIn,
            user: {
              ...data.user,
              membershipId: activeMembership.membershipId,
            },
            orgSlug: activeMembership.organizationSlug ?? undefined,
            organizationId: activeMembership.organizationId,
          });
          router.push("/console");
        } else {
          router.push("/onboarding/choose");
        }
      } catch {
        // If the probe fails we fall back to the onboarding chooser — safer
        // than dumping the user into an empty dashboard.
        router.push("/onboarding/choose");
      }
    },
    onError: (error: ApiError) => {
      if (error.status === 401) {
        setFormError("Invalid email or password.");
      } else if (error.status === 403) {
        setFormError("Your account is not permitted to sign in.");
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
