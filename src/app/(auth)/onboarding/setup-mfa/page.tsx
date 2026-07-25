"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
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
 * Mandatory TOTP setup step shown immediately after a user creates their
 * organization. MFA is required — there is no skip option.
 *
 * Steps:
 *   1. "enrol"  — instructions + generate QR code button
 *   2. "verify" — scan QR, enter 6-digit code to confirm
 */

const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Enter the 6-digit code from your authenticator app"),
});
type TotpValues = z.infer<typeof totpSchema>;

type Step = "enrol" | "verify";

export default function OnboardingSetupMfaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("enrol");
  const [formError, setFormError] = useState<string | null>(null);
  const [enrollmentSecret, setEnrollmentSecret] = useState<string | null>(null);
  const [enrollmentFactorId, setEnrollmentFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Start TOTP enrollment — calls backend to generate secret + QR code
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

  // Verify the 6-digit code to activate the factor
  const { register, handleSubmit, formState: { errors } } = useForm<TotpValues>({
    resolver: zodResolver(totpSchema),
  });

  const verifyMutation = useMutation({
    mutationFn: (values: TotpValues) =>
      mfaApi.verifyTotp({ factorId: enrollmentFactorId!, code: values.code }),
    onSuccess: () => {
      toast.success("Two-factor authentication enabled. Your account is secure!");
      router.push("/console");
    },
    onError: (error: ApiError) => {
      if (error.status === 400 || error.status === 422) {
        setFormError(
          "That code is incorrect. Check your authenticator app and try again.",
        );
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
            Set up two-factor authentication
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          To protect your account and organization, you must set up a TOTP
          authenticator app before accessing the console.
        </p>
      </header>

      {formError && (
        <Alert variant="error" title="Something went wrong">
          {formError}
        </Alert>
      )}

      {/* Step 1: instructions + generate QR */}
      {step === "enrol" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold">How to set up</h2>
            <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
              <li>
                Install an authenticator app on your phone — e.g.{" "}
                <strong>Google Authenticator</strong>, <strong>Authy</strong>, or{" "}
                <strong>1Password</strong>.
              </li>
              <li>Click <strong>Generate QR code</strong> below.</li>
              <li>Open your app, tap <em>Add account</em>, and scan the QR code.</li>
              <li>Enter the 6-digit code your app shows to confirm.</li>
            </ol>
          </div>

          <Button
            type="button"
            className="w-full"
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
      )}

      {/* Step 2: scan QR + enter code */}
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
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-sm font-medium text-center">
                Scan this QR code with your authenticator app
              </p>
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
            <Label htmlFor="totp-code">
              Enter the 6-digit code from your authenticator app
            </Label>
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
              onClick={() => {
                setFormError(null);
                setStep("enrol");
              }}
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
        </form>
      )}
    </div>
  );
}
