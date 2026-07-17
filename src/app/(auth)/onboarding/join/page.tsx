"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import {
  onboardingApi,
  type ResolvedOrganizationDTO,
} from "@/lib/api/endpoints/onboarding";
import { ApiError } from "@/lib/api/problem";

/**
 * Flow 1 — Join an existing business. Two-stage form:
 *   1. Preview the organization by a colleague's email.
 *   2. Confirm + optional message → file a JoinRequest (PENDING).
 */

const previewSchema = z.object({
  colleagueEmail: z.string().trim().email("Enter a valid work email"),
});
type PreviewValues = z.infer<typeof previewSchema>;

const confirmSchema = z.object({
  message: z.string().max(1000).optional(),
});
type ConfirmValues = z.infer<typeof confirmSchema>;

export default function JoinBusinessPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedOrganizationDTO | null>(null);
  const [colleagueEmail, setColleagueEmail] = useState<string>("");

  const previewForm = useForm<PreviewValues>({
    resolver: zodResolver(previewSchema),
  });
  const confirmForm = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
  });

  const previewMutation = useMutation({
    mutationFn: (values: PreviewValues) =>
      onboardingApi.previewJoinTarget(values.colleagueEmail),
    onSuccess: (res, values) => {
      setResolved(res);
      setColleagueEmail(values.colleagueEmail);
    },
    onError: (error: ApiError) => {
      if (error.status === 404) {
        setFormError(
          "We couldn't find a business associated with that email. Ask your colleague to confirm their address.",
        );
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  const submitMutation = useMutation({
    mutationFn: (values: ConfirmValues) =>
      onboardingApi.createJoinRequest({
        colleagueEmail,
        message: values.message,
      }),
    onSuccess: () => {
      toast.success("Join request sent — your admin has been notified.");
      router.push("/onboarding/status");
    },
    onError: (error: ApiError) =>
      setFormError(error.problem.detail ?? error.problem.title),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Join an existing business
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Enter the email of a colleague already using MeiCrypt. We&rsquo;ll
          find their organization and ask an admin to approve you.
        </p>
      </header>

      {formError && (
        <Alert variant="error" title="We hit a snag">
          {formError}
        </Alert>
      )}

      {!resolved && (
        <form
          onSubmit={previewForm.handleSubmit((v) => {
            setFormError(null);
            previewMutation.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <Field>
            <Label htmlFor="colleagueEmail">Colleague&rsquo;s work email</Label>
            <Input
              id="colleagueEmail"
              type="email"
              placeholder="jane@company.com"
              autoComplete="email"
              invalid={!!previewForm.formState.errors.colleagueEmail}
              {...previewForm.register("colleagueEmail")}
            />
            {previewForm.formState.errors.colleagueEmail ? (
              <FieldError
                message={previewForm.formState.errors.colleagueEmail.message}
              />
            ) : (
              <FieldHint>
                Use anyone from the organization — we only need to identify
                which business you want to join.
              </FieldHint>
            )}
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/onboarding/choose")}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              loading={previewMutation.isPending}
            >
              Find business
            </Button>
          </div>
        </form>
      )}

      {resolved && (
        <form
          onSubmit={confirmForm.handleSubmit((v) => {
            setFormError(null);
            submitMutation.mutate(v);
          })}
          className="space-y-5"
          noValidate
        >
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              You&rsquo;re requesting access to
            </p>
            <p className="mt-1 text-lg font-semibold">{resolved.name}</p>
            <p className="text-sm text-slate-500">Slug: {resolved.slug}</p>
          </div>

          <Field>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              rows={3}
              placeholder="Hi team — I'm the new marketing hire."
              {...confirmForm.register("message")}
            />
            <FieldHint>
              This will be shown to the organization admin who reviews your
              request.
            </FieldHint>
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResolved(null);
                setColleagueEmail("");
              }}
            >
              Wrong business
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              loading={submitMutation.isPending}
            >
              Send join request
            </Button>
          </div>
        </form>
      )}

      <p className="text-xs text-slate-500 pt-2">
        Prefer to run your own?{" "}
        <Link href="/onboarding/setup" className="underline">
          Setup your business instead
        </Link>
        .
      </p>
    </div>
  );
}
