"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Plus } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applicationsApi,
  type ApplicationStatus,
  type ApplicationType,
  type ClientApplication,
  type ClientApplicationCredentials,
} from "@/lib/api/endpoints/applications";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime, relativeTime } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  type: z.enum(["WEB", "SPA", "MOBILE", "SERVICE", "NATIVE"]),
  isPublic: z.boolean().default(false),
  redirectUris: z.string().default(""),
  logoutUris: z.string().default(""),
});
type Values = {
  name: string;
  description?: string;
  type: "WEB" | "SPA" | "MOBILE" | "SERVICE" | "NATIVE";
  isPublic: boolean;
  redirectUris: string;
  logoutUris: string;
};

const statusTone: Record<
  ApplicationStatus,
  Parameters<typeof Badge>[0]["tone"]
> = {
  ACTIVE: "emerald",
  SUSPENDED: "amber",
  REVOKED: "red",
};

const typeTone: Record<ApplicationType, Parameters<typeof Badge>[0]["tone"]> = {
  WEB: "indigo",
  SPA: "violet",
  MOBILE: "sky",
  SERVICE: "neutral",
  NATIVE: "sky",
};

export default function ApplicationsPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] =
    useState<ClientApplicationCredentials | null>(null);

  const appsQuery = useQuery({
    queryKey: ["applications", orgId],
    queryFn: () => applicationsApi.list(orgId!),
    enabled: !!orgId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema) as unknown as import("react-hook-form").Resolver<Values>,
    defaultValues: {
      name: "",
      description: "",
      type: "WEB",
      isPublic: false,
      redirectUris: "",
      logoutUris: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: Values) =>
      applicationsApi.create(orgId!, {
        ...values,
        description: values.description || undefined,
        redirectUris: values.redirectUris
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
        logoutUris: values.logoutUris
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
      }),
    onSuccess: (data) => {
      toast.success("Application registered");
      setCredentials(data.credentials);
      qc.invalidateQueries({ queryKey: ["applications", orgId] });
      setOpen(false);
      reset();
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  if (!orgId) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Applications" description="OAuth2 client registry" />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to register applications.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Applications"
        description="Register the apps that will authenticate against your organization."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Register app
          </Button>
        }
      />

      {appsQuery.isLoading && <Skeleton className="h-40" />}

      {appsQuery.data && appsQuery.data.length === 0 && (
        <EmptyState
          icon={Boxes}
          title="No applications yet"
          description="Register your first OAuth2 client to issue credentials."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Register app
            </Button>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {appsQuery.data?.map((app: ClientApplication) => (
          <Card key={app.id} className="hover:shadow-md transition-shadow">
            <Link
              href={`/console/applications/${app.id}`}
              className="block h-full"
            >
              <CardHeader className="space-y-0">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">
                    {app.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Badge tone={statusTone[app.status]}>{app.status}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                  {app.description ?? "—"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={typeTone[app.type]}>{app.type}</Badge>
                  {app.isPublic && <Badge tone="sky">public</Badge>}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="col-span-2 flex items-center justify-between">
                    <dt>client_id</dt>
                    <dd className="font-mono text-slate-700 dark:text-slate-200 truncate">
                      {app.clientId}
                    </dd>
                  </div>
                  <div>
                    <dt>Redirect URIs</dt>
                    <dd className="text-slate-700 dark:text-slate-200">
                      {app.redirectUris.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd
                      className="text-slate-700 dark:text-slate-200"
                      title={dateTime(app.createdAt)}
                    >
                      {relativeTime(app.createdAt)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Register application"
        description="Configure the OAuth2 client this app will use."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              form="app-form"
              type="submit"
              loading={createMutation.isPending}
            >
              Register
            </Button>
          </>
        }
      >
        <form
          id="app-form"
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Acme CRM"
                invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </Field>
            <Field>
              <Label htmlFor="type">Application type</Label>
              <Select id="type" {...register("type")}>
                <option value="WEB">Web (confidential)</option>
                <option value="SPA">Single-page app (PKCE)</option>
                <option value="MOBILE">Mobile (PKCE)</option>
                <option value="SERVICE">Service (client_credentials)</option>
                <option value="NATIVE">Native app</option>
              </Select>
            </Field>
          </div>

          <Field>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </Field>

          <Field>
            <Label htmlFor="redirectUris">Redirect URIs</Label>
            <Textarea
              id="redirectUris"
              placeholder="https://app.example.com/callback"
              className="font-mono text-xs"
              {...register("redirectUris")}
            />
            <FieldHint>One URI per line — must use HTTPS in production.</FieldHint>
          </Field>

          <Field>
            <Label htmlFor="logoutUris">Post-logout redirect URIs</Label>
            <Textarea
              id="logoutUris"
              placeholder="https://app.example.com/goodbye"
              className="font-mono text-xs"
              {...register("logoutUris")}
            />
            <FieldHint>One URI per line — used by Single Logout.</FieldHint>
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        title="Save these credentials"
        description="The client_secret is only shown once. Store it in a secrets manager."
        footer={
          <Button onClick={() => setCredentials(null)}>Done</Button>
        }
      >
        {credentials && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="text-xs text-slate-500">client_id</div>
              <div className="mt-1 flex items-center justify-between font-mono text-sm">
                <span className="truncate">{credentials.clientId}</span>
                <CopyButton value={credentials.clientId} />
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="text-xs text-amber-700 dark:text-amber-300">
                client_secret (shown once)
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-sm">
                <span className="truncate">{credentials.clientSecret}</span>
                <CopyButton value={credentials.clientSecret} />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
