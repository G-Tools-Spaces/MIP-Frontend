"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { onboardingApi } from "@/lib/api/endpoints/onboarding";
import { ApiError } from "@/lib/api/problem";

/**
 * Two-step registration wizard (email-OTP):
 *
 *   Step 1 — Your details  (first name, last name, email, password) → OTP issued
 *   Step 2 — Verify OTP    → account ACTIVE, redirect to /login
 *
 * The identity-lookup pre-check step has been removed — users just fill
 * in their details directly. If the email is already registered the backend
 * returns a 400 which we surface as a form error.
 */

// ── Schemas ───────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name").max(100),
  lastName: z.string().trim().min(1, "Enter your last name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type DetailsValues = z.infer<typeof detailsSchema>;

const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, "Enter the 4–8 digit code sent to your email"),
});

type OtpValues = z.infer<typeof otpSchema>;

// ── Component ─────────────────────────────────────────────────────────────

type Step = "details" | "otp";

type StartedContext = {
  verificationId: string;
  /** Possibly partially masked — for display only (e.g. "j***n@company.com"). */
  email: string;
  expiresAt: string;
  maxAttempts: number;
};

export const RegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [step, setStep] = useState<Step>("details");
  const [formError, setFormError] = useState<string | null>(null);
  const [started, setStarted] = useState<StartedContext | null>(null);

  // ── Step 1 — details + issue OTP ─────────────────────────────────────

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const startMutation = useMutation({
    mutationFn: (values: DetailsValues) =>
      onboardingApi.startRegistration(values),
    onSuccess: (res) => {
      setStarted({
        verificationId: res.verificationId,
        email: res.email,
        expiresAt: res.expiresAt,
        maxAttempts: res.maxAttempts,
      });
      toast.success(`Verification code sent to ${res.email}`);
      setStep("otp");
    },
    onError: (error: ApiError) => {
      setFormError(error.problem.detail ?? error.problem.title);
    },
  });

  // ── Step 2 — verify OTP ──────────────────────────────────────────────

  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema) });

  const verifyMutation = useMutation({
    mutationFn: (values: OtpValues) =>
      onboardingApi.verifyRegistrationOtp({
        verificationId: started!.verificationId,
        code: values.code,
      }),
    onSuccess: (res) => {
      toast.success("Account verified! Please sign in to continue.");
      // Redirect to login. After login the user will be routed to
      // /onboarding/choose to create or join an organisation, then to
      // TOTP setup from the security settings.
      const q = new URLSearchParams({ registered: "1", email: res.email });
      if (returnTo) q.set("returnTo", returnTo);
      router.push(`/login?${q}`);
    },
    onError: (error: ApiError) =>
      setFormError(error.problem.detail ?? error.problem.title),
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <ol className="flex items-center gap-3 text-xs uppercase tracking-wide">
        <Pill active={step === "details"} done={step === "otp"}>
          1. Your details
        </Pill>
        <Pill active={step === "otp"} disabled={step !== "otp"}>
          2. Verify email
        </Pill>
      </ol>

      {formError && (
        <Alert variant="error" title="Something went wrong">
          {formError}
        </Alert>
      )}

      {step === "details" && (
        <form
          onSubmit={detailsForm.handleSubmit((v) => {
            setFormError(null);
            startMutation.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Fill in your details below. We&rsquo;ll email you a one-time code
            to verify your address.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                invalid={!!detailsForm.formState.errors.firstName}
                {...detailsForm.register("firstName")}
              />
              <FieldError
                message={detailsForm.formState.errors.firstName?.message}
              />
            </Field>
            <Field>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                invalid={!!detailsForm.formState.errors.lastName}
                {...detailsForm.register("lastName")}
              />
              <FieldError
                message={detailsForm.formState.errors.lastName?.message}
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              invalid={!!detailsForm.formState.errors.email}
              {...detailsForm.register("email")}
            />
            <FieldError message={detailsForm.formState.errors.email?.message} />
          </Field>

          <Field>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              invalid={!!detailsForm.formState.errors.password}
              {...detailsForm.register("password")}
            />
            {detailsForm.formState.errors.password ? (
              <FieldError
                message={detailsForm.formState.errors.password.message}
              />
            ) : (
              <FieldHint>
                At least 8 characters, with upper, lower &amp; a number.
              </FieldHint>
            )}
          </Field>

          <Button
            type="submit"
            block
            size="lg"
            loading={startMutation.isPending}
          >
            Create account &amp; send OTP
          </Button>
        </form>
      )}

      {step === "otp" && started && (
        <form
          onSubmit={otpForm.handleSubmit((v) => {
            setFormError(null);
            verifyMutation.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We sent a 6-digit code to <b>{started.email}</b>. Enter it below to
            activate your account. You have up to{" "}
            <b>{started.maxAttempts}</b> attempts.
          </p>

          <Field>
            <Label htmlFor="otp-code">One-time code</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              invalid={!!otpForm.formState.errors.code}
              {...otpForm.register("code")}
            />
            <FieldError message={otpForm.formState.errors.code?.message} />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStarted(null);
                setStep("details");
              }}
            >
              Change details
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              loading={verifyMutation.isPending}
            >
              Verify &amp; activate account
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

// ── Bits ──────────────────────────────────────────────────────────────────

const Pill = ({
  active,
  done,
  disabled,
  children,
}: {
  active?: boolean;
  done?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <li
    className={[
      "flex items-center gap-2 rounded-full px-3 py-1 border text-[10px] font-medium",
      active
        ? "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30"
        : done
          ? "border-emerald-500/30 text-emerald-600"
          : disabled
            ? "border-slate-200 text-slate-400 dark:border-slate-800"
            : "border-slate-300 text-slate-500 dark:border-slate-700",
    ].join(" ")}
  >
    {children}
  </li>
);
