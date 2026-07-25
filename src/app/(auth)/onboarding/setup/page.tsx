"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { onboardingApi } from "@/lib/api/endpoints/onboarding";
import { ApiError } from "@/lib/api/problem";
import { useSession } from "@/stores/session-store";
import { tokenStore } from "@/lib/auth/token-store";
import { OnboardingAuthGuard } from "@/components/onboarding/onboarding-auth-guard";

/**
 * Flow 2 — Setup your business.
 *
 * Creates the organization instantly (no admin approval queue). The caller
 * becomes the OWNER in the same backend transaction, the SPA session is
 * updated with the new org context, and the user is routed directly to
 * /console — ready to use the product immediately.
 */

const inviteeSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
});

const schema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(255),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(100)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Only lowercase letters, numbers and hyphens",
    ),
  invitees: z.array(inviteeSchema).max(20, "Up to 20 invitees at a time"),
});

type Values = z.infer<typeof schema>;

export default function SetupBusinessPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const user = useSession((s) => s.user);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      invitees: [],
    },
  });
  const invitees = useFieldArray({ control: form.control, name: "invitees" });

  const createMutation = useMutation({
    mutationFn: (values: Values) =>
      onboardingApi.createOrganization({
        name: values.name,
        slug: values.slug,
        invitees: values.invitees.length ? values.invitees : undefined,
      }),
    onSuccess: (data) => {
      // The backend returns a fresh org-bound access + refresh token pair.
      // We must replace the stale org-less token in the store so that all
      // subsequent API calls (e.g. create application) carry the correct
      // org_id claim and pass RBAC checks without a second login round-trip.
      const existing = tokenStore.get();
      setSession({
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        organizationId: data.organizationId,
        orgSlug: data.slug,
        user: existing?.user ?? {
          id: user?.id ?? "",
          email: user?.email ?? "",
          displayName: user?.displayName ?? "",
          emailVerified: user?.emailVerified ?? false,
        },
      });
      toast.success(`"${data.name}" created! Let's secure your account.`);
      // Route to the post-org MFA setup step before entering the console.
      router.push("/onboarding/setup-mfa");
    },
    onError: (error: ApiError) => {
      if (error.status === 401 || error.status === 403) {
        setFormError(
          "Your session has expired. Please sign in again and try creating your organization.",
        );
      } else {
        setFormError(error.problem.detail ?? error.problem.title);
      }
    },
  });

  return (
    <OnboardingAuthGuard>
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your organization will be created instantly. You&rsquo;ll be the
          owner and can invite your team right away.
        </p>
      </header>

      {formError && (
        <Alert variant="error" title="Couldn't create organization">
          {formError}
        </Alert>
      )}

      <form
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          createMutation.mutate(v);
        })}
        className="space-y-5"
        noValidate
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              placeholder="Acme Inc."
              invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
            <FieldError message={form.formState.errors.name?.message} />
          </Field>

          <Field>
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              placeholder="acme-inc"
              invalid={!!form.formState.errors.slug}
              {...form.register("slug", {
                onChange: (e) => {
                  e.target.value = e.target.value.toLowerCase();
                },
              })}
            />
            {form.formState.errors.slug ? (
              <FieldError message={form.formState.errors.slug.message} />
            ) : (
              <FieldHint>Used in URLs, e.g. app.meicrypt.com/{"{slug}"}</FieldHint>
            )}
          </Field>
        </div>

        {/* Invitees */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Invite your team (optional)</h2>
              <p className="text-xs text-slate-500">
                Invitations are sent the moment your workspace is created.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                invitees.append({ email: "", role: "MEMBER" })
              }
              disabled={invitees.fields.length >= 20}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {invitees.fields.length === 0 && (
            <p className="text-xs text-slate-400">No invitees yet.</p>
          )}

          <div className="space-y-2">
            {invitees.fields.map((f, idx) => {
              const err = form.formState.errors.invitees?.[idx];
              return (
                <div key={f.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="teammate@acme.com"
                      invalid={!!err?.email}
                      {...form.register(`invitees.${idx}.email` as const)}
                    />
                    {err?.email?.message && (
                      <FieldError message={err.email.message} />
                    )}
                  </div>
                  <div className="w-40">
                    <Select
                      {...form.register(`invitees.${idx}.role` as const)}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                      <option value="GUEST">Guest</option>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => invitees.remove(idx)}
                    aria-label="Remove invitee"
                  >
                    <Trash2 className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

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
            loading={createMutation.isPending}
          >
            Create workspace
          </Button>
        </div>
      </form>

    </div>
    </OnboardingAuthGuard>
  );
}
