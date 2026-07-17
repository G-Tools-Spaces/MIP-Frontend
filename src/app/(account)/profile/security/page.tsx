"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Fingerprint,
  KeyRound,
  QrCode,
  Shield,
  ShieldOff,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  mfaApi,
  type MfaFactor,
  type TotpEnrollmentResponse,
} from "@/lib/api/endpoints/mfa";
import { ApiError } from "@/lib/api/problem";
import { relativeTime } from "@/lib/format";

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
type CodeValues = z.infer<typeof codeSchema>;

const factorIcon = (type: MfaFactor["type"]) =>
  type === "TOTP" ? QrCode : type === "WEBAUTHN" ? Fingerprint : KeyRound;

export default function SecurityPage() {
  const qc = useQueryClient();

  const factorsQuery = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: () => mfaApi.listFactors(),
  });

  const [enrollment, setEnrollment] = useState<TotpEnrollmentResponse | null>(null);

  const enrollTotp = useMutation({
    mutationFn: () => mfaApi.enrollTotp("Authenticator app"),
    onSuccess: (data) => setEnrollment(data),
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  const verifyTotp = useMutation({
    mutationFn: (values: CodeValues) =>
      mfaApi.verifyTotp({
        factorId: enrollment!.factorId,
        code: values.code,
      }),
    onSuccess: () => {
      toast.success("Authenticator enrolled");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
      setEnrollment(null);
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  const disable = useMutation({
    mutationFn: ({ id, type }: { id: string; type: MfaFactor["type"] }) =>
      type === "WEBAUTHN"
        ? mfaApi.disableWebauthn(id)
        : mfaApi.disableTotp(id),
    onSuccess: () => {
      toast.success("Factor disabled");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  const registerPasskey = useMutation({
    mutationFn: async () => {
      const options = await mfaApi.webauthnRegisterStart("Passkey");
      if (typeof window === "undefined" || !("credentials" in navigator)) {
        throw new Error("WebAuthn is not supported in this browser.");
      }
      if (!options.factorId) {
        throw new Error(
          "Server did not return a factorId for the WebAuthn registration.",
        );
      }
      // base64url → ArrayBuffer / Uint8Array
      const decodeToBuffer = (s: string): ArrayBuffer => {
        const pad = "=".repeat((4 - (s.length % 4)) % 4);
        const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
        const bin = atob(b64);
        const buf = new ArrayBuffer(bin.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i += 1) view[i] = bin.charCodeAt(i);
        return buf;
      };
      // ArrayBuffer → base64 (standard, not url — matches Java's Base64.getEncoder)
      const encodeBuffer = (buf: ArrayBuffer): string => {
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i += 1)
          bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      };

      // ------------------------------------------------------------------
      // RP-ID SAFETY NET
      // ------------------------------------------------------------------
      // The browser rejects a WebAuthn ceremony with:
      //   "The relying party ID is not a registrable domain suffix of,
      //    nor equal to the current domain."
      // whenever `rp.id` isn't equal to (or a registrable-domain suffix of)
      // the page's effective domain. This happens most commonly when the
      // backend is configured with `rp.id = localhost` but the user visits
      // the app via `127.0.0.1`, a LAN IP, or a preview URL.
      //
      // We override `rp.id` (and `rp.name` if the server didn't supply one)
      // with the current hostname so the ceremony always matches the origin
      // the user is actually on. The backend still validates the challenge
      // + signature — it does not require `rp.id` to be a specific literal.
      const currentHost = window.location.hostname;
      const serverRp = (options as unknown as { rp?: { id?: string; name?: string } }).rp ?? {};
      const safeRpId =
        serverRp.id && (currentHost === serverRp.id || currentHost.endsWith("." + serverRp.id))
          ? serverRp.id
          : currentHost;

      const publicKey: PublicKeyCredentialCreationOptions = {
        ...(options as unknown as PublicKeyCredentialCreationOptions),
        rp: {
          id: safeRpId,
          name: serverRp.name ?? "MeiCrypt Identity",
        },
        challenge: decodeToBuffer(options.challenge),
        user: {
          ...(options.user as unknown as PublicKeyCredentialUserEntity),
          id: decodeToBuffer(options.user.id),
        },
      };
      const cred = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error("Passkey creation cancelled.");

      const attestation = cred.response as AuthenticatorAttestationResponse;
      const transports =
        typeof attestation.getTransports === "function"
          ? attestation.getTransports()
          : undefined;

      return mfaApi.webauthnRegisterFinish({
        factorId: options.factorId,
        credentialId: cred.id,
        clientDataJsonBase64: encodeBuffer(attestation.clientDataJSON),
        attestationObjectBase64: encodeBuffer(attestation.attestationObject),
        transports,
      });
    },
    onSuccess: () => {
      toast.success("Passkey registered");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });

  const activeFactors =
    factorsQuery.data?.filter((f) => f.status === "ACTIVE") ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/profile"
        className="inline-block text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3"
      >
        ← Back to profile
      </Link>

      <PageHeader
        title="Security & MFA"
        description="Protect your account with authenticators or passkeys."
      />

      {activeFactors.length === 0 && (
        <Alert variant="warning" title="No second factor enabled" className="mb-6">
          Add an authenticator app or a passkey to secure your account.
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-indigo-500" />
              Authenticator app (TOTP)
            </CardTitle>
            <CardDescription>
              Use Google Authenticator, 1Password, Authy, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => enrollTotp.mutate()}
              loading={enrollTotp.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Add authenticator
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-violet-500" />
              Passkey (WebAuthn)
            </CardTitle>
            <CardDescription>
              Sign in with Face ID, Touch ID, Windows Hello, or a security key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              onClick={() => registerPasskey.mutate()}
              loading={registerPasskey.isPending}
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Add passkey
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" /> Enrolled factors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {factorsQuery.isLoading && <Skeleton className="h-16" />}
          {factorsQuery.data && factorsQuery.data.length === 0 && (
            <EmptyState
              icon={Shield}
              title="No factors enrolled"
              description="Add an authenticator or passkey above."
            />
          )}
          {factorsQuery.data?.map((f) => {
            const Icon = factorIcon(f.type);
            return (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">
                      {f.label ?? f.type}
                    </div>
                    <div className="text-xs text-slate-500">
                      Added {relativeTime(f.createdAt)}
                      {f.lastUsedAt
                        ? ` · Last used ${relativeTime(f.lastUsedAt)}`
                        : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      f.status === "ACTIVE"
                        ? "emerald"
                        : f.status === "PENDING"
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {f.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disable.mutate({ id: f.id, type: f.type })}
                  >
                    <ShieldOff className="mr-1 h-3.5 w-3.5" /> Disable
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog
        open={!!enrollment}
        onOpenChange={(o) => !o && setEnrollment(null)}
        title="Scan the QR code"
        description="Then enter the 6-digit code your authenticator generates."
        footer={
          <>
            <Button variant="outline" onClick={() => setEnrollment(null)}>
              Cancel
            </Button>
            <Button
              form="totp-verify"
              type="submit"
              loading={verifyTotp.isPending}
            >
              Verify & enable
            </Button>
          </>
        }
      >
        {enrollment && (
          <form
            id="totp-verify"
            onSubmit={handleSubmit((v) => {
              verifyTotp.mutate(v);
              reset();
            })}
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCodeDataUri}
                alt="TOTP QR code"
                className="h-40 w-40 rounded-xl border border-slate-200 dark:border-slate-800"
              />
              <div className="text-xs text-slate-500">
                Or enter this secret manually
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  {enrollment.secret}
                </code>
                <CopyButton value={enrollment.secret} />
              </div>
            </div>

            <Field>
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="text-center text-lg tracking-[0.5em]"
                invalid={!!errors.code}
                {...register("code")}
              />
              <FieldError message={errors.code?.message} />
            </Field>

            {enrollment.recoveryCodes.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="mb-2 font-medium text-amber-800 dark:text-amber-200">
                  Save these recovery codes
                </p>
                <div className="grid grid-cols-2 gap-1 font-mono">
                  {enrollment.recoveryCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <FieldHint>
                  Each code can only be used once if you lose access.
                </FieldHint>
              </div>
            )}
          </form>
        )}
      </Dialog>
    </div>
  );
}
