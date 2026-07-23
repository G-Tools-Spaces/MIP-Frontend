"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { mfaApi, TotpEnrollmentResponse } from "@/lib/api/endpoints/mfa";
import { ApiError } from "@/lib/api/problem";
import { api } from "@/lib/api/client";

/**
 * MFA setup page — shown immediately after email verification during
 * registration. The user MUST enrol TOTP or a Passkey before they can log in.
 *
 * The page receives `setupToken`, `email`, and `userId` via query params.
 * All MFA API calls go out with `Authorization: Bearer <setupToken>`.
 */

// ── TOTP schema ───────────────────────────────────────────────────────────

const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});
type TotpCodeValues = z.infer<typeof totpCodeSchema>;

// ── Component ─────────────────────────────────────────────────────────────

type MfaMethod = "choose" | "totp" | "passkey";
type TotpStep = "enroll" | "verify";

export const SetupMfaClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupToken = searchParams.get("setupToken") ?? "";
  const email = searchParams.get("email") ?? "";
  const returnTo = searchParams.get("returnTo");

  const [method, setMethod] = useState<MfaMethod>("choose");
  const [totpStep, setTotpStep] = useState<TotpStep>("enroll");
  const [totpData, setTotpData] = useState<TotpEnrollmentResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  // Inject the setup token into a temporary interceptor so every mfaApi
  // call uses it instead of the (not-yet-existing) full access token.
  const interceptorRef = useRef<number | null>(null);
  useEffect(() => {
    if (!setupToken) return;
    interceptorRef.current = api.interceptors.request.use((config) => {
      config.headers["Authorization"] = `Bearer ${setupToken}`;
      return config;
    });
    return () => {
      if (interceptorRef.current !== null) {
        api.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, [setupToken]);

  // Guard: if no setupToken, go back to register
  useEffect(() => {
    if (!setupToken) router.replace("/register");
  }, [setupToken, router]);

  // ── TOTP enrol mutation ────────────────────────────────────────────────

  const enrollMutation = useMutation({
    mutationFn: () => mfaApi.enrollTotp("Authenticator app"),
    onSuccess: (data) => {
      setTotpData(data);
      setTotpStep("verify");
      setFormError(null);
    },
    onError: (err: ApiError) => {
      setFormError(err.problem?.detail ?? "Failed to start TOTP enrolment.");
    },
  });

  // ── TOTP verify mutation ───────────────────────────────────────────────

  const totpForm = useForm<TotpCodeValues>({
    resolver: zodResolver(totpCodeSchema),
  });

  const verifyMutation = useMutation({
    mutationFn: (values: TotpCodeValues) =>
      mfaApi.verifyTotp({ factorId: totpData!.factorId, code: values.code }),
    onSuccess: () => {
      toast.success("Authenticator app enrolled — please log in.");
      redirectToLogin();
    },
    onError: (err: ApiError) => {
      setFormError(err.problem?.detail ?? "Code not accepted. Try again.");
    },
  });

  // ── Passkey registration ───────────────────────────────────────────────

  const handlePasskey = async () => {
    setFormError(null);
    setPasskeyBusy(true);
    try {
      const opts = await mfaApi.webauthnRegisterStart("My Passkey");

      const challengeBytes = base64UrlDecode(opts.challenge);
      const userIdBytes = base64UrlDecode(opts.user.id);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: opts.rp,
          user: {
            id: userIdBytes,
            name: opts.user.name,
            displayName: opts.user.displayName,
          },
          pubKeyCredParams: opts.pubKeyCredParams,
          timeout: opts.timeout ?? 60000,
          attestation: opts.attestation ?? "none",
          authenticatorSelection: opts.authenticatorSelection,
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error("Passkey creation cancelled.");

      const response = credential.response as AuthenticatorAttestationResponse;
      await mfaApi.webauthnRegisterFinish({
        factorId: opts.factorId ?? "",
        credentialId: credential.id,
        clientDataJsonBase64: bufferToBase64Url(response.clientDataJSON),
        attestationObjectBase64: bufferToBase64Url(response.attestationObject),
        transports:
          typeof response.getTransports === "function"
            ? response.getTransports()
            : [],
      });

      toast.success("Passkey registered — please log in.");
      redirectToLogin();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setFormError(detail ?? "Passkey registration failed.");
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Passkey registration failed.");
      }
    } finally {
      setPasskeyBusy(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const redirectToLogin = () => {
    const q = new URLSearchParams({ registered: "1", email });
    if (returnTo) q.set("returnTo", returnTo);
    router.push(`/login?${q}`);
  };

  // ── Render — choose ───────────────────────────────────────────────────

  if (method === "choose") {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Secure your account
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Before you can log in, you must set up at least one second factor.
          Choose an option below:
        </p>

        {formError && (
          <Alert variant="error" title="Error">
            {formError}
          </Alert>
        )}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => {
              setMethod("totp");
              enrollMutation.mutate();
            }}
            className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
          >
            <span className="text-2xl">🔐</span>
            <span>
              <strong className="block text-sm font-medium text-slate-900 dark:text-white">
                Authenticator app (TOTP)
              </strong>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Use Google Authenticator, Authy, or any TOTP app.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("passkey");
              handlePasskey();
            }}
            className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
          >
            <span className="text-2xl">🔑</span>
            <span>
              <strong className="block text-sm font-medium text-slate-900 dark:text-white">
                Passkey (biometric / hardware key)
              </strong>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Use Face ID, Touch ID, Windows Hello, or a hardware security key.
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── Render — TOTP enroll step ─────────────────────────────────────────

  if (method === "totp" && totpStep === "enroll") {
    return (
      <div className="flex items-center justify-center py-8">
        {enrollMutation.isPending ? (
          <p className="text-sm text-slate-500">Generating QR code…</p>
        ) : formError ? (
          <Alert variant="error" title="Error">{formError}</Alert>
        ) : null}
      </div>
    );
  }

  // ── Render — TOTP verify step ─────────────────────────────────────────

  if (method === "totp" && totpStep === "verify" && totpData) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Scan QR code
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Open your authenticator app and scan the QR code below.
        </p>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={totpData.qrCodeDataUri}
            alt="TOTP QR code"
            className="w-48 h-48 rounded-lg border border-slate-200 dark:border-slate-700"
          />
        </div>

        <details className="text-xs text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer">Can&rsquo;t scan? Enter manually</summary>
          <code className="block mt-2 break-all rounded bg-slate-100 dark:bg-slate-800 p-2">
            {totpData.secret}
          </code>
        </details>

        {formError && (
          <Alert variant="error" title="Error">
            {formError}
          </Alert>
        )}

        <form
          onSubmit={totpForm.handleSubmit((v) => {
            setFormError(null);
            verifyMutation.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <Field>
            <Label htmlFor="totp-code">6-digit code from your app</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.4em]"
              invalid={!!totpForm.formState.errors.code}
              {...totpForm.register("code")}
            />
            <FieldError message={totpForm.formState.errors.code?.message} />
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMethod("choose");
                setTotpStep("enroll");
                setTotpData(null);
                setFormError(null);
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
              Verify &amp; continue
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Render — passkey busy state ───────────────────────────────────────

  if (method === "passkey") {
    return (
      <div className="space-y-4">
        {formError && (
          <Alert variant="error" title="Passkey registration failed">
            {formError}
          </Alert>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
          {passkeyBusy
            ? "Follow your browser's passkey prompt…"
            : formError
              ? "Something went wrong."
              : "Registering passkey…"}
        </p>
        {formError && (
          <Button
            variant="ghost"
            block
            onClick={() => {
              setMethod("choose");
              setFormError(null);
            }}
          >
            Try a different method
          </Button>
        )}
      </div>
    );
  }

  return null;
};

// ── Base64url helpers ─────────────────────────────────────────────────────

function base64UrlDecode(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
