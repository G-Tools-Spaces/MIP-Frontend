"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { onboardingApi } from "@/lib/api/endpoints/onboarding";
import { ApiError } from "@/lib/api/problem";

/**
 * Flow 2 — Setup your business. Submits an OrganizationCreationRequest
 * which lands in the Global Admin queue. See ONBOARDING_FLOW.md §4.
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
  businessEmail: z
    .string()
    .trim()
    .email("Enter a valid business email")
    .optional()
    .or(z.literal("")),
  businessPhone: z
    .string()
    .trim()
    .regex(/^\+?[1-9][0-9]{6,14}$/, "Use E.164 format")
    .optional()
    .or(z.literal("")),
  businessWebsite: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal("")),
  businessSize: z.string().trim().max(50).optional().or(z.literal("")),
  businessIndustry: z.string().trim().max(100).optional().or(z.literal("")),
  businessCountry: z
    .string()
    .trim()
    .length(2, "Use ISO 3166-1 alpha-2, e.g. IN")
    .optional()
    .or(z.literal("")),
  justification: z.string().trim().max(2000).optional().or(z.literal("")),
  invitees: z.array(inviteeSchema).max(20, "Up to 20 invitees at a time"),
});

type Values = z.infer<typeof schema>;

export default function SetupBusinessPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      businessEmail: "",
      businessPhone: "",
      businessWebsite: "",
      businessSize: "",
      businessIndustry: "",
      businessCountry: "",
      justification: "",
      invitees: [],
    },
  });
  const invitees = useFieldArray({ control: form.control, name: "invitees" });

  const submitMutation = useMutation({
    mutationFn: (values: Values) =>
      onboardingApi.submitOrgCreationRequest({
        name: values.name,
        slug: values.slug,
        businessEmail: values.businessEmail || undefined,
        businessPhone: values.businessPhone || undefined,
        businessWebsite: values.businessWebsite || undefined,
        businessSize: values.businessSize || undefined,
        businessIndustry: values.businessIndustry || undefined,
        businessCountry: values.businessCountry?.toUpperCase() || undefined,
        justification: values.justification || undefined,
        invitees: values.invitees.length ? values.invitees : undefined,
      }),
    onSuccess: () => {
      toast.success(
        "Business submitted for review. You'll be notified when a platform admin decides.",
      );
      router.push("/onboarding/status");
    },
    onError: (error: ApiError) =>
      setFormError(error.problem.detail ?? error.problem.title),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Setup your business
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tell us about your business. A platform admin will review your
          request; once approved, you&rsquo;ll be the owner of the new
          organization.
        </p>
      </header>

      {formError && (
        <Alert variant="error" title="Couldn't submit request">
          {formError}
        </Alert>
      )}

      <form
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          submitMutation.mutate(v);
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

          <Field>
            <Label htmlFor="businessEmail">Business email</Label>
            <Input
              id="businessEmail"
              type="email"
              placeholder="ops@acme.com"
              invalid={!!form.formState.errors.businessEmail}
              {...form.register("businessEmail")}
            />
            <FieldError
              message={form.formState.errors.businessEmail?.message}
            />
          </Field>

          <Field>
            <Label htmlFor="businessPhone">Business phone</Label>
            <Input
              id="businessPhone"
              placeholder="+919876543210"
              invalid={!!form.formState.errors.businessPhone}
              {...form.register("businessPhone")}
            />
            <FieldError
              message={form.formState.errors.businessPhone?.message}
            />
          </Field>

          <Field>
            <Label htmlFor="businessWebsite">Website</Label>
            <Input
              id="businessWebsite"
              placeholder="https://acme.com"
              {...form.register("businessWebsite")}
            />
          </Field>

          <Field>
            <Label htmlFor="businessCountry">Country (ISO)</Label>
            <Input
              id="businessCountry"
              placeholder="IN"
              maxLength={2}
              invalid={!!form.formState.errors.businessCountry}
              {...form.register("businessCountry")}
            />
            <FieldError
              message={form.formState.errors.businessCountry?.message}
            />
          </Field>

          <Field>
            <Label htmlFor="businessSize">Company size</Label>
            <Input
              id="businessSize"
              placeholder="e.g. 11-50"
              {...form.register("businessSize")}
            />
          </Field>

          <Field>
            <Label htmlFor="businessIndustry">Industry</Label>
            <Input
              id="businessIndustry"
              placeholder="Fintech"
              {...form.register("businessIndustry")}
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="justification">Why do you need this?</Label>
          <Textarea
            id="justification"
            rows={3}
            placeholder="Optional — briefly describe how you'll use MeiCrypt."
            {...form.register("justification")}
          />
        </Field>

        {/* Invitees */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Invite your team (optional)</h2>
              <p className="text-xs text-slate-500">
                We&rsquo;ll materialise invitations the moment your business is
                approved.
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
            loading={submitMutation.isPending}
          >
            Submit for review
          </Button>
        </div>
      </form>

      <p className="text-xs text-slate-500 pt-2">
        Rather join an existing org?{" "}
        <Link href="/onboarding/join" className="underline">
          Join a business
        </Link>
        .
      </p>
    </div>
  );
}
