"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/problem";

export const VerifyEmailClient = () => {
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const triggered = useRef(false);

  const mutation = useMutation({
    mutationFn: (payload: { token: string }) => authApi.verifyEmail(payload),
  });

  useEffect(() => {
    if (!token || triggered.current) return;
    triggered.current = true;
    mutation.mutate({ token });
  }, [token, mutation]);

  if (!token) {
    return (
      <Alert variant="info" title="Check your inbox">
        {email
          ? `We've sent a verification link to ${email}. It expires in 24 hours.`
          : "We've sent a verification link to your email address. It expires in 24 hours."}
      </Alert>
    );
  }

  if (mutation.isPending || mutation.isIdle) {
    return (
      <Alert variant="info" title="Verifying…">
        One moment while we verify your email address.
      </Alert>
    );
  }

  if (mutation.isSuccess) {
    return (
      <Alert variant="success" title="Email verified">
        Your account is fully activated. You can now sign in.
      </Alert>
    );
  }

  const err = mutation.error as ApiError | undefined;
  return (
    <Alert variant="error" title="Verification failed">
      {err?.status === 410
        ? "This verification link has expired. Request a new one from the sign-in page."
        : (err?.problem.detail ??
          "We couldn't verify your email with that link.")}
    </Alert>
  );
};
