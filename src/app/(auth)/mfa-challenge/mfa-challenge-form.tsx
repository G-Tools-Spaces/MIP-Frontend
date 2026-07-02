"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";
import { useSession } from "@/stores/session-store";

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator"),
});

type Values = z.infer<typeof schema>;

export const MfaChallengeForm = () => {
  const router = useRouter();
  const challengeToken = useSession((s) => s.mfaChallengeToken);
  const challengeId = useSession((s) => s.mfaChallengeId);
  const status = useSession((s) => s.status);
  const orgSlug = useSession((s) => s.orgSlug);
  const mfaOrgId = useSession((s) => s.mfaOrganizationId);
  const setSession = useSession((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  // Once we successfully redeem the challenge, we call `setSession` which
  // clears `mfaChallengeToken` (as it should — the challenge is spent). But
  // the guard below re-runs on that change and would immediately bounce us
  // to /login, racing the `router.push("/console")` inside the mutation's
  // `onSuccess`. Latch a "verified" flag to suppress the bounce.
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // We need the opaque challenge *token* to redeem tokens; the id alone
    // isn't enough. If the token is missing (e.g. after a hard refresh)
    // send the user back to sign in — but never after a successful verify.
    if (verified) return;
    if (status === "authenticated") return;
    if (!challengeToken) {
      router.replace("/login");
    }
  }, [challengeToken, router, verified, status]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      authApi.mfaVerify({
        challengeToken: challengeToken ?? "",
        code: values.code,
        factorType: "TOTP",
        orgSlug: orgSlug ?? undefined,
        organizationId: mfaOrgId ?? undefined,
      }),
    onSuccess: (data) => {
      if (!data.user) {
        setFormError("Verification succeeded but no profile was returned.");
        return;
      }
      // Latch first so the guard-effect above ignores the token clear.
      setVerified(true);
      setSession({
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        user: data.user,
        orgSlug: data.orgSlug,
        organizationId: data.organizationId,
      });
      toast.success("Signed in");
      router.push("/console");
    },
    onError: (error: ApiError) => {
      if (error.status === 401 || error.status === 400) {
        setFormError("That code isn't right. Try again.");
      } else if (error.status === 410) {
        setFormError("Your challenge expired. Please sign in again.");
      } else if (error.status === 0) {
        setFormError("Unable to reach the MeiCrypt Identity service.");
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  // Silence unused-var warning: challengeId is exposed only for debugging.
  void challengeId;

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
        <Alert variant="error" title="Verification failed">
          {formError}
        </Alert>
      )}

      <Field>
        <Label htmlFor="code">Authentication code</Label>
        <Input
          id="code"
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

      <Button type="submit" block size="lg" loading={mutation.isPending}>
        Verify &amp; sign in
      </Button>
    </form>
  );
};
