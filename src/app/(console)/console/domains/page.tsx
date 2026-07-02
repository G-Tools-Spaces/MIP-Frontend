"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Globe, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  domainsApi,
  type CustomDomain,
  type DomainStatus,
} from "@/lib/api/endpoints/domains";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime } from "@/lib/format";

const schema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      "Enter a valid FQDN (e.g. auth.acme.com)",
    ),
});
type Values = z.infer<typeof schema>;

const statusTone: Record<
  DomainStatus,
  Parameters<typeof Badge>[0]["tone"]
> = {
  PENDING: "amber",
  VERIFIED: "emerald",
  FAILED: "red",
};

export default function DomainsPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const domainsQuery = useQuery({
    queryKey: ["domains", orgId],
    queryFn: () => domainsApi.list(orgId!),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (v: Values) => domainsApi.create(orgId!, v.domain),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains", orgId] });
      toast.success("Domain added — start DNS verification");
      setOpen(false);
      reset();
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => domainsApi.verify(orgId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains", orgId] });
      toast.success("Verification triggered");
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => domainsApi.delete(orgId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains", orgId] });
      toast.success("Domain removed");
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  if (!orgId) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Custom Domains" description="Bind your own domains." />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to manage domains.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Custom Domains"
        description="Bind your own domains for enterprise identity federation."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add domain
          </Button>
        }
      />

      {domainsQuery.isLoading && <Skeleton className="h-40 w-full" />}

      {domainsQuery.data && domainsQuery.data.length === 0 && (
        <EmptyState
          icon={Globe}
          title="No custom domains"
          description="Add your first domain and verify it via a DNS TXT record."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add domain
            </Button>
          }
        />
      )}

      <div className="space-y-4">
        {domainsQuery.data?.map((d: CustomDomain) => (
          <Card key={d.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-slate-400" />
                  {d.domain}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Added {dateTime(d.createdAt)}
                </p>
              </div>
              <Badge tone={statusTone[d.status]}>
                {d.status === "VERIFIED" && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {d.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {d.status !== "VERIFIED" && d.verificationToken && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Add this DNS TXT record to verify ownership
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Host</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        _meicrypt-verify.{d.domain}
                      </span>
                      <CopyButton
                        value={`_meicrypt-verify.${d.domain}`}
                        label="Copy"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Value</span>
                      <span className="text-slate-900 dark:text-slate-100 truncate">
                        {d.verificationToken}
                      </span>
                      <CopyButton value={d.verificationToken} label="Copy" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                {d.status !== "VERIFIED" && (
                  <Button
                    onClick={() => verifyMutation.mutate(d.id)}
                    loading={verifyMutation.isPending}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify now
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(d.id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add custom domain"
        description="Enter the fully-qualified domain your users should visit."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              form="add-domain-form"
              type="submit"
              loading={createMutation.isPending}
            >
              Add domain
            </Button>
          </>
        }
      >
        <form
          id="add-domain-form"
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
        >
          <Field>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="auth.acme.com"
              invalid={!!errors.domain}
              {...register("domain")}
            />
            <FieldError message={errors.domain?.message} />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
