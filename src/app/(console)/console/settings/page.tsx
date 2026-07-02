"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, RotateCcw, Save } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  settingsApi,
  type UpdateSettingsRequest,
} from "@/lib/api/endpoints/settings";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import type { Control } from "react-hook-form";

/**
 * Watches a single field via react-hook-form's control and renders a Switch.
 * Extracted so React Compiler doesn't skip memoizing the parent page.
 */
function SwitchField<T extends Record<string, unknown>>({
  control,
  name,
  onChange,
  label,
}: {
  control: Control<T>;
  name: keyof T;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const value = useWatch({ control, name: name as never }) as unknown as
    | boolean
    | undefined;
  return (
    <Switch
      checked={!!value}
      onCheckedChange={onChange}
      aria-label={label}
    />
  );
}

const schema = z.object({
  brandName: z.string().max(255).optional().or(z.literal("")),
  brandLogoUrl: z.string().max(500).url().optional().or(z.literal("")),
  primaryTimezone: z.string().max(50).optional().or(z.literal("")),
  primaryLanguage: z.string().min(2).max(10).optional().or(z.literal("")),
  passwordMinLength: z.coerce.number().int().min(8).max(128),
  passwordRequireUppercase: z.boolean(),
  passwordRequireLowercase: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSpecialChars: z.boolean(),
  maxSessionDurationMinutes: z.coerce.number().int().min(5).max(43200),
});

type Values = {
  brandName?: string;
  brandLogoUrl?: string;
  primaryTimezone?: string;
  primaryLanguage?: string;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  maxSessionDurationMinutes: number;
};

export default function OrganizationSettingsPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings", orgId],
    queryFn: () => settingsApi.get(orgId!),
    enabled: !!orgId,
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({
    // Zod v4 output type widens numeric coercion — cast to satisfy RHF.
    resolver: zodResolver(schema) as unknown as import("react-hook-form").Resolver<Values>,
    defaultValues: {
      brandName: "",
      brandLogoUrl: "",
      primaryTimezone: "",
      primaryLanguage: "en",
      passwordMinLength: 12,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: false,
      maxSessionDurationMinutes: 43200,
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset({
        brandName: settingsQuery.data.brandName ?? "",
        brandLogoUrl: settingsQuery.data.brandLogoUrl ?? "",
        primaryTimezone: settingsQuery.data.primaryTimezone ?? "",
        primaryLanguage: settingsQuery.data.primaryLanguage ?? "en",
        passwordMinLength: settingsQuery.data.passwordMinLength,
        passwordRequireUppercase: settingsQuery.data.passwordRequireUppercase,
        passwordRequireLowercase: settingsQuery.data.passwordRequireLowercase,
        passwordRequireNumbers: settingsQuery.data.passwordRequireNumbers,
        passwordRequireSpecialChars:
          settingsQuery.data.passwordRequireSpecialChars,
        maxSessionDurationMinutes:
          settingsQuery.data.maxSessionDurationMinutes,
      });
    }
  }, [settingsQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: Values) => {
      const payload: UpdateSettingsRequest = {
        ...values,
        brandName: values.brandName || undefined,
        brandLogoUrl: values.brandLogoUrl || undefined,
        primaryTimezone: values.primaryTimezone || undefined,
        primaryLanguage: values.primaryLanguage || undefined,
      };
      return settingsApi.update(orgId!, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", orgId] });
      toast.success("Settings saved");
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  const resetMutation = useMutation({
    mutationFn: () => settingsApi.reset(orgId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", orgId] });
      toast.success("Settings reset to defaults");
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  if (!orgId) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Organization Settings"
          description="Branding, timezone, locale, session lifespan, and password policy."
        />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to configure its settings.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Organization Settings"
        description="Branding, timezone, locale, session lifespan, and password policy."
        actions={
          <Button
            variant="outline"
            onClick={() => resetMutation.mutate()}
            loading={resetMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset defaults
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit((v) => updateMutation.mutate(v))}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Displayed on login pages and emails to your users.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {settingsQuery.isLoading ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : (
              <>
                <Field>
                  <Label htmlFor="brandName">Brand name</Label>
                  <Input id="brandName" {...register("brandName")} />
                  <FieldError message={errors.brandName?.message} />
                </Field>
                <Field>
                  <Label htmlFor="brandLogoUrl">Brand logo URL</Label>
                  <Input
                    id="brandLogoUrl"
                    placeholder="https://cdn.example.com/logo.svg"
                    {...register("brandLogoUrl")}
                  />
                  <FieldError message={errors.brandLogoUrl?.message} />
                </Field>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localization</CardTitle>
            <CardDescription>
              Default timezone and display language for new users.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="primaryTimezone">Primary timezone</Label>
              <Input
                id="primaryTimezone"
                placeholder="America/New_York"
                {...register("primaryTimezone")}
              />
              <FieldHint>IANA time zone (e.g. Europe/London)</FieldHint>
            </Field>
            <Field>
              <Label htmlFor="primaryLanguage">Primary language</Label>
              <Input
                id="primaryLanguage"
                placeholder="en"
                {...register("primaryLanguage")}
              />
              <FieldHint>ISO 639-1 code (e.g. en, es, fr, de)</FieldHint>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password policy</CardTitle>
            <CardDescription>
              Enforced on registration and password change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <Label htmlFor="passwordMinLength">Minimum length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                min={8}
                max={128}
                {...register("passwordMinLength")}
              />
              <FieldError message={errors.passwordMinLength?.message} />
            </Field>

            {[
              {
                key: "passwordRequireUppercase",
                label: "Require uppercase letters",
              },
              {
                key: "passwordRequireLowercase",
                label: "Require lowercase letters",
              },
              {
                key: "passwordRequireNumbers",
                label: "Require numbers",
              },
              {
                key: "passwordRequireSpecialChars",
                label: "Require special characters",
              },
            ].map((cfg) => (
              <div
                key={cfg.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {cfg.label}
                </span>
                <SwitchField
                  control={control}
                  name={cfg.key as keyof Values}
                  onChange={(v) =>
                    setValue(cfg.key as keyof Values, v as never, {
                      shouldDirty: true,
                    })
                  }
                  label={cfg.label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Maximum lifespan of an authenticated browser session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <Label htmlFor="maxSessionDurationMinutes">
                Session duration (minutes)
              </Label>
              <Input
                id="maxSessionDurationMinutes"
                type="number"
                min={5}
                max={43200}
                {...register("maxSessionDurationMinutes")}
              />
              <FieldHint>
                Between 5 minutes and 30 days (43,200 minutes).
              </FieldHint>
              <FieldError
                message={errors.maxSessionDurationMinutes?.message}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <span className="mr-auto text-xs text-slate-500 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            Applies organization-wide
          </span>
          <Button
            type="submit"
            loading={updateMutation.isPending}
            disabled={!isDirty}
          >
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
