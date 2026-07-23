"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldCheck, SkipForward } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { mfaApi } from "@/lib/api/endpoints/mfa";
import { ApiError } from "@/lib/api/problem";

/**
 * Post-org MFA setup step.
 *
 * Shown right after a user creates or joins an organisation.
 * They can set up TOTP here or skip — either way they land in /console.
 * This page uses the normal access token (from session store) to call
 * the TOTP enrolment endpoints — no separate setupToken needed.
 */

const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Enter the 6-digit code from your authenticator app"),
});
type TotpValues = z.infer<typeof totpSchema>;

type Step = "prompt" | "enrol" | "verify";

export default function OnboardingSetupMfaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("prompt");
  const [formError, setFormError] = useState<string | null>(null);
  const [enrollmentSecret, setEnrollmentSecret] = useState<string | null>(null);
  const [enrollmentFactorId, setEnrollmentFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Start TOTP enrollment
  const startMutation = useMutation({
    mutationFn: () => mfaApi.enrollTotp(),
    onSuccess: (data) => {
      setEnrollmentSecret(data.secret);
      setEnrollmentFactorId(data.factorId ?? null);
      setQrDataUrl(data.qrCodeDataUri ?? null);
      setStep("verify");
    },
    onError: (error: ApiError) => {
      setFormError(error.problem.detail ?? error.problem.title);
    },
  });

  // Verify TOTP and activate factor
  const { register, handleSubmit, formState: { errors } } = useForm<TotpValues>({
    resolver: zodResolver(totpSchema),
  });

  const verifyMutation = useMutation({
    mutationFn: (values: TotpValues) =>
      mfaApi.verifyTotp({ factorId: enrollmentFactorId!, code: values.code }),
    onSuccess: () => {
      toast.success("TOTP authenticator set up successfully!");
      router.push("/console");
    },
    onError: (error: ApiError) => {
      if (error.status === 400 || error.status === 422) {
        setFormError("That code is incorrect. Check your authenticator app and try again.");
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
            <Shield className="h-5 w-5 text-indigo-600" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Secure your account
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Add two-factor authentication to protect your account. You can always
          do this later from your Security settings.
        </p>
      </header>

      {formError && (
        <Alert variant="error" title="Something went wrong">
          {formError}
        </Alert>
      )}

      {/* Step: prompt */}
      {step === "prompt" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setStep("enrol");
            }}
            className="group w-full flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-left transition hover:border-indigo-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Set up TOTP authenticator</span>
              <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
                Use Google Authenticator, Authy, or any TOTP app. Scan a QR code
                and confirm with a 6-digit code.
              </span>
            </span>
          </button>

          <Button
            type="button"
            variant="ghost"
            block
            onClick={() => router.push("/console")}
            className="text-slate-500"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip for now — I&apos;ll set this up later
          </Button>
        </div>
      )}

      {/* Step: enrol (instructions + start) */}
      {step === "enrol" && (
        <div className="space-y-4">
          <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
            <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
            <li>Click &quot;Generate QR code&quot; below</li>
            <li>Scan the QR code with your app</li>
            <li>Enter the 6-digit code to confirm</li>
          </ol>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep("prompt")}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              size="lg"
              loading={startMutation.isPending}
              onClick={() => {
                setFormError(null);
                startMutation.mutate();
              }}
            >
              Generate QR code
            </Button>
          </div>
        </div>
      )}

      {/* Step: verify */}
      {step === "verify" && (
        <form
          onSubmit={handleSubmit((v) => {
            setFormError(null);
            verifyMutation.mutate(v);
          })}
          className="space-y-5"
          noValidate
        >
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="TOTP QR code"
                width={200}
                height={200}
                className="rounded-lg"
              />
              {enrollmentSecret && (
                <details className="w-full text-center">
                  <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Can&apos;t scan? Show manual entry key
                  </summary>
                  <code className="mt-2 block break-all rounded bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 select-all">
                    {enrollmentSecret}
                  </code>
                </details>
              )}
            </div>
          )}

          <Field>
            <Label htmlFor="totp-code">Enter the 6-digit code from your app</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              invalid={!!errors.code}
              {...register("code")}
            />
            <FieldError message={errors.code?.message} />
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("enrol")}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              loading={verifyMutation.isPending}
            >
              Confirm &amp; activate
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            block
            onClick={() => router.push("/console")}
            className="text-slate-500"
          >
            Skip for now
          </Button>
        </form>
      )}
    </div>
  );
}
