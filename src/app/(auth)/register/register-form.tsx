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
 * Three-step onboarding wizard implementing the flow described in
 * ONBOARDING_FLOW.md §2:
 *
 *   Step 1 — Identity lookup    (email OR phone)
 *   Step 2 — Registration form  (name, email, phone, password) → OTP issued
 *   Step 3 — OTP verification   → account ACTIVE, redirect to /onboarding/choose
 *
 * The wizard is intentionally self-contained: it does not need auth
 * because Steps 1–3 all target the public onboarding endpoints. Once
 * verified, the user must log in normally (org context is chosen in the
 * next screen).
 */

// ── Schemas ───────────────────────────────────────────────────────────────

const lookupSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
    phoneE164: z
      .string()
      .trim()
      .regex(/^\+?[1-9][0-9]{6,14}$/, "Use E.164 format, e.g. +919876543210")
      .optional()
      .or(z.literal("")),
  })
  .refine((v) => (v.email ?? "") !== "" || (v.phoneE164 ?? "") !== "", {
    message: "Enter your email or phone number",
    path: ["email"],
  });

type LookupValues = z.infer<typeof lookupSchema>;

const detailsSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name").max(100),
  lastName: z.string().trim().min(1, "Enter your last name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+?[1-9][0-9]{6,14}$/, "Use E.164 format, e.g. +919876543210"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type DetailsValues = z.infer<typeof detailsSchema>;

const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, "Enter the 4–8 digit code sent to your phone"),
});

type OtpValues = z.infer<typeof otpSchema>;

// ── Component ─────────────────────────────────────────────────────────────

type Step = "lookup" | "details" | "otp";

type StartedContext = {
  verificationId: string;
  phoneE164: string;
  email: string;
  expiresAt: string;
  maxAttempts: number;
};

export const RegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [step, setStep] = useState<Step>("lookup");
  const [formError, setFormError] = useState<string | null>(null);

  const [prefill, setPrefill] = useState<{
    email?: string;
    phoneE164?: string;
  }>({});
  const [started, setStarted] = useState<StartedContext | null>(null);

  // ── Step 1 — identity lookup ──────────────────────────────────────────

  const lookupForm = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { email: "", phoneE164: "" },
  });

  const lookupMutation = useMutation({
    mutationFn: async (values: LookupValues) => {
      const payload = values.email
        ? { email: values.email }
        : { phoneE164: values.phoneE164 as string };
      return onboardingApi.identityLookup(payload);
    },
    onSuccess: (res, values) => {
      if (res.exists) {
        toast("This account already exists — please log in.");
        const q = new URLSearchParams();
        if (values.email) q.set("email", values.email);
        if (returnTo) q.set("returnTo", returnTo);
        router.push(`/login${q.toString() ? `?${q}` : ""}`);
        return;
      }
      setPrefill({
        email: values.email || undefined,
        phoneE164: values.phoneE164 || undefined,
      });
      setStep("details");
    },
    onError: (error: ApiError) =>
      setFormError(error.problem.detail ?? error.problem.title),
  });

  // ── Step 2 — details + issue OTP ─────────────────────────────────────

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: prefill.email ?? "",
      phoneE164: prefill.phoneE164 ?? "",
      password: "",
    },
  });

  const startMutation = useMutation({
    mutationFn: (values: DetailsValues) =>
      onboardingApi.startRegistration(values),
    onSuccess: (res, values) => {
      setStarted({
        verificationId: res.verificationId,
        phoneE164: res.phoneE164,
        email: values.email,
        expiresAt: res.expiresAt,
        maxAttempts: res.maxAttempts,
      });
      toast.success(`OTP sent to ${res.phoneE164}`);
      setStep("otp");
    },
    onError: (error: ApiError) => {
      if (error.status === 400 && error.problem.detail?.includes("already")) {
        setFormError(error.problem.detail);
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  // ── Step 3 — verify OTP ──────────────────────────────────────────────

  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema) });

  const verifyMutation = useMutation({
    mutationFn: (values: OtpValues) =>
      onboardingApi.verifyRegistrationOtp({
        verificationId: started!.verificationId,
        code: values.code,
      }),
    onSuccess: () => {
      toast.success("Your account is ready — please log in to continue.");
      const q = new URLSearchParams({
        registered: "1",
        email: started?.email ?? "",
      });
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
        <Pill active={step === "lookup"} done={step !== "lookup"}>
          1. Identity
        </Pill>
        <Pill
          active={step === "details"}
          done={step === "otp"}
          disabled={step === "lookup"}
        >
          2. Your details
        </Pill>
        <Pill active={step === "otp"} disabled={step !== "otp"}>
          3. Verify OTP
        </Pill>
      </ol>

      {formError && (
        <Alert variant="error" title="Something went wrong">
          {formError}
        </Alert>
      )}

      {step === "lookup" && (
        <form
          onSubmit={lookupForm.handleSubmit((v) => {
            setFormError(null);
            lookupMutation.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter your work email or phone number to get started. We&rsquo;ll
            check if you already have an account.
          </p>

          <Field>
            <Label htmlFor="lookup-email">Email address</Label>
            <Input
              id="lookup-email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              invalid={!!lookupForm.formState.errors.email}
              {...lookupForm.register("email")}
            />
            <FieldError message={lookupForm.formState.errors.email?.message} />
          </Field>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="mx-3 flex-shrink text-xs uppercase tracking-wide text-slate-400">
              or
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <Field>
            <Label htmlFor="lookup-phone">Mobile number (E.164)</Label>
            <Input
              id="lookup-phone"
              placeholder="+919876543210"
              autoComplete="tel"
              invalid={!!lookupForm.formState.errors.phoneE164}
              {...lookupForm.register("phoneE164")}
            />
            <FieldError
              message={lookupForm.formState.errors.phoneE164?.message}
            />
          </Field>

          <Button type="submit" block size="lg" loading={lookupMutation.isPending}>
            Continue
          </Button>
        </form>
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
            Great — let&rsquo;s create your account. We&rsquo;ll send a one-time
            code to your phone to verify it.
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
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={!!detailsForm.formState.errors.email}
              {...detailsForm.register("email")}
            />
            <FieldError message={detailsForm.formState.errors.email?.message} />
          </Field>

          <Field>
            <Label htmlFor="phoneE164">Mobile number</Label>
            <Input
              id="phoneE164"
              autoComplete="tel"
              placeholder="+919876543210"
              invalid={!!detailsForm.formState.errors.phoneE164}
              {...detailsForm.register("phoneE164")}
            />
            {detailsForm.formState.errors.phoneE164 ? (
              <FieldError
                message={detailsForm.formState.errors.phoneE164.message}
              />
            ) : (
              <FieldHint>Use E.164 format including the country code.</FieldHint>
            )}
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
                At least 12 characters, with upper, lower &amp; a number.
              </FieldHint>
            )}
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("lookup")}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              loading={startMutation.isPending}
            >
              Send OTP
            </Button>
          </div>
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
            We sent a verification code to <b>{started.phoneE164}</b>. Enter it
            below to activate your account. You have up to{" "}
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
              Verify &amp; create account
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
